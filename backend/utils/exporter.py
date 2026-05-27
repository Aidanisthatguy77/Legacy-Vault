"""
Full System Exporter for NBA 2K Legacy Vault.

Builds a single .zip containing:
  /frontend            - full source (no node_modules, no .env)
  /backend             - full source (no __pycache__, no .env, no uploads/* internal)
  /data
    /mongodb_dump      - mongodump BSON of every collection (production restore)
    /mongodb_json      - human-readable JSON dump of every collection
  docker-compose.yml   - mongo + backend + frontend, single `docker compose up`
  Dockerfile.backend
  Dockerfile.frontend
  .env.example.backend
  .env.example.frontend
  restore_data.sh      - one-liner to mongorestore the dump
  README_FULL_EXPORT.md

Returns the absolute path of the finished .zip plus metadata.
"""
from __future__ import annotations

import asyncio
import json
import os
import shutil
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List
from urllib.parse import urlparse

from motor.motor_asyncio import AsyncIOMotorClient


# ---------- ignore sets ----------
FRONTEND_IGNORE = shutil.ignore_patterns(
    "node_modules", ".git", "build", "dist", ".cache", ".next",
    "coverage", ".DS_Store", "*.log", ".env", ".env.local",
)
BACKEND_IGNORE = shutil.ignore_patterns(
    "__pycache__", ".git", ".venv", "venv", ".pytest_cache",
    "*.pyc", "*.log", ".DS_Store", ".env", "uploads",
)


# ---------- docker / readme assets ----------
DOCKER_COMPOSE = """version: "3.9"
services:
  mongo:
    image: mongo:7
    container_name: vault_mongo
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - vault_mongo_data:/data/db
      - ./data/mongodb_dump:/import:ro
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: ../Dockerfile.backend
    container_name: vault_backend
    restart: unless-stopped
    env_file:
      - .env.backend
    depends_on:
      mongo:
        condition: service_healthy
    ports:
      - "8001:8001"
    volumes:
      - ./backend/uploads:/app/uploads

  frontend:
    build:
      context: ./frontend
      dockerfile: ../Dockerfile.frontend
    container_name: vault_frontend
    restart: unless-stopped
    env_file:
      - .env.frontend
    depends_on:
      - backend
    ports:
      - "3000:3000"

volumes:
  vault_mongo_data:
"""

DOCKERFILE_BACKEND = """FROM python:3.11-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \\
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \\
    build-essential curl ca-certificates && \\
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \\
    pip install --no-cache-dir -r requirements.txt && \\
    pip install --no-cache-dir emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

COPY . .

EXPOSE 8001
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
"""

DOCKERFILE_FRONTEND = """FROM node:20-alpine

WORKDIR /app

COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile || yarn install

COPY . .

EXPOSE 3000
ENV HOST=0.0.0.0 \\
    PORT=3000 \\
    WDS_SOCKET_PORT=0
CMD ["yarn", "start"]
"""

ENV_BACKEND_EXAMPLE = """# Backend env template for Full System Export
MONGO_URL=mongodb://mongo:27017
DB_NAME=nba2k_legacy_vault
CORS_ORIGINS=*
ADMIN_PASSWORD=A@070610

# Emergent LLM key (Claude + Gemini routing).
# Get yours from https://emergent.sh > Profile > Universal Key
EMERGENT_LLM_KEY=
"""

ENV_FRONTEND_EXAMPLE = """# Frontend env template for Full System Export
# Points at the backend container. Change to your public URL for production.
REACT_APP_BACKEND_URL=http://localhost:8001
"""

RESTORE_SH = """#!/usr/bin/env bash
# Restore the bundled MongoDB snapshot into the running mongo container.
set -euo pipefail

DB_NAME="${1:-nba2k_legacy_vault}"
echo "Restoring MongoDB dump into database: $DB_NAME"
docker exec -i vault_mongo mongorestore --drop --nsInclude="${DB_NAME}.*" /import
echo "Done. Collections restored."
"""

