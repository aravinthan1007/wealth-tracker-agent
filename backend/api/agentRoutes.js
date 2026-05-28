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

// Proxy endpoint to fetch stock data via MCP client if available
router.get('/stocks', async (req,res)=>{
  const symbol = req.query.symbol
  if(!symbol) return res.status(400).json({ error: 'symbol required' })
  // Try MCP Yahoo Finance server via backend mcp client
  try{
    const mcp = require('../mcp/mcpClient')
    const data = await mcp.getStockQuote(symbol)
    return res.json({ source: 'mcp', data })
  }catch(e){
    // fallback to local data
    const stocks = loadJson('mockStocks.json')
    const item = stocks.find(s=>s.symbol===symbol)
    return res.json({ source: 'mock', data: item || null })
  }
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
