"""
Multi-cloud deploy orchestrator for NBA 2K Legacy Vault.

Pipeline (single call to run_full_deploy):
  1. github_push    — force-push /app source to user's GitHub repo
  2. atlas_setup    — create project + M0 cluster + DB user + IP whitelist
  3. atlas_restore  — mongorestore the live mongodump into the new cluster
  4. render_deploy  — create FastAPI backend web service from the GitHub repo
  5. vercel_deploy  — create React frontend project linked to the GitHub repo

The whole run is tracked in `deploy_runs` so the admin UI can poll live progress.
"""
from __future__ import annotations

import asyncio
import json
import os
import shutil
import subprocess
import tempfile
import urllib.parse
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from motor.motor_asyncio import AsyncIOMotorClient


# ---------- DB ----------
_mongo_url = os.environ["MONGO_URL"]
_client = AsyncIOMotorClient(_mongo_url)
_db = _client[os.environ["DB_NAME"]]


# ---------- helpers ----------
def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _update_run(run_id: str, **patch) -> None:
    patch["updated_at"] = _now()
    await _db.deploy_runs.update_one({"id": run_id}, {"$set": patch})


async def _set_step(run_id: str, name: str, **patch) -> None:
    patch[f"steps.{name}.updated_at"] = _now()
    await _db.deploy_runs.update_one(
        {"id": run_id},
        {"$set": {f"steps.{name}.{k}": v for k, v in patch.items()}},
    )


async def _start_step(run_id: str, name: str, title: str) -> None:
    await _db.deploy_runs.update_one(
        {"id": run_id},
        {"$set": {
            f"steps.{name}": {
                "title": title,
                "status": "running",
                "started_at": _now(),
                "message": "",
            }
        }},
    )


async def _finish_step(
    run_id: str, name: str, ok: bool, message: str, **extra
) -> None:
    payload = {
        f"steps.{name}.status": "success" if ok else "failed",
        f"steps.{name}.finished_at": _now(),
        f"steps.{name}.message": message[:2000],
    }
    for k, v in extra.items():
        payload[f"steps.{name}.{k}"] = v
    await _db.deploy_runs.update_one({"id": run_id}, {"$set": payload})


# ===================================================================
# STEP 1 — GitHub push
# ===================================================================

async def github_push(
    run_id: str, repo_full_name: str, pat: str, app_root: Path = Path("/app")
) -> Dict[str, Any]:
    """
    Force-push /app contents to the user's existing GitHub repo (default branch=main).
    Uses HTTPS + token-in-URL. Skips node_modules, .git, __pycache__, .env files.
    """
    await _start_step(run_id, "github_push", "Push code to GitHub")
    if "/" not in repo_full_name:
        await _finish_step(run_id, "github_push", False, "repo must be 'owner/name'")
        return {"success": False, "error": "bad repo name"}

    stage = Path(tempfile.mkdtemp(prefix="deploy-gh-"))
    try:
        # Copy /app into stage, excluding heavy/sensitive dirs
        ignore = shutil.ignore_patterns(
            "node_modules", ".git", "__pycache__", ".venv", "venv",
            "build", "dist", ".cache", "*.pyc", "*.log",
            ".env", ".env.local", "uploads",
        )
        # We copy frontend and backend (and root meta files) into the stage at top-level
        (stage / "frontend").mkdir()
        (stage / "backend").mkdir()
        shutil.copytree(app_root / "frontend", stage / "frontend", dirs_exist_ok=True, ignore=ignore)
        shutil.copytree(app_root / "backend", stage / "backend", dirs_exist_ok=True, ignore=ignore)

        # Include the docker assets + README for clean cloud builds
        from utils.exporter import (
            DOCKER_COMPOSE, DOCKERFILE_BACKEND, DOCKERFILE_FRONTEND, README,
        )
        (stage / "docker-compose.yml").write_text(DOCKER_COMPOSE)
        (stage / "Dockerfile.backend").write_text(DOCKERFILE_BACKEND)
        (stage / "Dockerfile.frontend").write_text(DOCKERFILE_FRONTEND)
        (stage / "README.md").write_text(README.format(generated_at=_now()))

        # Render needs backend/Dockerfile, Vercel reads frontend/ root
        (stage / "backend" / "Dockerfile").write_text(DOCKERFILE_BACKEND)
        # render.yaml so Render picks it up automatically
        (stage / "render.yaml").write_text(_RENDER_YAML)
        # vercel.json so Vercel routes correctly
        (stage / "frontend" / "vercel.json").write_text(_VERCEL_JSON)

        # Init git repo, commit, push
        cwd = str(stage)
        env = os.environ.copy()
        env["GIT_AUTHOR_NAME"] = "Vault Deployer"
        env["GIT_AUTHOR_EMAIL"] = "deploy@vault.local"
        env["GIT_COMMITTER_NAME"] = env["GIT_AUTHOR_NAME"]
        env["GIT_COMMITTER_EMAIL"] = env["GIT_AUTHOR_EMAIL"]

        def run(cmd: List[str]) -> subprocess.CompletedProcess:
            return subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True, timeout=120)

        for c in [
            ["git", "init", "-q"],
            ["git", "checkout", "-q", "-b", "main"],
            ["git", "add", "-A"],
            ["git", "commit", "-q", "-m", f"Vault Live Deploy {_now()}"],
        ]:
            r = run(c)
            if r.returncode != 0 and "nothing to commit" not in r.stdout:
                await _finish_step(run_id, "github_push", False, f"{' '.join(c)} failed: {r.stderr[:500]}")
                return {"success": False, "error": r.stderr}

        push_url = f"https://x-access-token:{pat}@github.com/{repo_full_name}.git"
        r = run(["git", "push", "-q", "-f", push_url, "main"])
        if r.returncode != 0:
            await _finish_step(run_id, "github_push", False, f"git push failed: {r.stderr[:600]}")
            return {"success": False, "error": r.stderr}

        repo_url = f"https://github.com/{repo_full_name}"
        await _finish_step(
            run_id, "github_push", True,
            f"Pushed to {repo_url}", url=repo_url,
        )
        return {"success": True, "repo_url": repo_url}
    except Exception as e:
        await _finish_step(run_id, "github_push", False, f"exception: {e}")
        return {"success": False, "error": str(e)}
    finally:
        shutil.rmtree(stage, ignore_errors=True)