README = """# NBA 2K Legacy Vault — Full System Export

This zip is a **complete, standalone snapshot** of the site: source code (frontend + backend),
a full MongoDB dump of every collection, AND the live `EMERGENT_LLM_KEY` baked into `.env.backend`
so the **Dual AI Engine** (Claude for media, Gemini for text), the **Vault Guide**, the
**embedded Acceleration Agent**, the **Website Monitor**, and the **Apply-from-URL** feature
all work zero-config with `docker compose up`.

## What's inside

```
nba2k-vault-full/
├── frontend/                  # React app source (no node_modules)
├── backend/                   # FastAPI source (no live .env, no pycache)
├── data/
│   ├── mongodb_dump/          # mongodump BSON output (use with mongorestore)
│   └── mongodb_json/          # human-readable JSON dump of every collection
├── docker-compose.yml         # mongo + backend + frontend, one command
├── Dockerfile.backend
├── Dockerfile.frontend
├── .env.backend               # LIVE, baked at export time (LLM key included)
├── .env.frontend              # LIVE, points at the bundled backend
├── .env.example.backend       # template, for redeployment to a different host
├── .env.example.frontend
├── restore_data.sh            # one-liner mongorestore helper
└── README_FULL_EXPORT.md
```

## Zero-config quick start

```bash
unzip nba2k-vault-full-*.zip
cd nba2k-vault-full

# 1. Boot the entire stack (no env editing required — keys are baked in)
docker compose up -d --build

# 2. Restore the database (one-time)
chmod +x restore_data.sh && ./restore_data.sh
```

Open:
- Frontend: http://localhost:3000
- Backend:  http://localhost:8001/api/health
- Admin:    http://localhost:3000/admin   (password from `.env.backend`)

## Powered features in this export
- **Dual AI Engine** — `/api/chat` auto-routes media URLs (YouTube/X/Reddit/etc.) to Claude
  and plain text to Gemini, with multi-modal memory in `vault_chat_history`.
- **Vault Guide** — `/api/vault-guide` answers any question about this site's architecture.
- **Acceleration Agent** — embedded coding agent inside `/admin` with full filesystem +
  shell + pip/yarn + service-restart powers.
- **Website Monitor** — background loop watches health, MongoDB, sample endpoints and
  supervisor logs. Alerts surface in `/admin` and can be auto-fixed with one click.
- **Apply-from-URL** — paste any tutorial/video/article into the monitor, the Dual Engine
  distills a plan, the Acceleration Agent executes it.

## Restoring data manually

```bash
# inside the mongo container
docker exec -it vault_mongo bash
mongorestore --drop /import
```

Or from the host:
```bash
mongorestore --uri="mongodb://localhost:27017" --drop --dir data/mongodb_dump
```

## Notes
- `node_modules`, `__pycache__`, `.git`, and the original preview-pod `.env` files are excluded.
- The baked `EMERGENT_LLM_KEY` belongs to the original owner of this export. Treat the zip as a secret.
- Generated at: {generated_at}
"""


# ---------- helpers ----------

def _humanize_bytes(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.1f}{unit}" if unit != "B" else f"{n}{unit}"
        n /= 1024
    return f"{n:.1f}TB"


async def _mongodump(target_dir: Path, mongo_url: str, db_name: str) -> Dict[str, Any]:
    """Run `mongodump` into target_dir. Returns {success, message, size_bytes}."""
    target_dir.mkdir(parents=True, exist_ok=True)
    cmd = [
        "mongodump",
        f"--uri={mongo_url}",
        f"--db={db_name}",
        f"--out={target_dir}",
        "--quiet",
    ]
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
        if proc.returncode != 0:
            return {
                "success": False,
                "message": (stderr.decode() or stdout.decode() or "mongodump failed")[:500],
                "size_bytes": 0,
            }
        total = sum(f.stat().st_size for f in target_dir.rglob("*") if f.is_file())
        return {"success": True, "message": "mongodump complete", "size_bytes": total}
    except FileNotFoundError:
        return {"success": False, "message": "mongodump binary not found on host", "size_bytes": 0}
    except asyncio.TimeoutError:
        return {"success": False, "message": "mongodump timed out after 120s", "size_bytes": 0}
    except Exception as e:
        return {"success": False, "message": f"mongodump error: {e}", "size_bytes": 0}


async def _json_snapshot(target_dir: Path, mongo_url: str, db_name: str) -> Dict[str, Any]:
    """Write JSON dump of every collection (human-readable backup)."""
    target_dir.mkdir(parents=True, exist_ok=True)
    client = AsyncIOMotorClient(mongo_url)
    try:
        db = client[db_name]
        collection_names = await db.list_collection_names()
        total_docs = 0
        per_collection: List[Dict[str, Any]] = []
        for name in sorted(collection_names):
            docs = await db[name].find({}).to_list(length=None)
            # Drop _id (ObjectId is not JSON-serialisable) — JSON dump is for inspection.
            for d in docs:
                d.pop("_id", None)
            (target_dir / f"{name}.json").write_text(
                json.dumps(docs, default=str, indent=2),
                encoding="utf-8",
            )
            per_collection.append({"collection": name, "count": len(docs)})
            total_docs += len(docs)
        return {
            "success": True,
            "collections": per_collection,
            "total_documents": total_docs,
        }
    except Exception as e:
        return {"success": False, "message": str(e), "collections": [], "total_documents": 0}
    finally:
        client.close()


def _zip_directory(src: Path, zip_path: Path) -> Dict[str, Any]:
    """Zip src directory recursively into zip_path. Returns counts and size."""
    file_count = 0
    total_bytes = 0
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for f in src.rglob("*"):
            if f.is_file():
                arc = f.relative_to(src.parent)
                zf.write(f, arc)
                file_count += 1
                total_bytes += f.stat().st_size
    return {
        "file_count": file_count,
        "uncompressed_bytes": total_bytes,
        "zip_bytes": zip_path.stat().st_size,
    }


# ---------- main entry ----------

