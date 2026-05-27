"""
Acceleration Agent - embedded coding agent for the NBA 2K Legacy Vault admin panel.

Runs a Claude-powered tool-calling loop with full /app filesystem access:
read_file, write_file, edit_file, list_dir, bash, pip_install, yarn_add, restart_service.

Also exposes the Full System Export endpoint (mongodump + source + docker-compose).
"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import re
import json
import uuid
import asyncio
from pathlib import Path
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from emergentintegrations.llm.chat import LlmChat, UserMessage

from utils.exporter import build_full_export
from services import monitor as monitor_service
from services import deployer as deploy_service

router = APIRouter(prefix="/api/admin/acceleration", tags=["acceleration"])

# Mongo handle (independent so module is self-contained)
_mongo_url = os.environ['MONGO_URL']
_client = AsyncIOMotorClient(_mongo_url)
_db = _client[os.environ['DB_NAME']]

ROOT = Path("/app").resolve()
MAX_ITERATIONS = 14
BASH_HARD_TIMEOUT = 90
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'A@070610')

SYSTEM_PROMPT = """You are the Acceleration Agent: an embedded autonomous coding partner inside the NBA 2K Legacy Vault admin panel. Full /app codebase access.

LAYOUT
- /app/backend  FastAPI on 8001 (supervisor, hot-reload). Main: server.py. Routes under /api.
- /app/frontend React+Tailwind on 3000 (supervisor, hot-reload). Use yarn (NEVER npm).
- MongoDB via MONGO_URL. Restart backend after pip install or .env change.

OUTPUT FORMAT
Every turn reply with EXACTLY ONE JSON object, no prose, no fences:
  {"action":"tool","tool":"<name>","args":{...},"thought":"<<=15 words>"}
or when done:
  {"action":"respond","message":"<short summary>"}

TOOLS
- read_file       {"path":"/app/..."}
- write_file      {"path":"/app/...","content":"..."}
- edit_file       {"path":"/app/...","old_str":"...","new_str":"..."}  (old_str must be unique)
- list_dir        {"path":"/app/..."}
- bash            {"command":"...","timeout":30}  # cwd=/app, max 90s
- pip_install     {"package":"name"}
- yarn_add        {"package":"name"}
- restart_service {"service":"backend"|"frontend"}