# ===================================================================
# STEP 2 — MongoDB Atlas: project + cluster + user + IP whitelist
# ===================================================================

ATLAS_API = "https://cloud.mongodb.com/api/atlas/v1.0"


async def atlas_setup(
    run_id: str,
    pub_key: str,
    priv_key: str,
    org_id: str,
    project_name: str = "nba2k-legacy-vault",
    cluster_name: str = "vault",
    db_name: str = "nba2k_legacy_vault",
) -> Dict[str, Any]:
    """Create Atlas project + free M0 cluster + DB user + 0.0.0.0/0 whitelist. Returns connection URI."""
    await _start_step(run_id, "atlas_setup", "Provision MongoDB Atlas free cluster")
    auth = httpx.DigestAuth(pub_key, priv_key)
    db_user = "vaultadmin"
    db_pass = uuid.uuid4().hex[:20]

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            # --- find or create project ---
            r = await client.get(f"{ATLAS_API}/orgs/{org_id}/groups", auth=auth)
            if r.status_code != 200:
                await _finish_step(run_id, "atlas_setup", False, f"orgs/{org_id}/groups list failed ({r.status_code}): {r.text[:400]}")
                return {"success": False, "error": r.text}
            groups = (r.json() or {}).get("results", [])
            project = next((g for g in groups if g.get("name") == project_name), None)
            if not project:
                r = await client.post(
                    f"{ATLAS_API}/groups",
                    auth=auth,
                    json={"name": project_name, "orgId": org_id},
                )
                if r.status_code >= 400:
                    await _finish_step(run_id, "atlas_setup", False, f"create project failed: {r.text[:400]}")
                    return {"success": False, "error": r.text}
                project = r.json()
            project_id = project["id"]

            # --- whitelist 0.0.0.0/0 ---
            await client.post(
                f"{ATLAS_API}/groups/{project_id}/accessList",
                auth=auth,
                json=[{"cidrBlock": "0.0.0.0/0", "comment": "vault-deploy"}],
            )

            # --- create DB user ---
            await client.post(
                f"{ATLAS_API}/groups/{project_id}/databaseUsers",
                auth=auth,
                json={
                    "databaseName": "admin",
                    "username": db_user,
                    "password": db_pass,
                    "roles": [{"databaseName": db_name, "roleName": "readWrite"},
                              {"databaseName": "admin", "roleName": "atlasAdmin"}],
                },
            )

            # --- find or create M0 cluster ---
            r = await client.get(
                f"{ATLAS_API}/groups/{project_id}/clusters/{cluster_name}",
                auth=auth,
            )
            if r.status_code == 404:
                r = await client.post(
                    f"{ATLAS_API}/groups/{project_id}/clusters",
                    auth=auth,
                    json={
                        "name": cluster_name,
                        "providerSettings": {
                            "providerName": "TENANT",
                            "backingProviderName": "AWS",
                            "regionName": "US_EAST_1",
                            "instanceSizeName": "M0",
                        },
                    },
                )
                if r.status_code >= 400:
                    await _finish_step(run_id, "atlas_setup", False, f"create cluster failed: {r.text[:400]}")
                    return {"success": False, "error": r.text}

            # --- poll until cluster is IDLE (up to ~10 minutes) ---
            srv_uri = None
            for i in range(60):
                await _set_step(
                    run_id, "atlas_setup",
                    message=f"Waiting for cluster (poll {i+1}/60)…",
                )
                r = await client.get(
                    f"{ATLAS_API}/groups/{project_id}/clusters/{cluster_name}",
                    auth=auth,
                )
                if r.status_code == 200:
                    body = r.json()
                    state = body.get("stateName")
                    srv_uri = body.get("srvAddress") or body.get("mongoURIWithOptions")
                    if state == "IDLE" and srv_uri:
                        break
                await asyncio.sleep(10)
            if not srv_uri:
                await _finish_step(run_id, "atlas_setup", False, "cluster did not reach IDLE in time")
                return {"success": False, "error": "atlas timeout"}

            # Build SRV connection string with creds
            srv_host = srv_uri.replace("mongodb+srv://", "")
            mongo_uri = (
                f"mongodb+srv://{db_user}:{urllib.parse.quote_plus(db_pass)}"
                f"@{srv_host}/{db_name}?retryWrites=true&w=majority"
            )

            await _finish_step(
                run_id, "atlas_setup", True,
                f"Atlas project + M0 cluster ready ({project_id})",
                url=f"https://cloud.mongodb.com/v2/{project_id}",
                project_id=project_id,
                db_user=db_user,
            )
            return {
                "success": True,
                "project_id": project_id,
                "db_user": db_user,
                "db_password": db_pass,
                "mongo_uri": mongo_uri,
                "db_name": db_name,
            }
    except Exception as e:
        await _finish_step(run_id, "atlas_setup", False, f"exception: {e}")
        return {"success": False, "error": str(e)}


