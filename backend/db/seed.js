'use strict'

/**
 * MongoDB seed script — run once to populate collections from existing JSON files.
 * Usage: node backend/db/seed.js
 * Requires MONGODB_URI in .env
 */

require('dotenv').config()
const path = require('path')
const fs   = require('fs')
const {
  connect, isConnected,
  Expense, Budget, Income, CreditCard, UserProfile,
  Portfolio, Liability, SavingsAccount, KbArticle,
} = require('./mongo')

const DATA = path.join(__dirname, '../../data')
const DB   = path.join(DATA, 'db')

function readJson(f) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null }
}

async function seed() {
  const ok = await connect()
  if (!ok) { console.error('Cannot connect to MongoDB — set MONGODB_URI in .env'); process.exit(1) }

  // Expenses
  const expenses = readJson(path.join(DB, 'expenses.json')) || []
  if (expenses.length > 0) {
    const count = await Expense.countDocuments()
    if (count === 0) {
      await Expense.insertMany(expenses)
      console.log(`[seed] Inserted ${expenses.length} expenses`)
    } else {
      console.log(`[seed] Expenses already seeded (${count} docs)`)
    }
  }

  // Budget
  const budgets = readJson(path.join(DB, 'budgets.json'))
  if (budgets) {
    const count = await Budget.countDocuments()
    if (count === 0) {
      await Budget.create(budgets)
      console.log('[seed] Inserted budget')
    }
  }

  // Income
  const income = readJson(path.join(DB, 'income.json')) || []
  if (income.length > 0) {
    const count = await Income.countDocuments()
    if (count === 0) {
      await Income.insertMany(income)
      console.log(`[seed] Inserted ${income.length} income sources`)
    }
  }

  // Credit cards
  const cards = readJson(path.join(DB, 'creditCards.json')) || []
  if (cards.length > 0) {
    const count = await CreditCard.countDocuments()
    if (count === 0) {
      await CreditCard.insertMany(cards)
      console.log(`[seed] Inserted ${cards.length} credit cards`)
    }
  }

  // Profile
  const profile = readJson(path.join(DB, 'profile.json'))
  if (profile && Object.keys(profile).length > 0) {
    const count = await UserProfile.countDocuments()
    if (count === 0) {
      await UserProfile.create(profile)
      console.log('[seed] Inserted user profile')
    }
  }

  // Portfolio (stocks)
  const stocks = readJson(path.join(DATA, 'mockStocks.json')) || []
  if (stocks.length > 0) {
    const count = await Portfolio.countDocuments()
    if (count === 0) {
      await Portfolio.insertMany(stocks)
      console.log(`[seed] Inserted ${stocks.length} portfolio stocks`)
    }
  }

  // Liabilities
  const mortgages = (readJson(path.join(DATA, 'mockMortgage.json')) || []).map(m => ({ ...m, type: 'mortgage', label: 'Home Mortgage' }))
  const loans     = (readJson(path.join(DATA, 'mockLoans.json'))    || []).map(l => ({ ...l, type: 'personal_loan', label: 'Personal Loan' }))
  const allLiab   = [...mortgages, ...loans]
  if (allLiab.length > 0) {
    const count = await Liability.countDocuments()
    if (count === 0) {
      await Liability.insertMany(allLiab)
      console.log(`[seed] Inserted ${allLiab.length} liabilities`)
    }
  }

  // Savings
  const savings = readJson(path.join(DATA, 'mockSavings.json')) || []
  if (savings.length > 0) {
    const count = await SavingsAccount.countDocuments()
    if (count === 0) {
      await SavingsAccount.insertMany(savings)
      console.log(`[seed] Inserted ${savings.length} savings accounts`)
    }
  }

  // KB Article — WealthTrack architecture
  const kbCount = await KbArticle.countDocuments()
  if (kbCount === 0) {
    await KbArticle.create({
      appName: 'WealthTrack Agent',
      title: 'WealthTrack Agent — Architecture & Monitoring Requirements',
      contentType: 'json',
      version: '1.0',
      tags: ['nodejs', 'react', 'docker', 'mcp', 'financial-ai'],
      content: JSON.stringify({
        appName: 'WealthTrack Agent',
        description: 'AI-powered personal finance management platform with ReAct agent',
        techStack: { frontend: 'React 18 + Vite', backend: 'Express 4 (Node.js)', llm: 'Gemini 2.0 Flash', pattern: 'ReAct Agent' },
        services: [
          { name: 'wealthtrack-backend', port: 3000, type: 'nodejs', criticality: 'critical', healthEndpoint: '/health', description: 'Main Express API + ReAct agent orchestration' },
          { name: 'mcp-yahoo', port: 8001, type: 'nodejs', criticality: 'high', description: 'Yahoo Finance MCP — live stock quotes' },
          { name: 'mcp-duckduckgo', port: 8002, type: 'nodejs', criticality: 'medium', description: 'DuckDuckGo search MCP' },
          { name: 'mcp-fetcher', port: 8003, type: 'nodejs', criticality: 'low', description: 'URL fetcher MCP' },
          { name: 'arize-phoenix', port: 6006, type: 'python', criticality: 'medium', description: 'LLM observability — traces agent reasoning' },
        ],
        slos: [
          { name: 'Agent Response Time', metric: 'dt.service.request.response_time', threshold_ms: 5000, target_pct: 99 },
          { name: 'Stock Data API Success', metric: 'dt.service.request.failure_count', threshold_error_rate_pct: 5, target_pct: 99.5 },
          { name: 'API Availability', metric: 'availability', threshold_pct: 99.9, period: '30d' },
        ],
        alertThresholds: {
          responseTimeP95Ms: 3000,
          errorRatePct: 5,
          cpuUsagePct: 80,
          memoryUsagePct: 85,
          heapUsagePct: 90,
          eventLoopUtilizationPct: 80,
        },
        keyEndpoints: [
          { path: '/api/react-agent/stream', method: 'GET', description: 'SSE streaming agent', criticalPath: true },
          { path: '/api/react-agent/run', method: 'POST', description: 'Sync agent execution' },
          { path: '/api/stocks/quote', method: 'GET', description: 'Live stock quotes', criticalPath: true },
          { path: '/api/expenses', method: 'GET', description: 'Expense data' },
          { path: '/api/income', method: 'GET', description: 'Income data' },
        ],
        monitoringRequirements: {
          dashboards: ['Service Overview', 'Node.js Runtime Health', 'MCP Traffic', 'Agent Performance'],
          alerts: ['High Response Time', 'High Error Rate', 'Heap Memory Critical', 'Event Loop Saturated', 'MCP Service Down'],
          logQueries: ['Agent errors', 'Gemini API failures', 'Yahoo Finance timeouts', 'Memory store operations'],
        },
        troubleshooting: [
          'If agent loops or gives wrong answers: check Gemini API quota via GEMINI_API_KEY',
          'If no live stock data: Yahoo Finance rate limit — agent falls back to mock data',
          'If memory recall fails: check MONGODB_URI or MCP memory:8004 is running',
          'High heap usage: likely long agent conversations accumulating in memory',
          'Event loop lag: heavy JSON parsing from Yahoo Finance responses',
        ],
        contacts: { owner: 'wealth-team@company.com', oncall: 'pagerduty://wealth-tracker', repo: 'https://github.com/aravinthan1007/wealth-tracker-agent' },
        runbooks: ['https://github.com/aravinthan1007/wealth-tracker-agent/blob/main/README.md'],
        environment: { runtime: 'node', version: '>=18', containerized: true, orchestration: 'docker-compose', cloud: 'gcp-cloud-run' },
      }, null, 2),
    })
    console.log('[seed] Inserted WealthTrack KB article')
  }

  console.log('[seed] Done ✓')
  process.exit(0)
}

seed().catch(err => { console.error('[seed] Fatal:', err); process.exit(1) })
