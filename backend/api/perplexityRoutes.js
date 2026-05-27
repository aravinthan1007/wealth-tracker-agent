/**
 * Perplexity AI Routes — internet-connected wealth management agent skills
 * Adapts Anthropics financial-services wealth-management vertical plugins
 * https://github.com/anthropics/financial-services/tree/main/plugins/vertical-plugins/wealth-management
 *
 * Requires: PERPLEXITY_API_KEY env var
 * Model: sonar-pro (internet-grounded answers, real-time data)
 */

const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')

const PERPLEXITY_BASE = 'https://api.perplexity.ai'
const MODEL = 'sonar-pro'

let fetch
try { fetch = require('node-fetch') } catch (e) { fetch = globalThis.fetch }

const DB = p => path.join(__dirname, '../../data/db', p)
const readJson = f => { try { return JSON.parse(fs.readFileSync(DB(f), 'utf8')) } catch { return [] } }

function apiKey() { return process.env.PERPLEXITY_API_KEY || '' }

async function perplexityChat(systemPrompt, userPrompt, { maxTokens = 2000 } = {}) {
  const key = apiKey()
  if (!key) throw new Error('PERPLEXITY_API_KEY not set')

  const res = await fetch(`${PERPLEXITY_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.2,
      return_citations: true,
      search_recency_filter: 'week',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Perplexity API error ${res.status}: ${err}`)
  }
  const data = await res.json()
  return {
    text: data.choices?.[0]?.message?.content || '',
    citations: data.citations || [],
    model: data.model,
    usage: data.usage,
  }
}

// ─── GET /api/perplexity/status ──────────────────────────────────────────────
router.get('/status', (req, res) => {
  res.json({
    configured: !!apiKey(),
    model: MODEL,
    skills: ['portfolio-rebalance', 'financial-plan', 'tax-loss-harvesting', 'market-research', 'client-review', 'investment-proposal'],
    source: 'Adapted from github.com/anthropics/financial-services wealth-management vertical',
  })
})