# ===================================================================
# STEP 3 — Restore mongodump into the new Atlas cluster
# ===================================================================

async def atlas_restore(run_id: str, mongo_uri: str, db_name: str) -> Dict[str, Any]:
    await _start_step(run_id, "atlas_restore", "Restore data into Atlas")
    try:
        # Dump live preview DB
        with tempfile.TemporaryDirectory(prefix="atlas-dump-") as tmp:
            dump_dir = Path(tmp) / "dump"
            dump_dir.mkdir()
            r1 = await asyncio.create_subprocess_exec(
                "mongodump",
                f"--uri={os.environ['MONGO_URL']}",
                f"--db={os.environ['DB_NAME']}",
                f"--out={dump_dir}",
                "--quiet",
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
            )
            out, err = await asyncio.wait_for(r1.communicate(), timeout=120)
            if r1.returncode != 0:
                await _finish_step(run_id, "atlas_restore", False, f"mongodump failed: {(err or out).decode()[:400]}")
                return {"success": False, "error": "mongodump failed"}

            # Find the actual dumped db folder (named after source DB_NAME)
            src_db_folder = dump_dir / os.environ["DB_NAME"]
            if not src_db_folder.exists():
                await _finish_step(run_id, "atlas_restore", False, "dump folder missing")
                return {"success": False, "error": "dump missing"}

            r2 = await asyncio.create_subprocess_exec(
                "mongorestore",
                f"--uri={mongo_uri}",
                f"--nsFrom={os.environ['DB_NAME']}.*",
                f"--nsTo={db_name}.*",
                "--drop",
                "--quiet",
                str(dump_dir),
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
            )
            out2, err2 = await asyncio.wait_for(r2.communicate(), timeout=300)
            if r2.returncode != 0:
                await _finish_step(run_id, "atlas_restore", False, f"mongorestore failed: {(err2 or out2).decode()[:400]}")
                return {"success": False, "error": "mongorestore failed"}

        await _finish_step(run_id, "atlas_restore", True, "Data restored into Atlas")
        return {"success": True}
    except Exception as e:
        await _finish_step(run_id, "atlas_restore", False, f"exception: {e}")
        return {"success": False, "error": str(e)}


