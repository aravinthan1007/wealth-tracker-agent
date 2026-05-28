const express = require('express')
const app = express()

// GET /quote?symbol=AAPL  — real Yahoo Finance v8 API, no key needed
app.get('/quote', async (req, res) => {
  const symbol = (req.query.symbol || '').replace(/[^A-Za-z.\-^]/g, '').toUpperCase().slice(0, 10)
  if (!symbol) return res.status(400).json({ error: 'symbol required' })
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WealthTracker/1.0)' },
      signal: AbortSignal.timeout(5000),
    })
    const d = await r.json()
    const meta = d?.chart?.result?.[0]?.meta
    if (!meta) return res.status(404).json({ error: 'symbol not found', symbol })
    res.json({
      symbol,
      price:         Math.round(meta.regularMarketPrice * 100) / 100,
      previousClose: Math.round((meta.chartPreviousClose || meta.regularMarketPrice) * 100) / 100,
      change:        Math.round((meta.regularMarketPrice - (meta.chartPreviousClose || meta.regularMarketPrice)) * 100) / 100,
      changePercent: meta.chartPreviousClose
        ? Math.round((meta.regularMarketPrice / meta.chartPreviousClose - 1) * 10000) / 100
        : 0,
      currency:  meta.currency,
      exchange:  meta.exchangeName,
      timestamp: Date.now(),
      source:    'yahoo-finance-v8',
    })
  } catch (e) {
    res.status(500).json({ error: e.message, symbol })
  }
})

// GET /batch?symbols=AAPL,MSFT,TSLA
app.get('/batch', async (req, res) => {
  const raw = (req.query.symbols || '').slice(0, 200)
  const symbols = raw.split(',').map(s => s.replace(/[^A-Za-z.\-^]/g, '').toUpperCase()).filter(Boolean).slice(0, 10)
  if (!symbols.length) return res.status(400).json({ error: 'symbols required' })
  const results = await Promise.all(symbols.map(async sym => {
    try {
      const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WealthTracker/1.0)' },
        signal: AbortSignal.timeout(5000),
      })
      const d = await r.json()
      const meta = d?.chart?.result?.[0]?.meta
      if (!meta) return { symbol: sym, error: 'not found' }
      return {
        symbol: sym,
        price:         Math.round(meta.regularMarketPrice * 100) / 100,
        previousClose: Math.round((meta.chartPreviousClose || meta.regularMarketPrice) * 100) / 100,
        change:        Math.round((meta.regularMarketPrice - (meta.chartPreviousClose || meta.regularMarketPrice)) * 100) / 100,
        changePercent: meta.chartPreviousClose
          ? Math.round((meta.regularMarketPrice / meta.chartPreviousClose - 1) * 10000) / 100
          : 0,
        currency: meta.currency,
        exchange: meta.exchangeName,
        source:   'yahoo-finance-v8',
      }
    } catch (e) {
      return { symbol: sym, error: e.message }
    }
  }))
  res.json({ results, timestamp: Date.now() })
})

const PORT = process.env.PORT || 8001
app.listen(PORT, () => console.log(`MCP Yahoo Finance running on port ${PORT} (real data)`))
