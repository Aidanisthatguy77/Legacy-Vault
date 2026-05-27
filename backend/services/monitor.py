"""
Website Monitor — continuous background health + anomaly detection.

Runs every MONITOR_INTERVAL seconds:
  - HTTP /api/health
  - MongoDB ping
  - Sample collection reads
  - Diff of supervisor backend/frontend error logs (only NEW lines since last check)

Anomalies become Observation documents in `monitor_observations` collection,
which the admin Monitor UI streams + can route to the Acceleration Agent for auto-fix.
"""
from __future__ import annotations

import asyncio
import hashlib
import os
import re
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from motor.motor_asyncio import AsyncIOMotorClient


MONITOR_INTERVAL = int(os.environ.get("MONITOR_INTERVAL", "60"))
BACKEND_INTERNAL_URL = os.environ.get("BACKEND_INTERNAL_URL", "http://localhost:8001")
BACKEND_ERR_LOG = Path("/var/log/supervisor/backend.err.log")
FRONTEND_ERR_LOG = Path("/var/log/supervisor/frontend.err.log")

# Mongo
_mongo_url = os.environ["MONGO_URL"]
_client = AsyncIOMotorClient(_mongo_url)
_db = _client[os.environ["DB_NAME"]]

# Track log offsets so we only report NEW errors
_log_state: Dict[str, int] = {"backend": 0, "frontend": 0}

# Track which check failures are currently "open" so we don't spam the same observation
_open_alerts: Dict[str, str] = {}  # key -> observation_id