RULES
1. JSON only. One tool per turn. Keep thought brief.
2. Paths must be inside /app.
3. After changes verify (read back or curl), then respond.
4. Be decisive. Tool results may be truncated; request a smaller slice if needed.
"""


class AgentRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    password: str


def _safe_path(p: str) -> Path:
    if not p:
        raise ValueError("path is required")
    path = Path(p).resolve()
    try:
        path.relative_to(ROOT)
    except ValueError:
        raise ValueError(f"Path must be inside {ROOT}: {p}")
    return path


# ============ TOOLS ============

async def tool_read_file(args: dict) -> dict:
    path = _safe_path(args["path"])
    if not path.exists():
        return {"success": False, "error": f"File not found: {path}"}
    if not path.is_file():
        return {"success": False, "error": f"Not a file: {path}"}
    try:
        content = path.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        return {"success": False, "error": str(e)}
    truncated = False
    if len(content) > 30000:
        content = content[:30000]
        truncated = True
    return {"success": True, "content": content, "truncated": truncated, "size": path.stat().st_size}


async def tool_write_file(args: dict) -> dict:
    path = _safe_path(args["path"])
    content = args.get("content", "")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return {"success": True, "message": f"Wrote {len(content)} bytes to {path}"}


async def tool_edit_file(args: dict) -> dict:
    path = _safe_path(args["path"])
    if not path.exists():
        return {"success": False, "error": "File not found"}
    text = path.read_text(encoding="utf-8")
    old = args["old_str"]
    new = args["new_str"]
    if old not in text:
        return {"success": False, "error": "old_str not found in file"}
    occurrences = text.count(old)
    if occurrences > 1:
        return {"success": False, "error": f"old_str appears {occurrences} times - include more context to make it unique"}
    path.write_text(text.replace(old, new), encoding="utf-8")
    return {"success": True, "message": f"Edited {path} (1 replacement)"}


async def tool_list_dir(args: dict) -> dict:
    path = _safe_path(args["path"])
    if not path.is_dir():
        return {"success": False, "error": "Not a directory"}
    items = []
    for child in sorted(path.iterdir(), key=lambda c: (not c.is_dir(), c.name.lower())):
        prefix = "[DIR] " if child.is_dir() else "      "
        items.append(f"{prefix}{child.name}")
    return {"success": True, "items": items[:300], "count": len(items)}


async def tool_bash(args: dict) -> dict:
    cmd = args.get("command")
    if not cmd:
        return {"success": False, "error": "command required"}
    timeout = min(int(args.get("timeout", 30) or 30), BASH_HARD_TIMEOUT)
    try:
        proc = await asyncio.create_subprocess_shell(
            cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd="/app",
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            try:
                proc.kill()
            except Exception:
                pass
            return {"success": False, "error": f"Command timed out after {timeout}s"}
        out = stdout.decode(errors="replace")
        err = stderr.decode(errors="replace")
        combined = (out + ("\n[stderr]\n" + err if err.strip() else ""))[-9000:]
        return {
            "success": proc.returncode == 0,
            "exit_code": proc.returncode,
            "output": combined,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def tool_pip_install(args: dict) -> dict:
    pkg = args.get("package", "").strip()
    if not pkg or any(c in pkg for c in [";", "&&", "|", "`", "$("]):
        return {"success": False, "error": "Invalid package name"}
    return await tool_bash({"command": f"pip install {pkg}", "timeout": 90})


async def tool_yarn_add(args: dict) -> dict:
    pkg = args.get("package", "").strip()
    if not pkg or any(c in pkg for c in [";", "&&", "|", "`", "$("]):
        return {"success": False, "error": "Invalid package name"}
    return await tool_bash({"command": f"cd /app/frontend && yarn add {pkg}", "timeout": 90})


async def tool_restart_service(args: dict) -> dict:
    svc = args.get("service")
    if svc not in ("backend", "frontend"):
        return {"success": False, "error": "service must be 'backend' or 'frontend'"}
    return await tool_bash({"command": f"sudo supervisorctl restart {svc}", "timeout": 30})


TOOLS: Dict[str, Any] = {
    "read_file": tool_read_file,
    "write_file": tool_write_file,
    "edit_file": tool_edit_file,
    "list_dir": tool_list_dir,
    "bash": tool_bash,
    "pip_install": tool_pip_install,
    "yarn_add": tool_yarn_add,
    "restart_service": tool_restart_service,
}


# ============ PARSER ============

def _parse_action(text: str) -> Optional[dict]:
    """Extract first valid JSON action object from LLM output."""
    if not text:
        return None
    cleaned = text.strip()
    # Strip ``` fences if present
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    cleaned = cleaned.strip()

    decoder = json.JSONDecoder()
    # Try whole string first
    try:
        return decoder.decode(cleaned)
    except json.JSONDecodeError:
        pass
    # Scan for first { ... } that decodes
    for i, ch in enumerate(cleaned):
        if ch == "{":
            try:
                obj, _ = decoder.raw_decode(cleaned[i:])
                if isinstance(obj, dict) and "action" in obj:
                    return obj
            except json.JSONDecodeError:
                continue
    return None


# ============ ENDPOINTS ============

@router.post("/agent")
async def acceleration_agent(req: AgentRequest):
    if req.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Forbidden")

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")

    session_id = req.session_id or str(uuid.uuid4())
    session = await _db.acceleration_agent_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        session = {
            "id": session_id,
            "title": req.message[:80],
            "messages": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

    chat = LlmChat(
        api_key=api_key,
        session_id=f"acc-agent-{session_id}",
        system_message=SYSTEM_PROMPT,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    # Compose user turn with prior context (token-frugal: 3 short msgs)
    history_blob = ""
    if session["messages"]:
        history_blob = "PRIOR (oldest→newest):\n"
        for m in session["messages"][-3:]:
            role = m.get("role", "user").upper()
            content = (m.get("content") or "")[:280]
            history_blob += f"[{role}] {content}\n"
        history_blob += "---\n"

    user_text = f"{history_blob}USER:\n{req.message}\n\nReply with ONE JSON action."

    steps: List[dict] = []
    final_response = ""
    completed = False

    for iteration in range(MAX_ITERATIONS):
        try:
            llm_out = await chat.send_message(UserMessage(text=user_text))
        except Exception as e:
            final_response = f"LLM error: {str(e)}"
            break

        action = _parse_action(llm_out)
        if not action:
            # Fallback: treat raw text as final response
            final_response = llm_out.strip()
            break

        kind = action.get("action")
        if kind == "respond":
            final_response = action.get("message", "Done.")
            completed = True
            break

        if kind == "tool":
            tool_name = action.get("tool", "")
            tool_args = action.get("args", {}) or {}
            thought = action.get("thought", "")

            if tool_name not in TOOLS:
                err_msg = f"Unknown tool '{tool_name}'. Available: {list(TOOLS.keys())}"
                steps.append({
                    "tool": tool_name, "args": tool_args, "thought": thought,
                    "result": err_msg, "success": False,
                })
                user_text = f"TOOL ERROR: {err_msg}\nRespond with a valid JSON action."
                continue

            try:
                result = await TOOLS[tool_name](tool_args)
            except Exception as e:
                result = {"success": False, "error": str(e)}

            steps.append({
                "tool": tool_name,
                "args": tool_args,
                "thought": thought,
                "result": json.dumps(result)[:2500],
                "success": bool(result.get("success", False)),
            })

            # Smaller payload back to the LLM = fewer tokens. Trim noisy fields.
            slim_result = result
            if isinstance(result, dict) and "output" in result and isinstance(result["output"], str):
                slim_result = {**result, "output": result["output"][-1800:]}
            elif isinstance(result, dict) and "content" in result and isinstance(result["content"], str):
                slim_result = {**result, "content": result["content"][:2500]}
            user_text = (
                f"TOOL RESULT [{tool_name}]:\n{json.dumps(slim_result)[:2800]}\n\n"
                "Next JSON action."
            )
            continue

        # Unknown action shape
        final_response = llm_out.strip()
        break
    else:
        if not final_response:
            final_response = (
                "Reached max iterations without completing the task. "
                "Try splitting the request into smaller steps."
            )

    # Persist session
    session["messages"].append({"role": "user", "content": req.message, "ts": datetime.now(timezone.utc).isoformat()})
    session["messages"].append({
        "role": "assistant",
        "content": final_response,
        "steps": steps,
        "completed": completed,
        "ts": datetime.now(timezone.utc).isoformat(),
    })
    session["updated_at"] = datetime.now(timezone.utc).isoformat()
    await _db.acceleration_agent_sessions.replace_one({"id": session_id}, session, upsert=True)

    return {
        "session_id": session_id,
        "response": final_response,
        "steps": steps,
        "completed": completed,
    }


@router.get("/sessions")
async def list_sessions():
    sessions = await _db.acceleration_agent_sessions.find(
        {}, {"_id": 0, "messages": 0}
    ).sort("updated_at", -1).to_list(50)
    return sessions


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    s = await _db.acceleration_agent_sessions.find_one({"id": session_id}, {"_id": 0})
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return s


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    await _db.acceleration_agent_sessions.delete_one({"id": session_id})
    return {"deleted": True}


@router.post("/sessions/{session_id}/reset")
async def reset_session(session_id: str):
    await _db.acceleration_agent_sessions.update_one(
        {"id": session_id}, {"$set": {"messages": [], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"reset": True}


# ============ VAULT AI HISTORY (read-only mirror inside admin) ============

@router.get("/vault-sessions")
async def list_vault_sessions(password: str = Query(...)):
    """List Vault AI chat sessions for the admin history panel."""
    if password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Forbidden")
    pipeline = [
        {"$group": {
            "_id": "$session_id",
            "last_message": {"$last": "$content"},
            "last_timestamp": {"$last": "$timestamp"},
            "message_count": {"$sum": 1},
            "models_used": {"$addToSet": "$model_used"},
        }},
        {"$sort": {"last_timestamp": -1}},
        {"$limit": 50},
    ]
    sessions = await _db.vault_chat_history.aggregate(pipeline).to_list(50)
    return sessions


@router.get("/vault-sessions/{session_id}")
async def get_vault_session(session_id: str, password: str = Query(...)):
    """Replay a Vault AI session by id."""
    if password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Forbidden")
    history = await _db.vault_chat_history.find(
        {"session_id": session_id}, {"_id": 0}
    ).sort("timestamp", 1).to_list(500)
    return {"session_id": session_id, "messages": history}


# ============ FULL SYSTEM EXPORT ============

# In-memory cache of recently built exports so the download URL is short-lived but stable.
_EXPORT_CACHE: Dict[str, Dict[str, Any]] = {}


class ExportBuildRequest(BaseModel):
    password: str


@router.post("/export/full")
async def export_full(req: ExportBuildRequest):
    """
    Build the full system export (source + mongodump + docker-compose).
    Returns metadata + a token that the client uses to GET the zip.
    """
    if req.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        meta = await build_full_export()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {e}")

    token = uuid.uuid4().hex
    _EXPORT_CACHE[token] = meta
    # Cap cache size
    if len(_EXPORT_CACHE) > 20:
        oldest = sorted(_EXPORT_CACHE.items(), key=lambda kv: kv[1].get("generated_at", ""))[0][0]
        _EXPORT_CACHE.pop(oldest, None)

    return {**meta, "token": token}


@router.get("/export/download/{token}")
async def export_download(token: str, password: str = Query(...)):
    """Stream a previously built export zip."""
    if password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Forbidden")
    meta = _EXPORT_CACHE.get(token)
    if not meta:
        raise HTTPException(status_code=404, detail="Export not found or expired. Rebuild it.")
    zip_path = Path(meta["zip_path"])
    if not zip_path.exists():
        raise HTTPException(status_code=410, detail="Export zip was cleaned up. Rebuild it.")
    return FileResponse(
        zip_path,
        media_type="application/zip",
        filename=meta["filename"],
    )


# ============ WEBSITE MONITOR ============

class MonitorAction(BaseModel):
    password: str


class MonitorFixRequest(BaseModel):
    password: str
    observation_id: str
    override_instruction: Optional[str] = None


class MonitorApplyLinkRequest(BaseModel):
    password: str
    url: str
    instruction: Optional[str] = None  # optional override / refinement


@router.get("/monitor/status")
async def monitor_status(password: str = Query(...)):
    if password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Forbidden")
    hb = await _db.monitor_heartbeats.find_one({"_id": "monitor"}) or {}
    counts = {}
    for sev in ("info", "warning", "critical"):
        counts[sev] = await _db.monitor_observations.count_documents(
            {"severity": sev, "status": "open"}
        )
    counts["total_open"] = sum(counts.values())
    return {
        "last_run": hb.get("last_run"),
        "interval_s": hb.get("interval_s", monitor_service.MONITOR_INTERVAL),
        "open_counts": counts,
    }


@router.get("/monitor/observations")
async def monitor_observations(
    password: str = Query(...),
    status: str = Query("open"),
    limit: int = Query(50, le=200),
):
    if password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Forbidden")
    query = {} if status == "all" else {"status": status}
    obs = await _db.monitor_observations.find(query, {"_id": 0}).sort("last_seen", -1).to_list(limit)
    return obs


@router.post("/monitor/run-now")
async def monitor_run_now(req: MonitorAction):
    if req.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Forbidden")
    return await monitor_service.run_now()


@router.post("/monitor/observations/{obs_id}/dismiss")
async def monitor_dismiss(obs_id: str, req: MonitorAction):
    if req.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Forbidden")
    res = await _db.monitor_observations.update_one(
        {"id": obs_id}, {"$set": {"status": "dismissed", "resolved_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"dismissed": res.modified_count == 1}


@router.delete("/monitor/observations/clear")
async def monitor_clear(password: str = Query(...), status: str = Query("dismissed")):
    if password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Forbidden")
    if status not in ("dismissed", "fixed", "all"):
        raise HTTPException(status_code=400, detail="invalid status")
    q = {} if status == "all" else {"status": status}
    res = await _db.monitor_observations.delete_many(q)
    return {"deleted": res.deleted_count}


@router.post("/monitor/observations/{obs_id}/fix")
async def monitor_fix(obs_id: str, req: MonitorFixRequest):
    """
    Dispatch an open observation to the Acceleration Agent for autonomous repair.
    Returns the agent's session id + execution trace.
    """
    if req.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Forbidden")
    obs = await _db.monitor_observations.find_one({"id": obs_id}, {"_id": 0})
    if not obs:
        raise HTTPException(status_code=404, detail="Observation not found")

    # Compose a tight, actionable prompt for the agent
    prompt = (
        f"WEBSITE MONITOR ALERT — please investigate and fix.\n"
        f"Severity: {obs['severity']}\n"
        f"Source: {obs['source']}\n"
        f"Title: {obs['title']}\n"
        f"Detail:\n{obs['detail']}\n\n"
        f"Suggested: {obs.get('suggested_action','')}\n"
    )
    if req.override_instruction:
        prompt += f"\nOwner override:\n{req.override_instruction}\n"
    prompt += "\nResolve this, verify the fix, and report back."

    agent_req = AgentRequest(
        message=prompt,
        password=ADMIN_PASSWORD,
        session_id=None,
    )
    agent_result = await acceleration_agent(agent_req)

    # Mark observation as fixed (or in-progress if not completed)
    new_status = "fixed" if agent_result.get("completed") else "in_progress"
    await _db.monitor_observations.update_one(
        {"id": obs_id},
        {"$set": {
            "status": new_status,
            "fix_session_id": agent_result.get("session_id"),
            "fix_response": agent_result.get("response", "")[:2000],
            "fix_step_count": len(agent_result.get("steps", [])),
            "resolved_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    return {"observation_id": obs_id, "new_status": new_status, "agent": agent_result}


@router.post("/monitor/apply-link")
async def monitor_apply_link(req: MonitorApplyLinkRequest):
    """
    Owner pastes a URL (tutorial, video, article, GitHub repo, etc.).
    We fetch its content, distil into agent-ready instructions using the dual engine
    (Claude for media links, Gemini for text), then dispatch to the Acceleration Agent.
    """
    if req.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Forbidden")

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")

    # Fetch the URL using existing scraping helper from server.py
    try:
        from server import fetch_url_content, is_media_link  # noqa: WPS433
        scraped = await fetch_url_content(req.url)
        media = is_media_link(req.url)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch URL: {e}")

    # Pick engine: Claude for media (YT/X/Reddit/etc.), Gemini for general text
    if media:
        distil_model = ("anthropic", "claude-sonnet-4-5-20250929")
        engine_label = "claude"
    else:
        distil_model = ("gemini", "gemini-2.5-flash")
        engine_label = "gemini"

    distil_chat = LlmChat(
        api_key=api_key,
        session_id=f"apply-link-{uuid.uuid4()}",
        system_message=(
            "You convert source material (video transcript, article, repo) into a SHORT, "
            "concrete engineering brief for an autonomous coding agent operating on this "
            "FastAPI + React + MongoDB site. Output 3-8 bullet steps, each starting with a verb. "
            "No fluff, no commentary. If the source is unclear, say so in one line."
        ),
    ).with_model(*distil_model)

    user_override = f"\n\nOwner extra instruction: {req.instruction}" if req.instruction else ""
    distil_input = (
        f"SOURCE URL: {req.url}\n"
        f"SOURCE CONTENT (truncated):\n{scraped[:6000]}\n{user_override}\n\n"
        "Produce the concrete action plan now."
    )
    try:
        plan = await distil_chat.send_message(UserMessage(text=distil_input))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Distillation failed: {e}")

    # Record an observation so this shows in monitor history
    obs_id = await monitor_service._record(
        severity="info",
        source="manual-link",
        title=f"Apply from URL ({engine_label})",
        detail=f"URL: {req.url}\n\nDistilled plan:\n{plan}",
        suggested_action="Dispatched to Acceleration Agent.",
        dedupe_key=None,
        metadata={"url": req.url, "engine": engine_label},
    )

    agent_prompt = (
        f"Implement the following plan, derived from {req.url}:\n\n{plan}\n\n"
        "Make the changes, verify they work, then summarise."
    )
    agent_req = AgentRequest(message=agent_prompt, password=ADMIN_PASSWORD, session_id=None)
    agent_result = await acceleration_agent(agent_req)

    await _db.monitor_observations.update_one(
        {"id": obs_id},
        {"$set": {
            "status": "fixed" if agent_result.get("completed") else "in_progress",
            "fix_session_id": agent_result.get("session_id"),
            "fix_step_count": len(agent_result.get("steps", [])),
            "resolved_at": datetime.now(timezone.utc).isoformat(),
        }},
    )

    return {
        "observation_id": obs_id,
        "engine_used": engine_label,
        "plan": plan,
        "agent": agent_result,
    }

# ============ MULTI-CLOUD DEPLOY ============

DEPLOY_TOKEN_KEYS = [
    "github_pat", "github_repo",
    "vercel_token",
    "render_api_key",
    "atlas_pub_key", "atlas_priv_key", "atlas_org_id",
]


class DeployTokensRequest(BaseModel):
    password: str
    tokens: Dict[str, str]


class DeployRunRequest(BaseModel):
    password: str


async def _load_deploy_tokens() -> Dict[str, str]:
    docs = await _db.secrets_vault.find(
        {"key": {"$in": [f"deploy.{k}" for k in DEPLOY_TOKEN_KEYS]}},
        {"_id": 0, "key": 1, "value": 1},
    ).to_list(50)
    return {d["key"].split("deploy.", 1)[1]: d["value"] for d in docs}


@router.get("/deploy/tokens")
async def deploy_tokens_status(password: str = Query(...)):
    if password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Forbidden")
    saved = await _load_deploy_tokens()
    # Never expose raw values — just which keys are configured + a masked preview
    status = {}
    for k in DEPLOY_TOKEN_KEYS:
        v = saved.get(k, "")
        status[k] = {
            "configured": bool(v),
            "preview": (v[:4] + "…" + v[-2:]) if v and len(v) > 6 else ("***" if v else ""),
        }
    return {"tokens": status, "all_configured": all(status[k]["configured"] for k in DEPLOY_TOKEN_KEYS)}


@router.post("/deploy/tokens")
async def deploy_tokens_save(req: DeployTokensRequest):
    if req.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Forbidden")
    saved = 0
    for k, v in (req.tokens or {}).items():
        if k not in DEPLOY_TOKEN_KEYS:
            continue
        if not isinstance(v, str) or not v.strip():
            continue
        await _db.secrets_vault.update_one(
            {"key": f"deploy.{k}"},
            {"$set": {
                "key": f"deploy.{k}",
                "value": v.strip(),
                "description": f"Deploy token: {k}",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )
        saved += 1
    return {"saved": saved}


@router.post("/deploy/run")
async def deploy_run(req: DeployRunRequest):
    if req.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Forbidden")

    tokens = await _load_deploy_tokens()
    missing = [k for k in DEPLOY_TOKEN_KEYS if not tokens.get(k)]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing deploy tokens: {', '.join(missing)}")

    run_id = str(uuid.uuid4())
    doc = {
        "id": run_id,
        "status": "queued",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "steps": {
            "github_push":   {"title": "Push code to GitHub",                  "status": "pending"},
            "atlas_setup":   {"title": "Provision MongoDB Atlas free cluster", "status": "pending"},
            "atlas_restore": {"title": "Restore data into Atlas",              "status": "pending"},
            "render_deploy": {"title": "Deploy backend on Render",             "status": "pending"},
            "vercel_deploy": {"title": "Deploy frontend on Vercel",            "status": "pending"},
        },
        "tokens_used_keys": list(tokens.keys()),  # not values
        "repo": tokens.get("github_repo"),
    }
    await _db.deploy_runs.insert_one(doc)

    # Fire-and-forget the orchestrator
    asyncio.create_task(deploy_service.run_full_deploy(run_id, tokens))
    return {"run_id": run_id, "status": "queued"}


@router.get("/deploy/runs")
async def deploy_runs_list(password: str = Query(...), limit: int = Query(20, le=100)):
    if password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Forbidden")
    runs = await _db.deploy_runs.find({}, {"_id": 0}).sort("started_at", -1).to_list(limit)
    return runs


@router.get("/deploy/runs/{run_id}")
async def deploy_run_get(run_id: str, password: str = Query(...)):
    if password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Forbidden")
    run = await _db.deploy_runs.find_one({"id": run_id}, {"_id": 0})
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.delete("/deploy/runs/{run_id}")
async def deploy_run_delete(run_id: str, password: str = Query(...)):
    if password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Forbidden")
    await _db.deploy_runs.delete_one({"id": run_id})
    return {"deleted": True}



class PromoteDomainRequest(BaseModel):
    password: str
    domain: str


@router.post("/deploy/runs/{run_id}/domain")
async def deploy_promote_domain(run_id: str, req: PromoteDomainRequest):
    if req.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Forbidden")
    run = await _db.deploy_runs.find_one({"id": run_id}, {"_id": 0})
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    if run.get("status") != "success":
        raise HTTPException(status_code=400, detail="Run must be a successful deploy first")

    vercel_pid = (run.get("steps", {}).get("vercel_deploy") or {}).get("project_id")
    render_sid = (run.get("steps", {}).get("render_deploy") or {}).get("service_id")
    if not vercel_pid or not render_sid:
        raise HTTPException(
            status_code=400,
            detail="Missing Vercel project id or Render service id on this run.",
        )

    tokens = await _load_deploy_tokens()
    if not tokens.get("vercel_token") or not tokens.get("render_api_key"):
        raise HTTPException(status_code=400, detail="Vercel/Render tokens not configured")

    result = await deploy_service.promote_domain(
        domain=req.domain,
        vercel_token=tokens["vercel_token"],
        vercel_project_id=vercel_pid,
        render_api_key=tokens["render_api_key"],
        render_service_id=render_sid,
    )

    # Persist on the run
    await _db.deploy_runs.update_one(
        {"id": run_id},
        {"$set": {
            "custom_domain": req.domain,
            "custom_domain_result": result,
            "custom_domain_attached_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    return result

