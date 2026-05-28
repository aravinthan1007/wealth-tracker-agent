const express = require('express')
const fs = require('fs')
const path = require('path')

const router = express.Router()

function loadJson(name){
  try{
    const p = path.join(__dirname, '..', '..', 'data', name)
    return JSON.parse(fs.readFileSync(p,'utf8'))
  }catch(e){ return [] }
}

router.get('/networth', (req,res)=>{
  const stocks = loadJson('mockStocks.json')
  const mortgages = loadJson('mockMortgage.json')
  const loans = loadJson('mockLoans.json')
  const savings = loadJson('mockSavings.json')

  const assets = []
  for(const s of stocks) assets.push(s.price * (s.shares||1))
  for(const sv of savings) assets.push(sv.balance || 0)
  const totalAssets = assets.reduce((a,b)=>a+b,0)

  const liabilities = []
  for(const m of mortgages) liabilities.push(m.balance || 0)
  for(const l of loans) liabilities.push(l.balance || 0)
  const totalLiabilities = liabilities.reduce((a,b)=>a+b,0)

  res.json({ netWorth: totalAssets - totalLiabilities, totalAssets, totalLiabilities })
})

// Proxy endpoint to fetch stock data — calls Yahoo Finance v8 directly, falls back to local mock
router.get('/stocks', async (req,res)=>{
  const raw = (req.query.symbol || '').replace(/[^A-Za-z.,\-^]/g, '').toUpperCase().slice(0, 50)
  if (!raw) return res.status(400).json({ error: 'symbol required' })
  const symbols = raw.split(',').filter(Boolean).slice(0, 10)

  const results = {}
  for (const symbol of symbols) {
    try {
      const r = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WealthTracker/1.0)' }, signal: AbortSignal.timeout(5000) }
      )
      const d = await r.json()
      const meta = d?.chart?.result?.[0]?.meta
      if (meta) {
        results[symbol] = {
          price:         Math.round(meta.regularMarketPrice * 100) / 100,
          previousClose: Math.round((meta.chartPreviousClose || meta.regularMarketPrice) * 100) / 100,
          change:        Math.round((meta.regularMarketPrice - (meta.chartPreviousClose || meta.regularMarketPrice)) * 100) / 100,
          changePercent: meta.chartPreviousClose
            ? Math.round((meta.regularMarketPrice / meta.chartPreviousClose - 1) * 10000) / 100
            : 0,
          currency: meta.currency,
          exchange: meta.exchangeName,
          source: 'yahoo-finance-v8',
        }
        continue
      }
    } catch (_) {}
    // Fallback to local mock data
    const stocks = loadJson('mockStocks.json')
    const item = stocks.find(s => s.symbol === symbol)
    results[symbol] = item ? { ...item, source: 'mock' } : { error: 'not found', source: 'mock' }
  }
  return res.json(symbols.length === 1 ? { source: results[symbols[0]]?.source, data: results[symbols[0]] } : results)
})

// Trigger daily run: run orchestrator and store summary to memory (if available)
router.get('/run/daily', async (req,res)=>{
  try{
    // call local orchestrator via require of frontend style agent module
    const orchestrator = require('../../src/agents/OrchestratorAgent')
    const result = await orchestrator.runOrchestrator()
    // try to persist to memory MCP if available
    try{
      const mcp = require('../mcp/mcpClient')
      await mcp.memorySet('lastDailySummary', result)
    }catch(e){ /* ignore */ }
    return res.json({ ok: true, result })
  }catch(e){
    return res.status(500).json({ error: e.message })
  }
})

// Alerts endpoint
router.post('/alerts', (req,res)=>{
  const { message, level } = req.body || {}
  const VALID_LEVELS = new Set(['info','warn','warning','error','critical'])
  const safeMessage = typeof message === 'string' ? message.slice(0, 500) : ''
  const safeLevel = typeof level === 'string' && VALID_LEVELS.has(level.toLowerCase()) ? level.toLowerCase() : 'info'
  // For now, log and respond. Hook into real notification service here.
  try{
    const notifier = require('../notifications/notificationService')
    notifier.sendNotification({ message: safeMessage, level: safeLevel })
  }catch(e){
    console.log('Alert:', safeMessage)
  }
  res.json({ ok: true })
})

// Server-Sent Events stream: pushes orchestrator updates periodically
router.get('/stream', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    // CORS handled by the global cors() middleware — do not override with wildcard
  })
  res.flushHeaders && res.flushHeaders()

  let id = 0
  let closed = false

  const sendUpdate = () => {
    if (closed) return
    // Compute net worth inline (CJS-safe, no ESM imports)
    const stocks    = loadJson('mockStocks.json')
    const mortgages = loadJson('mockMortgage.json')
    const loans     = loadJson('mockLoans.json')
    const savings   = loadJson('mockSavings.json')

    const totalAssets = [
      ...stocks.map(s => s.price * (s.shares || 1)),
      ...savings.map(s => s.balance || 0),
    ].reduce((a, b) => a + b, 0)

    const totalLiabilities = [
      ...mortgages.map(m => m.balance || 0),
      ...loans.map(l => l.balance || 0),
    ].reduce((a, b) => a + b, 0)

    const result = { netWorth: totalAssets - totalLiabilities, totalAssets, totalLiabilities }
    const payload = JSON.stringify({ id: id++, timestamp: new Date().toISOString(), result })
    res.write(`data: ${payload}\n\n`)
  }

  sendUpdate()
  const interval = setInterval(sendUpdate, 5000)

  req.on('close', () => {
    closed = true
    clearInterval(interval)
  })
})


module.exports = router
