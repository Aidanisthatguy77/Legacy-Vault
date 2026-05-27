# NBA 2K Legacy Vault — Full System Export

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
- Generated at: 2026-05-27T20:00:04.827976+00:00
