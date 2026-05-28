/**
 * Wealth Agent Research Routes
 * Search: Tavily -> Exa -> Serper -> SearXNG (auto-detect, all free)
 * LLM:    Ollama llama3.2 (local, free) -> OpenAI gpt-4o-mini fallback
 *
 * Skills adapted from: github.com/anthropics/financial-services
 * wealth-management vertical (portfolio-rebalance, financial-plan,
 * tax-loss-harvesting, client-review, investment-proposal, market-research)
 */

const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const searchProvider = require('./searchProvider')

let fetch
try { fetch = require('node-fetch') } catch { fetch = globalThis.fetch }

const DB = p => path.join(__dirname, '../../data/db', p)
const readJson = f => { try { return JSON.parse(fs.readFileSync(DB(f), 'utf8')) } catch { return [] } }

// ─── LLM: Ollama (local) -> OpenAI fallback ───────────────────────────────────
async function llmChat(systemPrompt, userPrompt, maxTokens) {
  if (!maxTokens) maxTokens = 2000
  const model = process.env.OLLAMA_MODEL || 'llama3.2'
  try {
    const r = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        options: { num_predict: maxTokens, temperature: 0.2 },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(120000),
    })
    if (r.ok) {
      const d = await r.json()
      return { text: d.message && d.message.content ? d.message.content : '', llm: 'Ollama ' + model }
    }
  } catch (e) {}

  if (process.env.OPENAI_API_KEY) {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        max_tokens: maxTokens,
        temperature: 0.2,
      }),
    })
    if (r.ok) {
      const d = await r.json()
      return { text: d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : '', llm: 'OpenAI gpt-4o-mini' }
    }
  }

  throw new Error('No LLM available. Install Ollama (ollama.com) and run: ollama pull llama3.2')
}

// ─── Helper: search + LLM ────────────────────────────────────────────────────
async function searchAndAnalyze(opts) {
  const { queries, systemPrompt, analysisPrompt, maxTokens } = opts
  const results = await Promise.all(
    queries.map(q => searchProvider.search(q, 5).catch(e => ({ error: e.message, results: [], provider: 'none', answer: '' })))
  )

  const provider = (results.find(r => r.provider && r.provider !== 'none') || {}).provider || 'unknown'
  const citations = results.reduce(function(a, r) {
    return a.concat((r.results || []).map(x => x.url).filter(Boolean))
  }, [])

  const searchContext = results.map(function(r, i) {
    const snippets = (r.results || []).map(s => '[' + s.title + ']\n' + String(s.snippet).slice(0, 500)).join('\n\n')
    const answer = r.answer ? 'Direct answer: ' + String(r.answer).slice(0, 500) + '\n\n' : ''
    return '=== Search: "' + queries[i] + '" ===\n' + answer + snippets
  }).join('\n\n---\n\n')

  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  // Wrap in XML delimiters to prevent prompt injection from search results
  const fullPrompt = analysisPrompt + '\n\n<web_search_results fetched="' + dateStr + '">\n' + searchContext + '\n</web_search_results>\n\nUse the search results above as your primary data source. Include specific numbers, dates, and prices from the results.'

  const out = await llmChat(systemPrompt, fullPrompt, maxTokens || 2000)
  return { text: out.text, citations: citations.filter((v, i, a) => a.indexOf(v) === i).slice(0, 8), provider: provider, llm: out.llm }
}

// ─── GET /api/perplexity/status ───────────────────────────────────────────────
router.get('/status', async (req, res) => {
  const ss = await searchProvider.status()

  let ollamaOk = false
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2'
  try {
    const r = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) })
    ollamaOk = r.ok
  } catch (e) {}

  res.json(Object.assign({}, ss, {
    llm: {
      ollama: { running: ollamaOk, model: ollamaModel, free: true, link: 'https://ollama.com' },
      openai: { configured: !!process.env.OPENAI_API_KEY, model: 'gpt-4o-mini' },
    },
    configured: ss.searchConfigured && (ollamaOk || !!process.env.OPENAI_API_KEY),
    skills: ['market-research', 'portfolio-rebalance', 'financial-plan', 'tax-loss-harvesting', 'client-review', 'investment-proposal'],
    source: 'Adapted from github.com/anthropics/financial-services wealth-management vertical',
  }))
})

