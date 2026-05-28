/**
 * WealthTrack ReAct Agent
 * Implements the Reasoning + Acting loop pattern:
 *   Thought → Action (tool call) → Observation → Thought → ... → Answer
 *
 * Routes:
 *   POST /api/react-agent/run     — synchronous (waits for full answer)
 *   GET  /api/react-agent/stream  — SSE streaming (step-by-step, real-time)
 *   GET  /api/react-agent/tools   — list available tools
 */

'use strict'

const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const searchProvider = require('./searchProvider')

let fetch
try { fetch = require('node-fetch') } catch (e) { fetch = global.fetch }

const DB = path.join(__dirname, '../../data/db')
const DATA = path.join(__dirname, '../../data')

// ── Utility ──────────────────────────────────────────────────────────────────

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return null }
}

function toMonthly(income) {
  switch (income.frequency) {
    case 'annual':    return income.amount / 12
    case 'quarterly': return income.amount / 3
    case 'weekly':    return income.amount * 4.33
    case 'biweekly':  return income.amount * 2.17
    default:          return income.amount
  }
}

// ── Tool implementations ──────────────────────────────────────────────────────

const TOOLS = {
  /**
   * get_networth()
   * Returns full net worth breakdown from local JSON files.
   */
  get_networth: async (_args) => {
    const stocks    = readJson(path.join(DATA, 'mockStocks.json'))    || []
    const mortgages = readJson(path.join(DATA, 'mockMortgage.json'))  || []
    const loans     = readJson(path.join(DATA, 'mockLoans.json'))     || []
    const savings   = readJson(path.join(DATA, 'mockSavings.json'))   || []
    const cards     = readJson(path.join(DB, 'creditCards.json'))     || []
    const incomeArr = readJson(path.join(DB, 'income.json'))          || []

    const stockValue    = stocks.reduce((s, x) => s + x.price * (x.shares || 1), 0)
    const savingsValue  = savings.reduce((s, x) => s + (x.balance || 0), 0)
    const totalAssets   = stockValue + savingsValue

    const mortgageDebt  = mortgages.reduce((s, x) => s + (x.balance || 0), 0)
    const loanDebt      = loans.reduce((s, x) => s + (x.balance || 0), 0)
    const cardDebt      = cards.reduce((s, x) => s + (x.balance || 0), 0)
    const totalLiab     = mortgageDebt + loanDebt + cardDebt

    const monthly = incomeArr.filter(i => i.active).reduce((s, i) => s + toMonthly(i), 0)

    return {
      netWorth:         Math.round(totalAssets - totalLiab),
      totalAssets:      Math.round(totalAssets),
      totalLiabilities: Math.round(totalLiab),
      monthlyIncome:    Math.round(monthly),
      breakdown: {
        stockPortfolio: Math.round(stockValue),
        savingsAccounts: Math.round(savingsValue),
        mortgageDebt:   Math.round(mortgageDebt),
        personalLoans:  Math.round(loanDebt),
        creditCardDebt: Math.round(cardDebt),
      },
    }
  },

  /**
   * get_stock_quotes(symbols)
   * Returns prices for comma-separated tickers.
   * Tries Yahoo Finance v8, falls back to mock data.
   */
  get_stock_quotes: async (args) => {
    if (!args) return { error: 'symbols required e.g. get_stock_quotes(AAPL,MSFT)' }
    const clean = String(args).replace(/[^A-Za-z,.\-]/g, '').toUpperCase().slice(0, 100)
    const requested = clean.split(',').filter(Boolean).slice(0, 10)
    if (requested.length === 0) return { error: 'No valid symbols provided' }

    // Try Yahoo Finance for first symbol as a batch endpoint check
    const result = {}
    for (const sym of requested) {
      try {
        const r = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`,
          { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(4000) }
        )
        if (r.ok) {
          const d = await r.json()
          const meta = d?.chart?.result?.[0]?.meta
          if (meta) {
            result[sym] = {
              price:         Math.round(meta.regularMarketPrice * 100) / 100,
              previousClose: meta.chartPreviousClose,
              change:        Math.round((meta.regularMarketPrice - meta.chartPreviousClose) * 100) / 100,
              changePercent: Math.round((meta.regularMarketPrice / meta.chartPreviousClose - 1) * 10000) / 100,
              currency:      meta.currency,
              exchange:      meta.exchangeName,
            }
            continue
          }
        }
      } catch (_) {}

      // Fallback to mock
      const stocks = readJson(path.join(DATA, 'mockStocks.json')) || []
      const found = stocks.find(s => s.symbol === sym)
      if (found) {
        result[sym] = {
          price: found.price,
          change: found.change || 0,
          changePercent: found.changePercent || 0,
          source: 'mock',
        }
      } else {
        result[sym] = { error: 'Symbol not found in live or local data' }
      }
    }
    return result
  },

  /**
   * get_expenses(month?)
   * Returns spending breakdown for the given month (YYYY-MM).
   * Defaults to current month if omitted.
   */
  get_expenses: async (args) => {
    const month = args && /^\d{4}-\d{2}$/.test(args.trim()) ? args.trim() : new Date().toISOString().slice(0, 7)
    const expenses = readJson(path.join(DB, 'expenses.json')) || []
    const filtered = expenses.filter(e => e.date && e.date.startsWith(month))
    const total = filtered.reduce((s, e) => s + (e.amount || 0), 0)
    const byCategory = {}
    filtered.forEach(e => { byCategory[e.type] = (byCategory[e.type] || 0) + e.amount })
    return {
      month,
      total: Math.round(total * 100) / 100,
      byCategory,
      count: filtered.length,
      topExpenses: filtered.sort((a, b) => b.amount - a.amount).slice(0, 5).map(e => ({
        category: e.category, amount: e.amount, description: e.description,
      })),
    }
  },

  /**
   * get_credit_cards()
   * Returns all credit card balances, limits, APRs and utilization.
   */
  get_credit_cards: async (_args) => {
    const cards = readJson(path.join(DB, 'creditCards.json')) || []
    const totalBalance = cards.reduce((s, c) => s + (c.balance || 0), 0)
    const totalLimit   = cards.reduce((s, c) => s + (c.limit   || 0), 0)
    const totalMin     = cards.reduce((s, c) => s + (c.minPayment || 0), 0)
    return {
      totalBalance: Math.round(totalBalance * 100) / 100,
      totalLimit,
      totalMinPayment: Math.round(totalMin * 100) / 100,
      utilizationPct: totalLimit > 0 ? Math.round(totalBalance / totalLimit * 100) : 0,
      cards: cards.map(c => ({
        name:        c.name,
        bank:        c.bank,
        balance:     c.balance,
        limit:       c.limit,
        apr:         c.apr,
        dueDate:     c.dueDate,
        utilization: c.limit > 0 ? Math.round(c.balance / c.limit * 100) + '%' : 'N/A',
      })),
    }
  },

  /**
   * get_income()
   * Returns all income sources with monthly/annual totals.
   */
  get_income: async (_args) => {
    const income = readJson(path.join(DB, 'income.json')) || []
    const active = income.filter(i => i.active)
    const totalMonthly = active.reduce((s, i) => s + toMonthly(i), 0)
    const byType = {}
    active.forEach(i => { byType[i.type] = (byType[i.type] || 0) + toMonthly(i) })
    return {
      totalMonthly:  Math.round(totalMonthly),
      totalAnnual:   Math.round(totalMonthly * 12),
      byType:        Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, Math.round(v)])),
      sources: active.map(i => ({
        label:     i.label,
        type:      i.type,
        monthly:   Math.round(toMonthly(i)),
        frequency: i.frequency,
        taxable:   i.taxable,
      })),
    }
  },

  /**
   * get_profile()
   * Returns the user's financial profile and goals.
   */
  get_profile: async (_args) => {
    const p = readJson(path.join(DB, 'profile.json')) || {}
    return {
      name:           p.name           || 'User',
      occupation:     p.occupation     || null,
      riskProfile:    p.riskProfile    || 'moderate',
      investmentGoal: p.investmentGoal || 'growth',
      retirementAge:  p.retirementAge  || 65,
      currency:       p.currency       || 'USD',
      annualSalary:   p.annualSalary   || null,
      taxRate:        p.taxRate        || null,
    }
  },

  /**
   * search_web(query)
   * Searches the web for financial news, rates, and market data.
   */
  search_web: async (args) => {
    if (!args) return { error: 'query required e.g. search_web(current fed funds rate 2026)' }
    const query = String(args).slice(0, 200)
    try {
      const r = await searchProvider.search(query, 4)
      return {
        provider: r.provider,
        answer:   r.answer ? String(r.answer).slice(0, 600) : null,
        results:  (r.results || []).slice(0, 4).map(x => ({
          title:   x.title,
          snippet: String(x.snippet).slice(0, 400),
          url:     x.url,
        })),
      }
    } catch (e) {
      return { error: 'Search unavailable: ' + e.message }
    }
  },

  /**
   * calculate(expression)
   * Evaluates a safe arithmetic expression.
   * Example: calculate(150000 * 0.07 / 12)
   */
  calculate: async (args) => {
    if (!args) return { error: 'expression required e.g. calculate(15000 * 0.07 / 12)' }
    // Allow only numbers and safe math operators — no arbitrary code
    const safe = String(args).replace(/[^0-9+\-*/().% \^]/g, '').trim()
    if (!safe) return { error: 'Expression contains no valid characters' }
    // Replace ^ with ** for exponentiation
    const expr = safe.replace(/\^/g, '**')
    try {
      // eslint-disable-next-line no-new-func
      const result = Function('"use strict"; return (' + expr + ')')()
      if (!isFinite(result)) return { error: 'Result is not finite' }
      return { expression: safe, result: Math.round(result * 100) / 100 }
    } catch (e) {
      return { error: 'Invalid expression: ' + e.message }
    }
  },
}

// ── Tool metadata (for /tools endpoint and system prompt) ─────────────────────

const TOOL_DOCS = [
  { name: 'get_networth',     args: '',        desc: 'Full net worth breakdown — assets, liabilities, stocks, savings, credit card debt, monthly income' },
  { name: 'get_stock_quotes', args: 'symbols', desc: 'Live stock prices for comma-separated tickers e.g. get_stock_quotes(AAPL,MSFT,TSLA)' },
  { name: 'get_expenses',     args: 'month?',  desc: 'Spending breakdown for month YYYY-MM e.g. get_expenses(2026-05). Omit arg for current month' },
  { name: 'get_credit_cards', args: '',        desc: 'All credit cards with balance, limit, APR, utilization' },
  { name: 'get_income',       args: '',        desc: 'Income sources and monthly/annual totals by type' },
  { name: 'get_profile',      args: '',        desc: "User's risk profile, investment goals, retirement age" },
  { name: 'search_web',       args: 'query',   desc: 'Web search for financial news, rates, market data e.g. search_web(S&P 500 YTD 2026)' },
  { name: 'calculate',        args: 'expr',    desc: 'Safe math e.g. calculate(150000 * 1.07^10) or calculate(5200 / 13400 * 100)' },
]

// ── System prompt for ReAct loop ─────────────────────────────────────────────

const TOOL_LIST = TOOL_DOCS.map(t => `- ${t.name}(${t.args}) → ${t.desc}`).join('\n')

const SYSTEM_PROMPT = `You are WealthTrack AI, a financial intelligence agent.
You have access to the user's real financial data through tools.
NEVER fabricate numbers. Always call tools to get real data.

Available tools:
${TOOL_LIST}

FORMAT — follow this EXACTLY, one action per response:

Thought: [reason about what data you need and why]
Action: tool_name(arguments)

When you have sufficient data to answer:
Thought: [summarize findings and your reasoning]
Answer: [complete, specific answer with real numbers from observations]

RULES:
- Always start with Thought:
- Call at least one tool before answering
- One Action per step — never multiple
- Use exact numbers from Observation results, not estimates
- If a tool errors, try a different approach
- After 8 tool calls you MUST write Answer:`

// ── Parse one LLM response into structured step ───────────────────────────────

function parseStep(text) {
  const clean = text.replace(/```[a-z]*\n?/gi, '').trim()

  const thoughtMatch = clean.match(/Thought:\s*([\s\S]+?)(?=\n(?:Action|Answer):|$)/)
  const thought = thoughtMatch ? thoughtMatch[1].trim() : ''

  const actionMatch = clean.match(/Action:\s*([a-zA-Z_]+)\s*\(([^)]*)\)/)
  if (actionMatch) {
    return { type: 'action', thought, tool: actionMatch[1], args: actionMatch[2].trim() }
  }

  const answerMatch = clean.match(/Answer:\s*([\s\S]+)/)
  if (answerMatch) {
    return { type: 'answer', thought, answer: answerMatch[1].trim() }
  }

  return { type: 'unknown', thought, raw: clean }
}

// ── Call Ollama ───────────────────────────────────────────────────────────────

async function callLLM(messages) {
  const model = process.env.OLLAMA_MODEL || 'llama3.2'
  const r = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages,
      options: { temperature: 0.15, num_predict: 700, stop: ['\nObservation:'] },
    }),
    signal: AbortSignal.timeout(90000),
  })
  if (!r.ok) throw new Error(`Ollama HTTP ${r.status}`)
  const d = await r.json()
  return d?.message?.content || d?.response || ''
}

