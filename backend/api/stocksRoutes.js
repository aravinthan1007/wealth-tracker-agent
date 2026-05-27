const express = require('express')
const router = express.Router()

// Use node-fetch for direct Yahoo Finance API calls (no auth needed, reliable)
let fetch
try { fetch = require('node-fetch') } catch(e) { fetch = global.fetch }

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://finance.yahoo.com/',
  'Origin': 'https://finance.yahoo.com',
}

async function yfQuote(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
    const res = await fetch(url, { headers: YF_HEADERS, timeout: 8000 })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const meta = data?.chart?.result?.[0]?.meta
    if (!meta || !meta.regularMarketPrice) throw new Error('no price')
    const price = meta.regularMarketPrice
    const prevClose = meta.chartPreviousClose || meta.previousClose || price
    const change = price - prevClose
    const changePercent = prevClose ? (change / prevClose) * 100 : 0
    return {
      symbol,
      price,
      change,
      changePercent,
      high: meta.regularMarketDayHigh || null,
      low: meta.regularMarketDayLow || null,
      volume: meta.regularMarketVolume || null,
      marketCap: meta.marketCap || null,
      name: meta.longName || meta.shortName || symbol,
      prevClose,
      currency: meta.currency || 'USD',
      exchangeTimezoneName: meta.exchangeTimezoneName || null,
    }
  } catch(e) {
    // fallback to query2
    try {
      const url2 = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
      const res2 = await fetch(url2, { headers: YF_HEADERS, timeout: 8000 })
      if (!res2.ok) throw new Error(`HTTP ${res2.status}`)
      const data2 = await res2.json()
      const meta2 = data2?.chart?.result?.[0]?.meta
      if (!meta2 || !meta2.regularMarketPrice) throw new Error('no price q2')
      const price2 = meta2.regularMarketPrice
      const prev2 = meta2.chartPreviousClose || meta2.previousClose || price2
      return {
        symbol, price: price2,
        change: price2 - prev2,
        changePercent: prev2 ? ((price2 - prev2) / prev2) * 100 : 0,
        high: meta2.regularMarketDayHigh || null,
        low: meta2.regularMarketDayLow || null,
        volume: meta2.regularMarketVolume || null,
        marketCap: meta2.marketCap || null,
        name: meta2.longName || meta2.shortName || symbol,
        prevClose: prev2,
        currency: meta2.currency || 'USD',
      }
    } catch(e2) {
      return { symbol, price: null, error: e2.message }
    }
  }
}

async function yfHistory(symbol, period1, period2) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d`
    const res = await fetch(url, { headers: YF_HEADERS, timeout: 10000 })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) throw new Error('no result')
    const times = result.timestamp || []
    const closes = result.indicators?.quote?.[0]?.close || []
    const opens = result.indicators?.quote?.[0]?.open || []
    const highs = result.indicators?.quote?.[0]?.high || []
    const lows = result.indicators?.quote?.[0]?.low || []
    const volumes = result.indicators?.quote?.[0]?.volume || []
    return times.map((t, i) => ({
      date: new Date(t * 1000).toISOString().split('T')[0],
      close: closes[i] || null,
      open: opens[i] || null,
      high: highs[i] || null,
      low: lows[i] || null,
      volume: volumes[i] || null,
    })).filter(d => d.close !== null)
  } catch(e) {
    return []
  }
}

async function yfNews(symbol, count = 5) {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&newsCount=${count}&quotesCount=0&enableFuzzyQuery=false`
    const res = await fetch(url, { headers: YF_HEADERS, timeout: 8000 })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return (data.news || []).slice(0, count).map(n => ({
      title: n.title,
      publisher: n.publisher,
      link: n.link,
      providerPublishTime: n.providerPublishTime,
      thumbnail: n.thumbnail?.resolutions?.[0]?.url || null,
    }))
  } catch(e) {
    return []
  }
}

// GET /api/stocks/quote?symbols=AAPL,MSFT,TSLA
router.get('/quote', async (req, res) => {
  const symbols = (req.query.symbols || 'AAPL,MSFT').split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
  try {
    const quotes = await Promise.all(symbols.map(s => yfQuote(s)))
    res.json(quotes)
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/stocks/news?symbol=AAPL&count=5
router.get('/news', async (req, res) => {
  const symbol = (req.query.symbol || 'AAPL').toUpperCase()
  const count = Math.min(parseInt(req.query.count) || 5, 10)
  const news = await yfNews(symbol, count)
  res.json({ symbol, news })
})

// GET /api/stocks/history?symbol=AAPL&period=1mo
router.get('/history', async (req, res) => {
  const symbol = (req.query.symbol || 'AAPL').toUpperCase()
  const period = req.query.period || '1mo'
  const now = Math.floor(Date.now() / 1000)
  let from = now
  if (period === '1wk') from = now - 7 * 86400
  else if (period === '1mo') from = now - 30 * 86400
  else if (period === '3mo') from = now - 90 * 86400
  else if (period === '1y') from = now - 365 * 86400
  const history = await yfHistory(symbol, from, now)
  res.json({ symbol, history })
})

module.exports = router

