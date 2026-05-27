# Wealth Tracker Agent

Minimal scaffold for the Wealth Tracker Agent project. Contains a Vite + React frontend and a tiny Express backend that serves sample data and a net worth API.

How to run (local):

1. Install dependencies

```bash
npm install
```

2. Run dev frontend

```bash
npm run dev
```

3. Or start backend server

```bash
npm start
```

MCP Integration
----------------
This scaffold can call free/open-source MCP servers for live data. The backend includes a small MCP client at `backend/mcp/mcpClient.js` and a proxy route `GET /api/agents/stocks?symbol=SYM`.

To use MCP servers you should run the desired MCP server(s) locally (or remote) and set environment variables to their base URLs before starting the backend. Example env vars:

```
MCP_YAHOO_URL=http://localhost:8001
MCP_DUCKDUCKGO_URL=http://localhost:8002
MCP_FETCH_URL=http://localhost:8003
MCP_MEMORY_URL=http://localhost:8004
```

See the MCP registry for server implementations: https://github.com/modelcontextprotocol/servers

The backend will try to call the MCP Yahoo server for stock quotes and fall back to sample data if unavailable.

Run MCP servers locally with Docker Compose
-----------------------------------------
You can start the backend plus lightweight mock MCP servers using `docker-compose`:

```bash
docker-compose up --build
```

This will start:
- Backend: `http://localhost:3000`
- Mock MCP Yahoo: `http://localhost:8001`
- Mock MCP DuckDuckGo: `http://localhost:8002`
- Mock MCP Fetcher: `http://localhost:8003`
- Mock MCP Memory: `http://localhost:8004`

The backend is configured to use these MCP services when the corresponding `MCP_*` env vars are set (see above).

Google Cloud Deployment (outline)
---------------------------------
I can prepare a `cloudbuild.yaml` and Docker build steps to push the backend image to Google Container Registry and deploy to Cloud Run or GKE. Typical steps:

1. Create `gcloud` service account and enable Container Registry / Cloud Run APIs.
2. Add `cloudbuild.yaml` with steps to build and push images and deploy.
3. Update `backend/Dockerfile` (already added) and optionally add Kubernetes manifests for GKE.

If you want I can scaffold the `cloudbuild.yaml` and example `gke-deployment.yaml` next.
