# WealthTrack Agent

> An AI-powered personal finance agent that **reasons** about your wealth — built with Google Gemini, a ReAct reasoning loop, MCP-connected observability via Arize, and an automatic **Goal Inference Engine** that reads your real financial data and proposes personalized goals without any chatbot interview.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**Hackathon:** [Google Cloud Rapid Agent Hackathon](https://googlecloudmultiagent.devpost.com/)
**Track:** Arize — AI Observability
**Live Demo:** *(link after deployment)*

---

## What It Does

WealthTrack Agent is a full-stack wealth management platform where a **ReAct reasoning agent** (Thought → Action → Observation loop) answers complex financial questions by calling real-data tools:

- **"Am I on track to retire in 20 years?"** → agent reasons through net worth, income, expenses
- **"Which of my stocks are underperforming?"** → pulls live Yahoo Finance quotes, compares against holdings
- **"What is the market saying about my portfolio?"** → searches the web in real time via DuckDuckGo
- **"Summarize last months expenses"** → reads transaction history, categorizes spend

A **Goal Inference Engine** automatically reads your income, expenses, and credit cards and proposes prioritized, editable financial goals — no interview required.

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
    |-- Goal Inference Engine
    |       Reads income + expenses + credit cards -> proposes goals
    |       6 goal types: Emergency Fund, Debt Payoff, Home, Retirement, Education, Investment
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

## Goal Inference Engine

The **Goals** page automatically reads your financial data and proposes prioritized goals — no chatbot interview needed.

**How it works:**
1. On first visit, asks for age and number of dependents (2 fields only)
2. Reads `income`, `expenses`, and `credit cards` from live data
3. Returns up to 6 goal suggestions, ranked by priority:

| Priority | Goal Type | Logic |
|----------|-----------|-------|
| 1 | Emergency Fund | 6× avg monthly expenses, 18-month target |
| 2 | Debt Payoff | Cards with APR > 15%, snowball at 12%/mo |
| 3 | Home Down Payment | 20% of 5× annual housing cost (off by default) |
| 4 | Retirement Fund | 25× annual expenses at 7% compound (4% rule) |
| 5 | Education Fund | $140k × dependents, 18-year horizon |
| 6 | Investment Growth | Remaining surplus, 10-year horizon (off by default) |

**Features:**
- Feasibility strip: shows income / expenses / goal contributions and whether the plan is achievable
- Toggle goals on/off; inline-edit target amounts and dates
- Monthly contribution auto-recalculates on every change
- "Ask AI about my plan" sends the full goal context to the ReAct agent
- "Accept & save goals" persists the plan to `data/db/goals.json`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, Recharts, Lucide React |
| Backend | Express 4 (Node.js, CommonJS) |
| AI | **Google Gemini 2.0 Flash** (via `@google/generative-ai`) |
| Agent Pattern | ReAct (Reasoning + Acting loop) |
| Goal Engine | Rule-based inference on live financial data |
| MCP Servers | Docker Compose — 4 microservices |
| AI Observability | **Arize Phoenix** — traces every LLM + tool call |
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
|   |   |-- reactAgentRoutes.js   # ReAct loop — Gemini + 11 tools
|   |   |-- goalsRoutes.js        # Goal Inference Engine + CRUD
|   |   |-- agentRoutes.js        # REST endpoints for financial data
|   |   +-- searchProvider.js     # DuckDuckGo/web search
|   |-- mcp-mock/                 # MCP microservices (yahoo, ddg, memory, fetcher)
|   +-- server.js                 # Express entry point
|-- src/
|   |-- pages/
|   |   |-- Goals.jsx             # Goal Inference Engine UI (editable cards)
|   |   |-- Portfolio.jsx         # Stock holdings + Deep Analyze overlay
|   |   |-- Income.jsx            # Income sources + Cash Flow Sankey
|   |   |-- Research.jsx          # ReAct agent UI (6 skills + chat)
|   |   |-- Dashboard.jsx         # Net worth overview
|   |   +-- ...                   # 6 more pages
|   +-- components/
|       |-- CashFlowSankey.jsx    # Sankey diagram: income → categories → surplus
|       +-- ...
|-- data/                         # User financial data (JSON)
|-- docker-compose.yml            # 4 MCP services
+-- .env.example                  # Environment variable template
```

---

## Arize Integration

Every call to Gemini and every tool invocation is traced in Arize Phoenix:

1. **Trace the full ReAct chain** — see Thought → Action → Observation for every question
2. **Evaluate answer quality** — Arize scores responses for relevance and faithfulness
3. **Monitor latency** — P95 response time per tool (Yahoo Finance, web search, etc.)
4. **Detect failures** — alert when tools fail or the agent loops without an answer

---

## License

MIT -- see [LICENSE](./LICENSE)