# Background task handle (so server can cancel on shutdown)
_task: Optional[asyncio.Task] = None
_running = False


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _record(
    severity: str,
    source: str,
    title: str,
    detail: str,
    suggested_action: str = "",
    dedupe_key: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Optional[str]:
    """
    Insert an observation. If dedupe_key is supplied, skip if an unresolved obs
    with the same dedupe_key already exists.
    """
    if dedupe_key:
        existing = await _db.monitor_observations.find_one(
            {"dedupe_key": dedupe_key, "status": "open"}, {"_id": 0, "id": 1}
        )
        if existing:
            # Refresh timestamp/touched counter on the existing one
            await _db.monitor_observations.update_one(
                {"id": existing["id"]},
                {"$inc": {"touched": 1}, "$set": {"last_seen": _now()}},
            )
            return existing["id"]

    obs_id = str(uuid.uuid4())
    doc = {
        "id": obs_id,
        "severity": severity,                 # info | warning | critical
        "source": source,                     # health, mongo, logs, endpoint, manual
        "title": title,
        "detail": detail[:4000],
        "suggested_action": suggested_action[:1000],
        "dedupe_key": dedupe_key,
        "metadata": metadata or {},
        "status": "open",                     # open | dismissed | fixed
        "touched": 1,
        "created_at": _now(),
        "last_seen": _now(),
    }
    await _db.monitor_observations.insert_one(doc)
    return obs_id


async def _clear_alert(dedupe_key: str) -> None:
    """If a previously-open alert is now resolved, mark it fixed and emit an info note."""
    res = await _db.monitor_observations.update_many(
        {"dedupe_key": dedupe_key, "status": "open"},
        {"$set": {"status": "fixed", "resolved_at": _now()}},
    )
    if res.modified_count:
        await _record(
            severity="info",
            source="auto-resolve",
            title=f"Recovered: {dedupe_key}",
            detail="Previously-open alert resolved automatically.",
            dedupe_key=None,
        )


# ============ CHECKS ============

async def _check_health() -> None:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{BACKEND_INTERNAL_URL}/api/health")
        if r.status_code != 200:
            await _record(
                "critical", "health",
                f"Backend /api/health returned {r.status_code}",
                r.text[:1500],
                "Run the Acceleration Agent: `tail -n 100 /var/log/supervisor/backend.err.log` and resolve.",
                dedupe_key="health-status",
            )
            return
        data = r.json()
        if data.get("status") not in ("ok", "healthy"):
            await _record(
                "warning", "health",
                "Backend health reported degraded",
                str(data)[:1500],
                "Inspect the failing subsystem reported in detail.",
                dedupe_key="health-degraded",
            )
        else:
            await _clear_alert("health-status")
            await _clear_alert("health-degraded")
    except Exception as e:
        await _record(
            "critical", "health",
            "Backend unreachable from monitor",
            str(e)[:1500],
            "Check supervisor: `sudo supervisorctl status backend` and tail the err log.",
            dedupe_key="health-unreachable",
        )


async def _check_mongo() -> None:
    try:
        await _client.admin.command("ping")
        await _clear_alert("mongo-unreachable")
    except Exception as e:
        await _record(
            "critical", "mongo",
            "MongoDB ping failed",
            str(e)[:1500],
            "Check MONGO_URL env var and mongod status.",
            dedupe_key="mongo-unreachable",
        )


async def _check_sample_endpoints() -> None:
    paths = ["/api/games", "/api/health/pulse", "/api/content"]
    async with httpx.AsyncClient(timeout=6.0) as client:
        for path in paths:
            try:
                r = await client.get(f"{BACKEND_INTERNAL_URL}{path}")
                if r.status_code >= 500:
                    await _record(
                        "warning", "endpoint",
                        f"{path} returned {r.status_code}",
                        r.text[:1500],
                        "Curl the endpoint and check backend logs.",
                        dedupe_key=f"endpoint-{path}",
                    )
                else:
                    await _clear_alert(f"endpoint-{path}")
            except Exception as e:
                await _record(
                    "warning", "endpoint",
                    f"{path} request failed",
                    str(e)[:1500],
                    "",
                    dedupe_key=f"endpoint-{path}",
                )


_ERROR_LINE_RE = re.compile(r"\b(ERROR|CRITICAL|Exception|Traceback)\b", re.IGNORECASE)


def _hash(s: str) -> str:
    return hashlib.sha1(s.encode("utf-8", errors="replace")).hexdigest()[:12]


async def _check_log(log_path: Path, key: str) -> None:
    if not log_path.exists():
        return
    try:
        size = log_path.stat().st_size
        offset = _log_state.get(key, 0)
        if offset > size:
            # log rotated
            offset = 0
        if offset == size:
            return
        with log_path.open("rb") as f:
            f.seek(offset)
            new_bytes = f.read(size - offset)
        _log_state[key] = size
        text = new_bytes.decode("utf-8", errors="replace")
        # Capture error blocks (line containing ERROR/Exception/Traceback, plus a few following lines)
        lines = text.splitlines()
        errors: List[str] = []
        for i, line in enumerate(lines):
            if _ERROR_LINE_RE.search(line):
                block = "\n".join(lines[i:i + 6])[:1200]
                errors.append(block)
        if not errors:
            return
        # Group identical error fingerprints to one observation
        seen: Dict[str, str] = {}
        for err in errors:
            sig = _hash(err.split("\n")[0])
            seen[sig] = err
        for sig, block in seen.items():
            await _record(
                "warning", f"logs:{key}",
                f"New {key} error detected",
                block,
                "Use the Acceleration Agent to inspect and patch — click Run Fix.",
                dedupe_key=f"log-{key}-{sig}",
                metadata={"signature": sig},
            )
    except Exception:
        # never let log scanning crash the loop
        pass


async def _heartbeat() -> None:
    await _db.monitor_heartbeats.update_one(
        {"_id": "monitor"},
        {"$set": {"last_run": _now(), "interval_s": MONITOR_INTERVAL}},
        upsert=True,
    )


# ============ LOOP ============

async def _run_one_cycle() -> None:
    await _check_health()
    await _check_mongo()
    await _check_sample_endpoints()
    await _check_log(BACKEND_ERR_LOG, "backend")
    await _check_log(FRONTEND_ERR_LOG, "frontend")
    await _heartbeat()


async def _loop() -> None:
    global _running
    _running = True
    # Initialise offsets to current end of logs (don't flood with historical errors on first boot)
    for key, path in (("backend", BACKEND_ERR_LOG), ("frontend", FRONTEND_ERR_LOG)):
        if path.exists():
            _log_state[key] = path.stat().st_size
    while _running:
        try:
            await _run_one_cycle()
        except Exception as e:
            # Last-resort: record monitor error but keep looping
            try:
                await _record(
                    "warning", "monitor",
                    "Monitor cycle error",
                    str(e)[:1500],
                    "",
                    dedupe_key="monitor-self",
                )
            except Exception:
                pass
        await asyncio.sleep(MONITOR_INTERVAL)


def start_monitor() -> None:
    """Kick off the background monitor task. Safe to call multiple times."""
    global _task
    if _task and not _task.done():
        return
    loop = asyncio.get_event_loop()
    _task = loop.create_task(_loop())


async def stop_monitor() -> None:
    global _running, _task
    _running = False
    if _task:
        _task.cancel()
        try:
            await _task
        except (asyncio.CancelledError, Exception):
            pass


async def run_now() -> Dict[str, Any]:
    """Manual trigger from API."""
    await _run_one_cycle()
    return {"ran_at": _now(), "interval_s": MONITOR_INTERVAL}