// ─── POST /api/perplexity/market-research ────────────────────────────────────
// Skill: Market research on a stock or sector with live internet data
router.post('/market-research', async (req, res) => {
  const { query, symbols } = req.body
  if (!query && !symbols) return res.status(400).json({ error: 'query or symbols required' })

  const topic = query || (Array.isArray(symbols) ? symbols.join(', ') : symbols)

  const system = `You are a senior equity research analyst at a top-tier wealth management firm.
You have access to real-time internet data. Provide concise, accurate, actionable research.
Format: structured sections with headers. Include specific numbers, dates, and data points.
Always note when information is time-sensitive or subject to change.`

  const prompt = `Provide a comprehensive market research brief on: ${topic}

Cover:
1. **Current Price & Performance** — latest price, 1D/1W/1M/YTD/1Y returns
2. **Fundamental Snapshot** — P/E, P/B, EV/EBITDA, revenue growth, margin trends
3. **Recent News & Catalysts** — last 7 days significant developments
4. **Analyst Consensus** — buy/hold/sell ratings, average price target, range
5. **Key Risks** — top 3 risks to watch
6. **Wealth Management Insight** — suitability for long-term portfolio (dividend, growth, value?)

Be specific with numbers. Use today's market data where available.`

  try {
    const result = await perplexityChat(system, prompt, { maxTokens: 1500 })
    res.json({ skill: 'market-research', topic, ...result })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─── POST /api/perplexity/portfolio-rebalance ────────────────────────────────
// Skill: Adapted from anthropics/financial-services portfolio-rebalance
router.post('/portfolio-rebalance', async (req, res) => {
  const { holdings, targetAllocation, riskProfile = 'moderate' } = req.body

  // Pull income for context
  const income = readJson('income.json')
  const totalMonthly = income.reduce((s, i) => {
    const m = i.frequency === 'annual' ? i.amount / 12 : i.frequency === 'quarterly' ? i.amount / 3 : i.frequency === 'weekly' ? i.amount * 4.33 : i.frequency === 'biweekly' ? i.amount * 2.17 : i.amount
    return s + (i.active !== false ? m : 0)
  }, 0)

  const holdingsText = Array.isArray(holdings) && holdings.length
    ? holdings.map(h => `${h.symbol}: ${h.shares} shares @ $${h.currentPrice || h.avgCost} avg cost`).join('\n')
    : 'No holdings provided — analyze general rebalancing principles'

  const system = `You are a portfolio manager at a registered investment advisor (RIA).
Skill: Portfolio Rebalance (adapted from Anthropic financial-services wealth-management vertical)
Use live market data to provide specific, actionable rebalancing recommendations.
Always consider tax implications and wash sale rules.`

  const prompt = `Analyze this portfolio for rebalancing opportunities:

**Current Holdings:**
${holdingsText}

**Client Profile:**
- Risk profile: ${riskProfile}
- Monthly income: $${Math.round(totalMonthly).toLocaleString()}
- Target allocation: ${targetAllocation ? JSON.stringify(targetAllocation) : 'suggest optimal for ' + riskProfile + ' risk'}

**Task (Portfolio Rebalance Skill):**

### Step 1: Drift Analysis
Compare current allocation to recommended targets. Show a drift table by asset class:
- US Large Cap, US Small/Mid, International, Emerging Markets, Bonds, Cash

### Step 2: Current Market Context
Use real-time data — are there sector rotations, rate changes, or macro events affecting rebalancing decisions today?

### Step 3: Trade Recommendations
Specific buy/sell recommendations. For each:
- Which account type to rebalance in first (tax-advantaged > taxable)
- Tax impact consideration
- Suggested replacement securities (ETFs) if consolidating

### Step 4: Asset Location
Where should each asset class sit? (IRA vs Roth vs Taxable)

### Step 5: Action Summary
Prioritized action list with estimated tax impact.

Cite current prices and market data where relevant.`

  try {
    const result = await perplexityChat(system, prompt, { maxTokens: 2000 })
    res.json({ skill: 'portfolio-rebalance', riskProfile, ...result })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─── POST /api/perplexity/financial-plan ─────────────────────────────────────
// Skill: Adapted from anthropics/financial-services financial-plan
router.post('/financial-plan', async (req, res) => {
  const income = readJson('income.json')
  const expenses = readJson('expenses.json')
  const profile = readJson('profile.json')
  const cards = readJson('creditCards.json')

  const totalMonthly = income.reduce((s, i) => {
    const m = i.frequency === 'annual' ? i.amount / 12 : i.frequency === 'quarterly' ? i.amount / 3 : i.frequency === 'weekly' ? i.amount * 4.33 : i.frequency === 'biweekly' ? i.amount * 2.17 : i.amount
    return s + (i.active !== false ? m : 0)
  }, 0)

  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const totalDebt = cards.reduce((s, c) => s + (c.balance || 0), 0)
  const incomeByType = {}
  income.forEach(i => { if (i.active !== false) incomeByType[i.type] = (incomeByType[i.type] || 0) + (i.frequency === 'annual' ? i.amount / 12 : i.amount) })

  const { age = 30, retirementAge = 65, additionalContext = '' } = req.body || {}

  const system = `You are a Certified Financial Planner (CFP) at a fiduciary wealth management firm.
Skill: Financial Plan (adapted from Anthropic financial-services wealth-management vertical)
Use real market data, current interest rates, and tax laws for 2026.
All outputs are drafts for professional review — not investment advice.`

  const prompt = `Build a comprehensive financial plan for this client:

**Client Financial Data:**
- Age: ${age}, Target retirement age: ${retirementAge}
- Monthly gross income: $${Math.round(totalMonthly).toLocaleString()}
  - Salary: $${Math.round(incomeByType.salary || 0).toLocaleString()}/mo
  - Dividends: $${Math.round(incomeByType.dividend || 0).toLocaleString()}/mo
  - Options/Equity: $${Math.round(incomeByType.options || 0).toLocaleString()}/mo
- Monthly expenses: $${Math.round(totalExpenses).toLocaleString()}
- Credit card debt: $${Math.round(totalDebt).toLocaleString()}
- Monthly savings potential: $${Math.round(Math.max(0, totalMonthly - totalExpenses)).toLocaleString()}
${additionalContext ? '- Additional context: ' + additionalContext : ''}

**Task (Financial Plan Skill):**

### Step 1: Cash Flow Analysis
Annual cash flow projection. Savings rate = ${totalMonthly > 0 ? Math.round(((totalMonthly - totalExpenses) / totalMonthly) * 100) : 0}%. Is this healthy? What's the target?

### Step 2: Retirement Projections
- Years to retirement: ${retirementAge - age}
- If saving $${Math.round(Math.max(0, totalMonthly - totalExpenses)).toLocaleString()}/mo at various return rates (6%, 8%, 10%):
  - Portfolio value at retirement
  - Sustainable withdrawal rate (4% rule → annual income)
  - Probability of success
- Use current 2026 market conditions and Fed rate outlook

### Step 3: Debt Optimization
For the $${Math.round(totalDebt).toLocaleString()} in credit card debt:
- Current average credit card APR (use real 2026 rates)
- Payoff strategies: avalanche vs. snowball
- Impact on net worth if paid off in 12 / 24 / 36 months

### Step 4: Investment Allocation
Given age ${age} and ${retirementAge - age} years to retirement:
- Recommended asset allocation
- Account priority (max 401k/IRA before taxable?)
- 2026 contribution limits (401k, IRA, HSA, 529)

### Step 5: Tax Optimization
- Marginal tax bracket based on income
- Roth vs Traditional IRA recommendation
- Tax-loss harvesting opportunities this year (2026 market context)
- SALT deduction, standard vs. itemized

### Step 6: Action Plan
Top 5 specific, prioritized actions for the next 90 days.

Use real 2026 data: interest rates, market levels, tax brackets, contribution limits.`

  try {
    const result = await perplexityChat(system, prompt, { maxTokens: 2500 })
    res.json({ skill: 'financial-plan', age, retirementAge, totalMonthly, totalExpenses, ...result })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─── POST /api/perplexity/tax-loss-harvesting ─────────────────────────────────
// Skill: Adapted from anthropics/financial-services tax-loss-harvesting
router.post('/tax-loss-harvesting', async (req, res) => {
  const { holdings = [], ytdGains = 0, taxBracket = 24 } = req.body

  const holdingsText = holdings.length
    ? holdings.map(h => `${h.symbol}: ${h.shares} shares, avg cost $${h.avgCost || 0}, current ~$${h.currentPrice || '?'}`).join('\n')
    : 'AAPL, MSFT, TSLA, NVDA (use example portfolio)'

  const system = `You are a tax-aware portfolio manager and CPA specializing in tax optimization for high-income investors.
Skill: Tax-Loss Harvesting (adapted from Anthropic financial-services wealth-management vertical)
Today is May 2026. Use real current prices and 2026 tax law.
Always note wash sale rules. Outputs are for professional review only.`

  const prompt = `Analyze tax-loss harvesting opportunities:

**Portfolio Holdings:**
${holdingsText}

**Tax Context:**
- YTD realized gains: $${ytdGains.toLocaleString()}
- Marginal tax bracket: ${taxBracket}%
- Current date: May 2026 (YTD context relevant)

**Task (Tax-Loss Harvesting Skill):**

### Step 1: Harvest Candidates
Look up current prices for the holdings. For each position, identify:
- Current market price (use real data)
- Unrealized gain or loss
- Short-term vs. long-term holding period
- Priority score (largest loss first, short-term losses prioritized)

### Step 2: Tax Savings Estimate
| Position | Cost Basis | Current | Loss | ST/LT | Tax Savings @ ${taxBracket}% |
Show which losses are most valuable to harvest given the YTD gains of $${ytdGains.toLocaleString()}.

### Step 3: Replacement Securities (Wash Sale Safe)
For each harvest candidate, suggest a replacement ETF/security that:
- Maintains same market exposure
- Is NOT substantially identical (30-day wash sale window)
- Reference: 2026 wash sale rules

### Step 4: Execution Timing
Best timing in 2026? Any year-end considerations? Market conditions that affect execution?

### Step 5: Summary
- Total harvestable losses
- Estimated tax savings
- Net portfolio impact
- Wash sale windows to track`

  try {
    const result = await perplexityChat(system, prompt, { maxTokens: 1800 })
    res.json({ skill: 'tax-loss-harvesting', ytdGains, taxBracket, ...result })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─── POST /api/perplexity/client-review ──────────────────────────────────────
// Skill: Adapted from anthropics/financial-services client-review
router.post('/client-review', async (req, res) => {
  const income = readJson('income.json')
  const expenses = readJson('expenses.json')
  const cards = readJson('creditCards.json')
  const profile = readJson('profile.json')
  const { holdings = [], period = 'Q2 2026' } = req.body

  const totalMonthly = income.reduce((s, i) => {
    const m = i.frequency === 'annual' ? i.amount / 12 : i.amount
    return s + (i.active !== false ? m : 0)
  }, 0)
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const totalDebt = cards.reduce((s, c) => s + (c.balance || 0), 0)

  const holdingsText = holdings.length
    ? holdings.map(h => `${h.symbol} (${h.shares} shares)`).join(', ')
    : 'AAPL, MSFT, TSLA (example)'

  const system = `You are a senior wealth advisor preparing a quarterly client review.
Skill: Client Review (adapted from Anthropic financial-services wealth-management vertical)
Use real market data for ${period}. Format as a professional advisory brief.`

  const prompt = `Prepare a quarterly client review brief for ${period}:

**Client Snapshot:**
- Name: ${profile.name || 'Client'}
- Monthly income: $${Math.round(totalMonthly).toLocaleString()}
- Monthly expenses: $${Math.round(totalExpenses).toLocaleString()}
- Credit card debt: $${Math.round(totalDebt).toLocaleString()}
- Holdings: ${holdingsText}

**Quarterly Review (Client Review Skill):**

### 1. Market Context (${period})
- How did major indices perform this quarter? (S&P 500, Nasdaq, bonds)
- Key macro events that affected portfolios (Fed decisions, earnings, geopolitical)

### 2. Portfolio Performance Attribution
For the holdings listed:
- Individual performance this quarter (use real Q2 2026 data)
- Attribution: what drove gains/losses?
- Compare to benchmark (S&P 500)

### 3. Financial Health Check
- Savings rate: $${Math.round(Math.max(0, totalMonthly - totalExpenses)).toLocaleString()}/mo (${totalMonthly > 0 ? Math.round(((totalMonthly - totalExpenses) / totalMonthly) * 100) : 0}%) — healthy?
- Debt: $${Math.round(totalDebt).toLocaleString()} — payoff priority?
- Emergency fund adequacy at current expense level

### 4. Recommendations for Next Quarter
- Portfolio adjustments given current market outlook
- Any rebalancing needed?
- Tax planning for the back half of 2026
- Specific action items

### 5. Looking Ahead
- Key risks for Q3 2026
- Opportunities to position for

Format as a professional client-ready brief.`

  try {
    const result = await perplexityChat(system, prompt, { maxTokens: 2000 })
    res.json({ skill: 'client-review', period, ...result })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─── POST /api/perplexity/investment-proposal ────────────────────────────────
// Skill: Adapted from anthropics/financial-services investment-proposal
router.post('/investment-proposal', async (req, res) => {
  const { targetAmount = 10000, goal = 'long-term growth', riskProfile = 'moderate', timeHorizon = 10 } = req.body
  const income = readJson('income.json')
  const totalMonthly = income.reduce((s, i) => {
    const m = i.frequency === 'annual' ? i.amount / 12 : i.amount
    return s + (i.active !== false ? m : 0)
  }, 0)

  const system = `You are a portfolio strategist at a leading wealth management firm.
Skill: Investment Proposal (adapted from Anthropic financial-services wealth-management vertical)
Use real 2026 market data, current valuations, and interest rates.
Provide a specific, actionable investment proposal with exact tickers and allocations.`

  const prompt = `Build an investment proposal:

**Client Context:**
- Investment amount: $${Number(targetAmount).toLocaleString()}
- Goal: ${goal}
- Risk profile: ${riskProfile}
- Time horizon: ${timeHorizon} years
- Monthly income: $${Math.round(totalMonthly).toLocaleString()}

**Investment Proposal (Investment Proposal Skill):**

### 1. Market Environment (May 2026)
Current state of:
- US equities — valuation, momentum, macro outlook
- International equities — opportunities vs. US
- Fixed income — Fed rate path, yield curve
- Alternatives — any compelling opportunities?

### 2. Proposed Portfolio
For $${Number(targetAmount).toLocaleString()} with ${riskProfile} risk over ${timeHorizon} years:

| Asset Class | Allocation | Ticker | Rationale | Expected Return |
|-------------|-----------|--------|-----------|-----------------|

(Use actual ETFs — VTI, VXUS, BND, etc. Give specific %)

### 3. Expected Outcomes
- Expected annual return range (use realistic 2026 assumptions)
- Worst-case 1-year drawdown
- Projected value at ${timeHorizon} years

### 4. Implementation
- Lump sum vs. dollar-cost averaging? (given current market levels)
- Which brokerage/account type?
- Rebalancing frequency

### 5. Key Risks & Mitigations
Top 3 risks specific to this portfolio in 2026 market environment.

### 6. Why Not Alternatives
Why these specific ETFs vs. alternatives? (Active funds, individual stocks, real estate)

Use real current prices, yields, and market data.`

  try {
    const result = await perplexityChat(system, prompt, { maxTokens: 2000 })
    res.json({ skill: 'investment-proposal', targetAmount, goal, riskProfile, timeHorizon, ...result })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─── POST /api/perplexity/chat ────────────────────────────────────────────────
// Free-form chat with financial context injected
router.post('/chat', async (req, res) => {
  const { message, conversationHistory = [] } = req.body
  if (!message) return res.status(400).json({ error: 'message required' })

  const income = readJson('income.json')
  const expenses = readJson('expenses.json')
  const profile = readJson('profile.json')

  const totalMonthly = income.reduce((s, i) => {
    const m = i.frequency === 'annual' ? i.amount / 12 : i.amount
    return s + (i.active !== false ? m : 0)
  }, 0)
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0)

  const system = `You are a knowledgeable financial advisor AI with internet access for real-time data.
You have access to the user's financial data:
- Monthly income: $${Math.round(totalMonthly).toLocaleString()}
- Monthly expenses: $${Math.round(totalExpenses).toLocaleString()}
- Savings rate: ${totalMonthly > 0 ? Math.round(((totalMonthly - totalExpenses) / totalMonthly) * 100) : 0}%
- User: ${profile.name || 'Client'}

Use this context when relevant. Provide concise, actionable answers.
For investment questions, use real current market data (2026).
Always note when something requires professional advice.`

  const messages = [
    { role: 'system', content: system },
    ...conversationHistory.slice(-8), // last 4 exchanges
    { role: 'user', content: message },
  ]

  try {
    const key = apiKey()
    if (!key) return res.status(503).json({ error: 'PERPLEXITY_API_KEY not set. Add it to your .env file.' })

    const r = await fetch(`${PERPLEXITY_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, messages, max_tokens: 1000, temperature: 0.3, return_citations: true, search_recency_filter: 'week' }),
    })
    const data = await r.json()
    res.json({
      reply: data.choices?.[0]?.message?.content || '',
      citations: data.citations || [],
      role: 'assistant',
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