// ─── POST /api/perplexity/market-research ────────────────────────────────────
router.post('/market-research', async (req, res) => {
  const { query, symbols } = req.body
  const topic = query || (Array.isArray(symbols) ? symbols.join(', ') : symbols)
  if (!topic) return res.status(400).json({ error: 'query or symbols required' })

  try {
    const result = await searchAndAnalyze({
      queries: [
        topic + ' stock price analyst rating 2026',
        topic + ' recent news earnings outlook',
        topic + ' fundamental analysis PE ratio revenue',
      ],
      systemPrompt: 'You are a senior equity research analyst. Provide concise, accurate, data-driven research using the provided web search results. Use specific numbers from the search data.',
      analysisPrompt: 'Write a market research brief on: **' + topic + '**\n\n### Current Price & Performance\n(latest price, 1D/1W/1M/YTD/1Y returns from search results)\n\n### Fundamental Snapshot\n(P/E, revenue growth, margins, EV/EBITDA from search data)\n\n### Recent News & Catalysts\n(last 2 weeks - use news from search results with dates)\n\n### Analyst Consensus\n(buy/hold/sell ratings, price targets from search data)\n\n### Key Risks\n(top 3 specific risks)\n\n### Wealth Management Insight\n(suitable for income, growth, or value portfolio? dividend yield?)\n\nBe specific with numbers from the search results.',
    })
    res.json(Object.assign({ skill: 'market-research', topic: topic }, result))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─── POST /api/perplexity/portfolio-rebalance ─────────────────────────────────
router.post('/portfolio-rebalance', async (req, res) => {
  const { holdings, riskProfile } = req.body
  const safeHoldings = holdings || []
  const safeRisk = riskProfile || 'moderate'
  const income = readJson('income.json')
  const totalMonthly = income.reduce(function(s, i) {
    const m = i.frequency === 'annual' ? i.amount / 12 : i.frequency === 'quarterly' ? i.amount / 3 : i.frequency === 'weekly' ? i.amount * 4.33 : i.frequency === 'biweekly' ? i.amount * 2.17 : i.amount
    return s + (i.active !== false ? m : 0)
  }, 0)

  const holdingsText = safeHoldings.length
    ? safeHoldings.map(h => h.symbol + ': ' + h.shares + ' shares, avg cost $' + (h.avgCost || 0)).join(', ')
    : 'General portfolio (no specific holdings provided)'
  const symbols = safeHoldings.map(h => h.symbol).join(' ') || 'VTI VXUS BND'

  try {
    const result = await searchAndAnalyze({
      queries: [
        'portfolio rebalancing strategy 2026 ' + safeRisk + ' risk asset allocation',
        symbols + ' current performance sector allocation 2026',
        'tax aware rebalancing ETF recommendations 2026',
      ],
      systemPrompt: 'You are a portfolio manager at a registered investment advisor (RIA). Provide specific, actionable trade recommendations.',
      analysisPrompt: 'Analyze this portfolio for rebalancing:\n\nHoldings: ' + holdingsText + '\nRisk profile: ' + safeRisk + '\nMonthly income: $' + Math.round(totalMonthly).toLocaleString() + '\n\n### Step 1: Current Market Context\n(from search results - what is driving asset class performance now?)\n\n### Step 2: Drift Analysis\nCompare current holdings to target allocation for ' + safeRisk + ' risk.\nTable: Asset Class | Target % | Est. Current % | Action\n\n### Step 3: Trade Recommendations\nSpecific buy/sell with:\n- Tax-advantaged accounts first (IRA > taxable)\n- Wash sale considerations\n- ETF suggestions from search results\n\n### Step 4: Asset Location\nWhere each asset class belongs (IRA, Roth, Taxable)\n\n### Step 5: Priority Actions\nTop 3 actions this month.',
    })
    res.json(Object.assign({ skill: 'portfolio-rebalance', riskProfile: safeRisk }, result))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─── POST /api/perplexity/financial-plan ──────────────────────────────────────
router.post('/financial-plan', async (req, res) => {
  const body = req.body || {}
  const age = body.age || 30
  const retirementAge = body.retirementAge || 65
  const additionalContext = body.additionalContext || ''
  const income = readJson('income.json')
  const expenses = readJson('expenses.json')
  const cards = readJson('creditCards.json')

  const totalMonthly = income.reduce(function(s, i) {
    const m = i.frequency === 'annual' ? i.amount / 12 : i.frequency === 'quarterly' ? i.amount / 3 : i.frequency === 'weekly' ? i.amount * 4.33 : i.frequency === 'biweekly' ? i.amount * 2.17 : i.amount
    return s + (i.active !== false ? m : 0)
  }, 0)
  const totalExpenses = expenses.reduce(function(s, e) { return s + (e.amount || 0) }, 0)
  const totalDebt = cards.reduce(function(s, c) { return s + (c.balance || 0) }, 0)
  const savingsRate = totalMonthly > 0 ? Math.round(((totalMonthly - totalExpenses) / totalMonthly) * 100) : 0
  const yearsToRetire = retirementAge - age
  const surplus = Math.round(Math.max(0, totalMonthly - totalExpenses))

  try {
    const result = await searchAndAnalyze({
      queries: [
        '2026 401k IRA contribution limits retirement savings rules',
        'retirement planning ' + yearsToRetire + ' years savings rate calculator',
        '2026 federal income tax brackets standard deduction',
      ],
      systemPrompt: 'You are a Certified Financial Planner (CFP) at a fiduciary RIA. Use the client\'s real data. All outputs are drafts for professional review.',
      analysisPrompt: 'Build a comprehensive financial plan:\n\nClient Data:\n- Age: ' + age + ', Retirement target: ' + retirementAge + ' (' + yearsToRetire + ' years)\n- Monthly income: $' + Math.round(totalMonthly).toLocaleString() + '\n- Monthly expenses: $' + Math.round(totalExpenses).toLocaleString() + '\n- Savings rate: ' + savingsRate + '%\n- Monthly surplus: $' + surplus.toLocaleString() + '\n- Credit card debt: $' + Math.round(totalDebt).toLocaleString() + (additionalContext ? '\n- Context: ' + additionalContext : '') + '\n\n### 1. Cash Flow Assessment\nIs the ' + savingsRate + '% savings rate healthy? Target vs. actual.\n\n### 2. Retirement Projections\nIf saving $' + surplus.toLocaleString() + '/mo for ' + yearsToRetire + ' years:\n- At 6% return: portfolio value\n- At 8% return: portfolio value\n- Sustainable income (4% rule)\n\n### 3. 2026 Tax & Account Optimization\nUse 2026 contribution limits from search results:\n- Max 401k? Max IRA? HSA?\n- Roth vs. Traditional at this income\n\n### 4. Debt Payoff Strategy\nFor $' + Math.round(totalDebt).toLocaleString() + ' in credit card debt.\n\n### 5. 90-Day Action Plan\n5 specific actions ranked by impact.',
    })
    res.json(Object.assign({ skill: 'financial-plan', age, retirementAge, totalMonthly, totalExpenses }, result))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─── POST /api/perplexity/tax-loss-harvesting ─────────────────────────────────
router.post('/tax-loss-harvesting', async (req, res) => {
  const { holdings, ytdGains, taxBracket } = req.body
  const safeHoldings = holdings || []
  const safeGains = ytdGains || 0
  const safeBracket = taxBracket || 24
  const symbols = safeHoldings.map(h => h.symbol).filter(Boolean)
  const symbolsStr = symbols.length ? symbols.join(' ') : 'AAPL MSFT TSLA NVDA'

  try {
    const result = await searchAndAnalyze({
      queries: [
        symbolsStr + ' stock price today unrealized gains losses 2026',
        'tax loss harvesting wash sale rule 2026 best ETF replacements',
        '2026 capital gains tax rate short term long term brackets',
      ],
      systemPrompt: 'You are a tax-aware portfolio manager specializing in tax optimization. Use 2026 tax rules and real prices from search results.',
      analysisPrompt: 'Tax-loss harvesting analysis:\n\nHoldings: ' + (symbols.length ? safeHoldings.map(h => h.symbol + ' (' + h.shares + ' shares @ $' + h.avgCost + ')').join(', ') : symbolsStr) + '\nYTD realized gains: $' + Number(safeGains).toLocaleString() + '\nTax bracket: ' + safeBracket + '%\n\n### Step 1: Harvest Candidates\nUsing current prices from search results:\n| Symbol | Cost Basis | Current | Gain/Loss | ST/LT | Harvest? |\n\n### Step 2: Tax Savings\nPriority order (largest short-term losses first).\nEstimated tax savings at ' + safeBracket + '% on $' + Number(safeGains).toLocaleString() + ' YTD gains.\n\n### Step 3: Wash-Sale-Safe Replacements\nFor each loss position - ETF replacement that maintains exposure.\n\n### Step 4: 2026 Tax Context\nCurrent capital gains rates from search.\n\n### Step 5: Summary\nTotal harvestable losses | Estimated savings | Wash sale windows to track',
    })
    res.json(Object.assign({ skill: 'tax-loss-harvesting', ytdGains: safeGains, taxBracket: safeBracket }, result))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─── POST /api/perplexity/client-review ──────────────────────────────────────
router.post('/client-review', async (req, res) => {
  const { holdings, period } = req.body
  const safeHoldings = holdings || []
  const safePeriod = period || 'Q2 2026'
  const income = readJson('income.json')
  const expenses = readJson('expenses.json')
  const cards = readJson('creditCards.json')
  const profile = readJson('profile.json')

  const totalMonthly = income.reduce(function(s, i) { return s + (i.active !== false ? (i.frequency === 'annual' ? i.amount / 12 : i.amount) : 0) }, 0)
  const totalExpenses = expenses.reduce(function(s, e) { return s + (e.amount || 0) }, 0)
  const totalDebt = cards.reduce(function(s, c) { return s + (c.balance || 0) }, 0)
  const symbols = safeHoldings.map(h => h.symbol).join(' ') || 'SPY QQQ'
  const savingsRate = totalMonthly > 0 ? Math.round(((totalMonthly - totalExpenses) / totalMonthly) * 100) : 0

  try {
    const result = await searchAndAnalyze({
      queries: [
        'S&P 500 Nasdaq performance ' + safePeriod + ' market returns',
        symbols + ' stock performance ' + safePeriod + ' quarterly',
        'market outlook Q3 2026 Fed interest rates economic forecast',
      ],
      systemPrompt: 'You are a senior wealth advisor preparing a quarterly review. Format as a professional advisory brief.',
      analysisPrompt: 'Quarterly client review - ' + safePeriod + ':\n\nClient: ' + (profile.name || 'Client') + '\nMonthly income: $' + Math.round(totalMonthly).toLocaleString() + ' | Expenses: $' + Math.round(totalExpenses).toLocaleString() + ' | Savings rate: ' + savingsRate + '%\nCredit card debt: $' + Math.round(totalDebt).toLocaleString() + '\nHoldings: ' + symbols + '\n\n### 1. Market Summary - ' + safePeriod + '\nKey index returns (from search results). Macro events that mattered.\n\n### 2. Portfolio Performance\nFor the holdings - gains/losses this quarter (use search data).\n\n### 3. Financial Health Check\n- Savings rate assessment\n- Debt payoff progress\n- Emergency fund: target $' + Math.round(totalExpenses * 6).toLocaleString() + ' (6 months)\n\n### 4. Recommendations for Next Quarter\nBased on current market outlook from search.\n\n### 5. Key Risks\nTop 3 risks to the portfolio (from search results).',
    })
    res.json(Object.assign({ skill: 'client-review', period: safePeriod }, result))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─── POST /api/perplexity/investment-proposal ─────────────────────────────────
router.post('/investment-proposal', async (req, res) => {
  const { targetAmount, goal, riskProfile, timeHorizon } = req.body
  const safeAmount = targetAmount || 10000
  const safeGoal = goal || 'long-term growth'
  const safeRisk = riskProfile || 'moderate'
  const safeHorizon = timeHorizon || 10

  try {
    const result = await searchAndAnalyze({
      queries: [
        'best ETF portfolio 2026 ' + safeRisk + ' risk ' + safeGoal,
        'Vanguard iShares ETF performance returns 2026 expense ratio',
        'stock market valuation 2026 S&P 500 outlook Fed rates',
      ],
      systemPrompt: 'You are a portfolio strategist at a leading wealth management firm. Provide specific ETF tickers and allocations using real 2026 data.',
      analysisPrompt: 'Investment proposal for $' + Number(safeAmount).toLocaleString() + ':\n\nGoal: ' + safeGoal + ' | Risk: ' + safeRisk + ' | Horizon: ' + safeHorizon + ' years\n\n### 1. 2026 Market Environment\nCurrent state of equities, bonds, rates (from search results).\n\n### 2. Proposed Portfolio\n| Asset Class | % | Ticker | Expense Ratio | Why |\n\n(Use specific ETFs from search results - VTI, VXUS, BND, SCHD, etc.)\n\n### 3. Expected Outcomes\n- Expected annual return range\n- Worst-case 1-year drawdown for ' + safeRisk + ' risk\n- Projected value at ' + safeHorizon + ' years (low/base/high)\n\n### 4. Implementation\n- Lump sum vs. DCA?\n- Account type priority\n- Rebalancing trigger: +-5% band\n\n### 5. Key Risks\nTop 3 risks specific to 2026.',
    })
    res.json(Object.assign({ skill: 'investment-proposal', targetAmount: safeAmount, goal: safeGoal, riskProfile: safeRisk, timeHorizon: safeHorizon }, result))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─── POST /api/perplexity/chat ────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  const { message, conversationHistory } = req.body
  if (!message) return res.status(400).json({ error: 'message required' })
  const history = conversationHistory || []

  const income = readJson('income.json')
  const expenses = readJson('expenses.json')
  const profile = readJson('profile.json')
  const totalMonthly = income.reduce(function(s, i) { return s + (i.active !== false ? (i.frequency === 'annual' ? i.amount / 12 : i.amount) : 0) }, 0)
  const totalExpenses = expenses.reduce(function(s, e) { return s + (e.amount || 0) }, 0)
  const savingsRate = totalMonthly > 0 ? Math.round(((totalMonthly - totalExpenses) / totalMonthly) * 100) : 0

  try {
    const searchResult = await searchProvider.search(message + ' 2026 financial', 4).catch(function() { return { results: [], answer: '', provider: 'none' } })
    const citations = searchResult.results.map(r => r.url).filter(Boolean)
    const searchCtx = searchResult.answer
      ? 'Web answer: ' + String(searchResult.answer).slice(0, 500) + '\n\n' + searchResult.results.slice(0, 3).map(r => '[' + r.title + ']: ' + String(r.snippet).slice(0, 300)).join('\n')
      : searchResult.results.slice(0, 3).map(r => '[' + r.title + ']: ' + String(r.snippet).slice(0, 300)).join('\n')

    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const systemPrompt = 'You are a knowledgeable financial advisor AI.\nClient data: monthly income $' + Math.round(totalMonthly).toLocaleString() + ', expenses $' + Math.round(totalExpenses).toLocaleString() + ', savings rate ' + savingsRate + '%.\nUser: ' + (profile.name || 'Client') + '\nToday: ' + dateStr + '\nAnswer concisely. Use web search results when available. Note when professional advice is needed.'

    // Wrap search results in XML delimiters to prevent prompt injection
    const fullMessage = searchCtx ? message + '\n\n<web_search_results>\n' + searchCtx + '\n</web_search_results>' : message

    const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2'
    const allMessages = history.slice(-6).concat([{ role: 'user', content: fullMessage }])

    let reply = null, llm = null
    try {
      const r = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: ollamaModel, stream: false, options: { num_predict: 800, temperature: 0.3 }, messages: [{ role: 'system', content: systemPrompt }].concat(allMessages) }),
        signal: AbortSignal.timeout(60000),
      })
      if (r.ok) { const d = await r.json(); reply = d.message && d.message.content ? d.message.content : null; llm = 'Ollama ' + ollamaModel }
    } catch (e) {}

    if (!reply && process.env.OPENAI_API_KEY) {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: systemPrompt }].concat(allMessages), max_tokens: 800 }),
      })
      if (r.ok) { const d = await r.json(); reply = d.choices && d.choices[0] ? d.choices[0].message.content : null; llm = 'OpenAI gpt-4o-mini' }
    }

    if (!reply) return res.status(503).json({ error: 'No LLM available. Install Ollama: ollama.com -> then: ollama pull llama3.2' })

    res.json({ reply, citations, role: 'assistant', llm, searchProvider: searchResult.provider })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router