async def build_full_export(
    app_root: Path = Path("/app"),
    out_dir: Path = Path("/tmp"),
) -> Dict[str, Any]:
    """
    Build the full system export zip. Returns a metadata dict including:
      zip_path, zip_size, file_count, mongodump, json_snapshot, generated_at
    """
    generated_at = datetime.now(timezone.utc).isoformat()
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]

    stage = Path(tempfile.mkdtemp(prefix="vault-export-"))
    try:
        root = stage / "nba2k-vault-full"
        root.mkdir()

        # 1. Copy frontend
        fe_src = app_root / "frontend"
        if fe_src.exists():
            shutil.copytree(fe_src, root / "frontend", ignore=FRONTEND_IGNORE)

        # 2. Copy backend
        be_src = app_root / "backend"
        if be_src.exists():
            shutil.copytree(be_src, root / "backend", ignore=BACKEND_IGNORE)
            # ensure an uploads/ placeholder exists in the export
            (root / "backend" / "uploads").mkdir(exist_ok=True)
            (root / "backend" / "uploads" / ".gitkeep").write_text("")

        # 3. mongodump (BSON, production restore)
        data_dir = root / "data"
        dump_result = await _mongodump(data_dir / "mongodb_dump", mongo_url, db_name)

        # 4. JSON snapshot (human-readable)
        json_result = await _json_snapshot(data_dir / "mongodb_json", mongo_url, db_name)

        # 5. Static assets (docker-compose, dockerfiles, env, restore script, readme)
        (root / "docker-compose.yml").write_text(DOCKER_COMPOSE, encoding="utf-8")
        (root / "Dockerfile.backend").write_text(DOCKERFILE_BACKEND, encoding="utf-8")
        (root / "Dockerfile.frontend").write_text(DOCKERFILE_FRONTEND, encoding="utf-8")
        (root / ".env.example.backend").write_text(ENV_BACKEND_EXAMPLE, encoding="utf-8")
        (root / ".env.example.frontend").write_text(ENV_FRONTEND_EXAMPLE, encoding="utf-8")

        # Bake LIVE working .env files so `docker compose up` boots with no manual setup.
        # The owner explicitly asked for this — the exported package is for them.
        live_llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
        live_admin_pwd = os.environ.get("ADMIN_PASSWORD", "A@070610")
        live_env_backend = (
            "# AUTOGENERATED .env.backend — baked at export time so the stack boots zero-config.\n"
            "# Includes a working EMERGENT_LLM_KEY which powers the Dual Engine (Claude media + Gemini text),\n"
            "# the Vault Guide, the embedded Acceleration Agent, the Website Monitor, and Apply-from-URL.\n"
            f"MONGO_URL=mongodb://mongo:27017\n"
            f"DB_NAME={db_name}\n"
            f"CORS_ORIGINS=*\n"
            f"ADMIN_PASSWORD={live_admin_pwd}\n"
            f"EMERGENT_LLM_KEY={live_llm_key}\n"
            f"MONITOR_INTERVAL=60\n"
        )
        (root / ".env.backend").write_text(live_env_backend, encoding="utf-8")
        (root / ".env.frontend").write_text(
            "# AUTOGENERATED .env.frontend — points at the bundled backend container.\n"
            "REACT_APP_BACKEND_URL=http://localhost:8001\n",
            encoding="utf-8",
        )

        (root / "restore_data.sh").write_text(RESTORE_SH, encoding="utf-8")
        os.chmod(root / "restore_data.sh", 0o755)
        (root / "README_FULL_EXPORT.md").write_text(
            README.format(generated_at=generated_at),
            encoding="utf-8",
        )

        # 6. Write a manifest with what was actually included
        manifest = {
            "generated_at": generated_at,
            "source": str(app_root),
            "db_name": db_name,
            "mongodump": dump_result,
            "json_snapshot": {
                "success": json_result.get("success"),
                "collections": json_result.get("collections", []),
                "total_documents": json_result.get("total_documents", 0),
            },
        }
        (root / "data" / "MANIFEST.json").write_text(
            json.dumps(manifest, indent=2),
            encoding="utf-8",
        )

        # 7. Zip everything
        out_dir.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        zip_path = out_dir / f"nba2k-vault-full-{stamp}.zip"
        zip_meta = _zip_directory(root, zip_path)

        return {
            "success": True,
            "zip_path": str(zip_path),
            "zip_size": zip_meta["zip_bytes"],
            "zip_size_human": _humanize_bytes(zip_meta["zip_bytes"]),
            "uncompressed_size": zip_meta["uncompressed_bytes"],
            "uncompressed_size_human": _humanize_bytes(zip_meta["uncompressed_bytes"]),
            "file_count": zip_meta["file_count"],
            "mongodump": dump_result,
            "json_snapshot": {
                "success": json_result.get("success"),
                "collections": json_result.get("collections", []),
                "total_documents": json_result.get("total_documents", 0),
            },
            "generated_at": generated_at,
            "filename": zip_path.name,
        }
    finally:
        # We keep the stage dir contents available via the zip already, so clean up the working tree.
        try:
            shutil.rmtree(stage, ignore_errors=True)
        except Exception:
            pass
