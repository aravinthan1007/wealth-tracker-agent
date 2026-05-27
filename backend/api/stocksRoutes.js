const express = require('express')
const router = express.Router()
let yf = null
try { yf = require('yahoo-finance2').default } catch(e) { yf = null }

// GET /api/stocks/quote?symbols=AAPL,MSFT,TSLA
router.get('/quote', async (req, res) => {
  const symbols = (req.query.symbols || 'AAPL,MSFT').split(',').map(s => s.trim().toUpperCase())
  if (!yf) return res.json(symbols.map(s => ({ symbol: s, price: null, error: 'yahoo-finance2 not loaded' })))
  try {
    const quotes = await Promise.all(symbols.map(async sym => {
      try {
        const q = await yf.quote(sym)
        return {
          symbol: sym,
          price: q.regularMarketPrice,
          change: q.regularMarketChange,
          changePercent: q.regularMarketChangePercent,
          high: q.regularMarketDayHigh,
          low: q.regularMarketDayLow,
          volume: q.regularMarketVolume,
          marketCap: q.marketCap,
          name: q.shortName || q.longName || sym
        }
      } catch { return { symbol: sym, price: null, error: 'fetch failed' } }
    }))
    res.json(quotes)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/stocks/news?symbol=AAPL&count=5
router.get('/news', async (req, res) => {
  const symbol = (req.query.symbol || 'AAPL').toUpperCase()
  const count = parseInt(req.query.count) || 5
  if (!yf) return res.json({ symbol, news: [] })
  try {
    const result = await yf.search(symbol, { newsCount: count })
    const news = (result.news || []).slice(0, count).map(n => ({
      title: n.title,
      publisher: n.publisher,
      link: n.link,
      providerPublishTime: n.providerPublishTime,
      thumbnail: n.thumbnail?.resolutions?.[0]?.url || null
    }))
    res.json({ symbol, news })
  } catch (e) {
    res.json({ symbol, news: [], error: e.message })
  }
})

// GET /api/stocks/history?symbol=AAPL&period=1mo
router.get('/history', async (req, res) => {
  const symbol = (req.query.symbol || 'AAPL').toUpperCase()
  const period = req.query.period || '1mo'
  if (!yf) return res.json({ symbol, history: [] })
  try {
    const now = new Date()
    const from = new Date()
    if (period === '1wk') from.setDate(now.getDate() - 7)
    else if (period === '1mo') from.setMonth(now.getMonth() - 1)
    else if (period === '3mo') from.setMonth(now.getMonth() - 3)
    else if (period === '1y') from.setFullYear(now.getFullYear() - 1)
    const result = await yf.historical(symbol, { period1: from, period2: now, interval: '1d' })
    const history = result.map(d => ({ date: d.date, close: d.close, open: d.open, high: d.high, low: d.low, volume: d.volume }))
    res.json({ symbol, history })
  } catch (e) {
    res.json({ symbol, history: [], error: e.message })
  }
})

module.exports = router