// ── Core ReAct loop ───────────────────────────────────────────────────────────

async function runReActLoop(question, onStep) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user',   content: String(question).slice(0, 1000) },
  ]

  const steps = []
  const toolsUsed = []
  const MAX_STEPS = 8

  for (let i = 0; i < MAX_STEPS; i++) {
    const llmText = await callLLM(messages)
    const step = parseStep(llmText)

    if (step.type === 'answer') {
      const result = { step: i + 1, type: 'answer', thought: step.thought, answer: step.answer }
      steps.push(result)
      if (onStep) onStep(result)
      return { answer: step.answer, steps, toolsUsed, model: process.env.OLLAMA_MODEL || 'llama3.2' }
    }

    if (step.type === 'action') {
      // Validate tool name against whitelist
      const toolFn = TOOLS[step.tool]
      let observation
      if (!toolFn) {
        observation = { error: `Unknown tool "${step.tool}". Use: ${Object.keys(TOOLS).join(', ')}` }
      } else {
        try {
          observation = await toolFn(step.args || undefined)
        } catch (e) {
          observation = { error: e.message }
        }
      }

      const result = {
        step:        i + 1,
        type:        'action',
        thought:     step.thought,
        tool:        step.tool,
        args:        step.args,
        observation,
      }
      steps.push(result)
      toolsUsed.push(step.tool)
      if (onStep) onStep(result)

      // Feed observation back into conversation
      messages.push({ role: 'assistant', content: llmText })
      messages.push({ role: 'user',      content: `Observation: ${JSON.stringify(observation)}` })
      continue
    }

    // Unknown format — nudge the model
    messages.push({ role: 'assistant', content: llmText })
    messages.push({
      role: 'user',
      content: 'Please respond with:\nThought: [reasoning]\nAction: tool_name(args)\n\nOR\n\nThought: [reasoning]\nAnswer: [answer]',
    })
  }

  // Force final answer after max steps
  messages.push({ role: 'user', content: 'You have used the maximum tool calls. Provide your final Answer: now.' })
  const finalText = await callLLM(messages)
  const final = parseStep(finalText)
  const answer = final.answer || final.thought || finalText.slice(0, 2000)
  const result = { step: MAX_STEPS + 1, type: 'answer', thought: final.thought || '', answer }
  steps.push(result)
  if (onStep) onStep(result)
  return { answer, steps, toolsUsed, model: process.env.OLLAMA_MODEL || 'llama3.2' }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/react-agent/tools — list all available tools