# ===================================================================
# STEP 4 — Render: backend web service
# ===================================================================

RENDER_API = "https://api.render.com/v1"


async def render_deploy(
    run_id: str,
    api_key: str,
    github_repo_url: str,
    mongo_uri: str,
    db_name: str,
    emergent_llm_key: str,
    admin_password: str,
    service_name: str = "vault-backend",
) -> Dict[str, Any]:
    """Create a free-tier Render web service (Docker) pointing at the backend folder."""
    await _start_step(run_id, "render_deploy", "Deploy backend on Render")
    try:
        async with httpx.AsyncClient(
            timeout=60.0,
            headers={"Authorization": f"Bearer {api_key}", "Accept": "application/json"},
        ) as client:
            # Find owner id
            r = await client.get(f"{RENDER_API}/owners?limit=20")
            if r.status_code != 200:
                await _finish_step(run_id, "render_deploy", False, f"owners list failed: {r.text[:400]}")
                return {"success": False, "error": r.text}
            owners = r.json() or []
            if not owners:
                await _finish_step(run_id, "render_deploy", False, "no Render owner returned")
                return {"success": False, "error": "no owner"}
            owner_id = owners[0]["owner"]["id"]

            env_vars = [
                {"key": "MONGO_URL", "value": mongo_uri},
                {"key": "DB_NAME", "value": db_name},
                {"key": "CORS_ORIGINS", "value": "*"},
                {"key": "EMERGENT_LLM_KEY", "value": emergent_llm_key},
                {"key": "ADMIN_PASSWORD", "value": admin_password},
                {"key": "MONITOR_INTERVAL", "value": "60"},
            ]

            payload = {
                "type": "web_service",
                "name": service_name,
                "ownerId": owner_id,
                "repo": github_repo_url,
                "branch": "main",
                "autoDeploy": "yes",
                "serviceDetails": {
                    "env": "docker",
                    "dockerfilePath": "./backend/Dockerfile",
                    "dockerContext": "./backend",
                    "plan": "free",
                    "envSpecificDetails": {},
                    "envVars": env_vars,
                    "region": "oregon",
                },
            }
            r = await client.post(f"{RENDER_API}/services", json=payload)
            if r.status_code >= 400:
                await _finish_step(run_id, "render_deploy", False, f"create service failed: {r.text[:500]}")
                return {"success": False, "error": r.text}
            svc = r.json().get("service") or r.json()
            svc_id = svc.get("id")
            svc_url = svc.get("serviceDetails", {}).get("url") or f"https://{service_name}.onrender.com"

            # Poll for live
            for i in range(40):
                await _set_step(run_id, "render_deploy", message=f"Building backend (poll {i+1}/40)…")
                r = await client.get(f"{RENDER_API}/services/{svc_id}")
                if r.status_code == 200:
                    body = r.json()
                    deploy = body.get("serviceDetails", {})
                    if deploy.get("url"):
                        svc_url = deploy["url"]
                # Probe the URL
                try:
                    p = await client.get(f"{svc_url}/api/health", timeout=10.0)
                    if p.status_code == 200:
                        break
                except Exception:
                    pass
                await asyncio.sleep(15)

            await _finish_step(
                run_id, "render_deploy", True,
                f"Backend live at {svc_url}",
                url=svc_url, service_id=svc_id,
            )
            return {"success": True, "service_id": svc_id, "backend_url": svc_url}
    except Exception as e:
        await _finish_step(run_id, "render_deploy", False, f"exception: {e}")
        return {"success": False, "error": str(e)}


# ===================================================================
# STEP 5 — Vercel: frontend project + env + deploy
# ===================================================================

VERCEL_API = "https://api.vercel.com"


