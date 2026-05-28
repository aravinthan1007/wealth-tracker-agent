# WealthTrack Agent

> An AI-powered personal finance agent that **reasons** about your wealth — built with Google Gemini, a ReAct reasoning loop, and MCP-connected observability via Arize.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**Hackathon:** [Google Cloud Rapid Agent Hackathon](https://googlecloudmultiagent.devpost.com/)
**Track:** Arize — AI Observability
**Live Demo:** *(link after deployment)*

---

## What It Does

WealthTrack Agent is a full-stack wealth management platform where a **ReAct reasoning agent** (Thought ? Action ? Observation loop) answers complex financial questions by calling real-data tools:

- **"Am I on track to retire in 20 years?"** ? agent reasons through net worth, income, expenses
- **"Which of my stocks are underperforming?"** ? pulls live Yahoo Finance quotes, compares against holdings
- **"What is the market saying about my portfolio?"** ? searches the web in real time via DuckDuckGo
- **"Summarize last months expenses"** ? reads transaction history, categorizes spend

Every reasoning step is **traced and observable** in Arize Phoenix — so you can see *exactly why* the AI gave you that financial answer.

---

## Architecture

```
Browser (React 18 + Vite)
    |
    v
Express Backend (Node.js)
    |-- ReAct Agent Loop (Gemini 2.0 Flash)
    |       Thought -> Action -> Observation (up to 10 steps)
    |
    +-- MCP Tool Layer
            |-- Yahoo Finance MCP  (port 8001) -- live stock quotes
            |-- DuckDuckGo MCP     (port 8002) -- real-time web search
            |-- URL Fetcher MCP    (port 8003) -- fetch any URL for context
            +-- Memory MCP         (port 8004) -- persistent agent memory

Arize Phoenix -- traces every LLM call + tool invocation
```

---

## Agent Tools (11 total)

| Tool | Source | Description |
|------|--------|-------------|
| `get_networth` | Local data | Net worth breakdown: assets, liabilities |
| `get_stock_quotes` | Yahoo Finance v8 | Live stock prices for portfolio holdings |
| `get_expenses` | Local data | Monthly expense analysis by category |
| `get_credit_cards` | Local data | Credit card balances and APRs |
| `get_income` | Local data | Income streams (salary, dividends, etc.) |
| `get_profile` | Local data | User financial profile |
| `search_web` | DuckDuckGo MCP | Real-time market news and research |
| `fetch_url` | Fetcher MCP | Retrieve content from any financial URL |
| `calculate` | Built-in | Safe arithmetic evaluation |
| `remember` | Memory MCP | Persist facts across sessions |
| `recall` | Memory MCP | Retrieve previously stored facts |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, Recharts |
| Backend | Express 4 (Node.js, CommonJS) |
| AI | **Google Gemini 2.0 Flash** (via `@google/generative-ai`) |
| Agent Pattern | ReAct (Reasoning + Acting loop) |
| MCP Servers | Docker Compose -- 4 microservices |
| AI Observability | **Arize Phoenix** -- traces every LLM + tool call |
| Hosting | Google Cloud Run |

---

## Quick Start

### Prerequisites
- Node.js 18+
- Docker + Docker Compose
- Google Cloud account with Gemini API access

### 1. Clone and install
```bash
git clone https://github.com/aravinthan1007/wealth-tracker-agent.git
cd wealth-tracker-agent
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env -- add GEMINI_API_KEY
```

### 3. Start MCP services
```bash
docker compose up -d
```

### 4. Start backend + frontend
```bash
npm run start     # backend on :3000
npm run dev       # frontend on :5173
```

Open http://localhost:5173

---

## Project Structure

```
|-- backend/
|   |-- api/
|   |   |-- reactAgentRoutes.js   # ReAct loop -- Gemini + 11 tools
|   |   |-- agentRoutes.js        # REST endpoints for financial data
|   |   +-- searchProvider.js     # DuckDuckGo/web search
|   |-- mcp-mock/                 # MCP microservices (yahoo, ddg, memory, fetcher)
|   +-- server.js                 # Express entry point
|-- src/
|   +-- pages/
|       |-- Research.jsx          # ReAct agent UI (6 skills + chat)
|       |-- Dashboard.jsx         # Net worth overview
|       |-- Portfolio.jsx         # Stock holdings
|       +-- ...                   # 7 more pages
|-- data/                         # User financial data (JSON)
|-- docker-compose.yml            # 4 MCP services
+-- .env.example                  # Environment variable template
```

---

## Arize Integration

Every call to Gemini and every tool invocation is traced in Arize Phoenix:

1. **Trace the full ReAct chain** -- see Thought -> Action -> Observation for every question
2. **Evaluate answer quality** -- Arize scores responses for relevance and faithfulness
3. **Monitor latency** -- P95 response time per tool (Yahoo Finance, web search, etc.)
4. **Detect failures** -- alert when tools fail or the agent loops without an answer

---

## License

MIT -- see [LICENSE](./LICENSE)