router.get('/tools', (_req, res) => {
  res.json({ tools: TOOL_DOCS })
})

// POST /api/react-agent/run — synchronous full run
router.post('/run', async (req, res) => {
  const { question } = req.body || {}
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'question (string) required' })
  }
  if (question.length > 1000) {
    return res.status(400).json({ error: 'question too long (max 1000 chars)' })
  }

  try {
    const result = await runReActLoop(question)
    res.json(result)
  } catch (e) {
    res.status(502).json({ error: e.message, hint: 'Is Ollama running? ollama serve' })
  }
})

// GET /api/react-agent/stream?question=... — SSE streaming (step-by-step)
router.get('/stream', async (req, res) => {
  const question = req.query.question
  if (!question || typeof question !== 'string' || question.length > 1000) {
    return res.status(400).json({ error: 'question query param required (max 1000 chars)' })
  }

  res.set({
    'Content-Type':  'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection':    'keep-alive',
  })
  res.flushHeaders()

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  let closed = false
  req.on('close', () => { closed = true })

  try {
    const result = await runReActLoop(question, (step) => {
      if (!closed) send('step', step)
    })
    if (!closed) send('done', { answer: result.answer, toolsUsed: result.toolsUsed, model: result.model })
  } catch (e) {
    if (!closed) send('error', { error: e.message, hint: 'Is Ollama running? ollama serve' })
  }

  res.end()
})

module.exports = router