async def vercel_deploy(
    run_id: str,
    token: str,
    github_owner: str,
    github_repo: str,
    backend_url: str,
    project_name: str = "nba2k-legacy-vault",
) -> Dict[str, Any]:
    """Create / link a Vercel project from the GitHub repo and trigger a deployment."""
    await _start_step(run_id, "vercel_deploy", "Deploy frontend on Vercel")
    try:
        async with httpx.AsyncClient(
            timeout=60.0,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        ) as client:
            # Create (or get) project
            r = await client.post(
                f"{VERCEL_API}/v10/projects",
                json={
                    "name": project_name,
                    "framework": "create-react-app",
                    "rootDirectory": "frontend",
                    "gitRepository": {"type": "github", "repo": f"{github_owner}/{github_repo}"},
                    "environmentVariables": [
                        {"key": "REACT_APP_BACKEND_URL", "value": backend_url,
                         "type": "encrypted", "target": ["production", "preview", "development"]},
                    ],
                },
            )
            if r.status_code == 409:
                # Already exists — just update env var
                r2 = await client.get(f"{VERCEL_API}/v9/projects/{project_name}")
                project = r2.json()
            elif r.status_code >= 400:
                await _finish_step(run_id, "vercel_deploy", False, f"create project failed: {r.text[:500]}")
                return {"success": False, "error": r.text}
            else:
                project = r.json()

            project_id = project.get("id")

            # Upsert env var (idempotent)
            await client.post(
                f"{VERCEL_API}/v10/projects/{project_id}/env",
                json={
                    "key": "REACT_APP_BACKEND_URL",
                    "value": backend_url,
                    "type": "encrypted",
                    "target": ["production", "preview", "development"],
                },
                params={"upsert": "true"},
            )

            # Trigger deployment from GitHub main
            r = await client.post(
                f"{VERCEL_API}/v13/deployments",
                json={
                    "name": project_name,
                    "gitSource": {
                        "type": "github",
                        "repo": f"{github_owner}/{github_repo}",
                        "ref": "main",
                    },
                    "projectSettings": {
                        "framework": "create-react-app",
                        "rootDirectory": "frontend",
                    },
                },
            )
            if r.status_code >= 400:
                await _finish_step(
                    run_id, "vercel_deploy", False,
                    f"deploy trigger failed: {r.text[:500]}. "
                    "If 'github_repo not found' — install the Vercel GitHub app at https://vercel.com/dashboard/integrations and retry.",
                )
                return {"success": False, "error": r.text}
            dep = r.json()
            dep_url = dep.get("url") or dep.get("alias", [""])[0]
            if dep_url and not dep_url.startswith("http"):
                dep_url = f"https://{dep_url}"
            dep_id = dep.get("id") or dep.get("uid")

            # Poll for READY
            final_url = dep_url
            for i in range(40):
                await _set_step(run_id, "vercel_deploy", message=f"Building frontend (poll {i+1}/40)…")
                rs = await client.get(f"{VERCEL_API}/v13/deployments/{dep_id}")
                if rs.status_code == 200:
                    state = rs.json().get("readyState") or rs.json().get("state")
                    if state == "READY":
                        # Prefer the production alias
                        aliases = rs.json().get("alias") or []
                        if aliases:
                            final_url = f"https://{aliases[0]}"
                        break
                    if state in ("ERROR", "CANCELED"):
                        await _finish_step(run_id, "vercel_deploy", False, f"Vercel build {state}")
                        return {"success": False, "error": state}
                await asyncio.sleep(8)

            await _finish_step(
                run_id, "vercel_deploy", True,
                f"Frontend live at {final_url}",
                url=final_url, project_id=project_id,
            )
            return {"success": True, "frontend_url": final_url, "project_id": project_id}
    except Exception as e:
        await _finish_step(run_id, "vercel_deploy", False, f"exception: {e}")
        return {"success": False, "error": str(e)}


# ===================================================================
# FULL PIPELINE
# ===================================================================

async def run_full_deploy(run_id: str, tokens: Dict[str, str]) -> None:
    """Execute the full pipeline. Updates the deploy_runs document as it goes."""
    try:
        await _update_run(run_id, status="running")

        # 1. GitHub
        gh = await github_push(run_id, tokens["github_repo"], tokens["github_pat"])
        if not gh.get("success"):
            await _update_run(run_id, status="failed", failed_at_step="github_push")
            return

        # 2. Atlas
        atlas = await atlas_setup(
            run_id,
            tokens["atlas_pub_key"], tokens["atlas_priv_key"], tokens["atlas_org_id"],
        )
        if not atlas.get("success"):
            await _update_run(run_id, status="failed", failed_at_step="atlas_setup")
            return

        # 3. Atlas restore
        rest = await atlas_restore(run_id, atlas["mongo_uri"], atlas["db_name"])
        if not rest.get("success"):
            # Not fatal — keep going with empty DB
            await _set_step(run_id, "atlas_restore", note="continuing without data restore")

        # 4. Render
        repo_url = gh["repo_url"]
        render = await render_deploy(
            run_id,
            tokens["render_api_key"],
            repo_url,
            atlas["mongo_uri"],
            atlas["db_name"],
            tokens.get("emergent_llm_key") or os.environ.get("EMERGENT_LLM_KEY", ""),
            tokens.get("admin_password") or os.environ.get("ADMIN_PASSWORD", "A@070610"),
        )
        if not render.get("success"):
            await _update_run(run_id, status="failed", failed_at_step="render_deploy")
            return

        # 5. Vercel
        owner, name = tokens["github_repo"].split("/", 1)
        vercel = await vercel_deploy(
            run_id,
            tokens["vercel_token"],
            owner, name,
            render["backend_url"],
        )
        if not vercel.get("success"):
            await _update_run(run_id, status="failed", failed_at_step="vercel_deploy")
            return

        # Done.
        await _update_run(
            run_id,
            status="success",
            finished_at=_now(),
            final_url=vercel["frontend_url"],
            backend_url=render["backend_url"],
            repo_url=repo_url,
            atlas_project_id=atlas["project_id"],
        )
    except Exception as e:
        await _update_run(run_id, status="failed", error=str(e), finished_at=_now())


# ===================================================================
# Inline assets
# ===================================================================

# ===================================================================
# Custom domain promotion
# ===================================================================

async def promote_domain(
    *,
    domain: str,
    vercel_token: str,
    vercel_project_id: str,
    render_api_key: str,
    render_service_id: str,
) -> Dict[str, Any]:
    """
    Attach `domain` (apex) to Vercel frontend + `api.<domain>` to Render backend.
    Returns the exact DNS records the user must create at their registrar.
    """
    domain = domain.strip().lower().rstrip("/")
    if not domain or "." not in domain or domain.startswith("http"):
        return {"success": False, "error": "Provide a bare domain like nba2klegacyvault.com"}

    apex = domain.split("/")[0]
    if apex.startswith("www."):
        apex = apex[4:]
    api_sub = f"api.{apex}"
    www_sub = f"www.{apex}"

    vercel_results = []
    render_result = None
    try:
        # ---- Vercel: attach apex + www ----
        async with httpx.AsyncClient(
            timeout=30.0,
            headers={"Authorization": f"Bearer {vercel_token}", "Content-Type": "application/json"},
        ) as v:
            for name in (apex, www_sub):
                r = await v.post(
                    f"{VERCEL_API}/v10/projects/{vercel_project_id}/domains",
                    json={"name": name},
                )
                ok = r.status_code in (200, 201)
                vercel_results.append({
                    "domain": name,
                    "added": ok,
                    "status_code": r.status_code,
                    "detail": (r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text)
                              if not ok else "added",
                })

        # ---- Render: attach api subdomain ----
        async with httpx.AsyncClient(
            timeout=30.0,
            headers={"Authorization": f"Bearer {render_api_key}", "Accept": "application/json"},
        ) as r_client:
            r = await r_client.post(
                f"{RENDER_API}/services/{render_service_id}/custom-domains",
                json={"name": api_sub},
            )
            ok = r.status_code in (200, 201)
            render_result = {
                "domain": api_sub,
                "added": ok,
                "status_code": r.status_code,
                "detail": (r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text)
                          if not ok else "added",
            }
    except Exception as e:
        return {"success": False, "error": f"provider error: {e}"}

    # DNS records the user needs at their registrar.
    dns_records = [
        {
            "host": "@",
            "type": "A",
            "value": "76.76.21.21",
            "purpose": f"{apex} → Vercel frontend",
        },
        {
            "host": "www",
            "type": "CNAME",
            "value": "cname.vercel-dns.com",
            "purpose": f"{www_sub} → Vercel frontend",
        },
        {
            "host": "api",
            "type": "CNAME",
            "value": "vault-backend.onrender.com",
            "purpose": f"{api_sub} → Render backend",
        },
    ]

    return {
        "success": True,
        "apex": apex,
        "www": www_sub,
        "api": api_sub,
        "vercel": vercel_results,
        "render": render_result,
        "dns_records": dns_records,
        "frontend_url": f"https://{apex}",
        "backend_url": f"https://{api_sub}",
    }



_RENDER_YAML = """services:
  - type: web
    name: vault-backend
    env: docker
    dockerfilePath: ./backend/Dockerfile
    dockerContext: ./backend
    plan: free
    region: oregon
    autoDeploy: true
"""

_VERCEL_JSON = """{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "create-react-app",
  "buildCommand": "yarn build",
  "outputDirectory": "build",
  "installCommand": "yarn install"
}
"""
