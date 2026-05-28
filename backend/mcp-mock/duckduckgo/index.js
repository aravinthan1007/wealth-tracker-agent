const express = require('express')
const app = express()

// GET /search?q=term  — DuckDuckGo Instant Answer JSON API (no key needed)
app.get('/search', async (req, res) => {
  const q = (req.query.q || '').slice(0, 200).trim()
  if (!q) return res.status(400).json({ error: 'q required' })
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WealthTracker/1.0)' },
      signal: AbortSignal.timeout(6000),
    })
    const d = await r.json()

    const results = [
      ...(d.Results || []).map(t => ({
        title:   t.Text || '',
        url:     t.FirstURL || '',
        snippet: t.Text || '',
      })),
      ...(d.RelatedTopics || []).filter(t => t.FirstURL).slice(0, 6).map(t => ({
        title:   (t.Text || '').slice(0, 120),
        url:     t.FirstURL || '',
        snippet: t.Text || '',
      })),
    ].filter(r => r.url).slice(0, 8)

    res.json({
      query:    q,
      abstract: d.AbstractText || '',
      results,
      source:   'duckduckgo-instant-answers',
      timestamp: Date.now(),
    })
  } catch (e) {
    res.status(500).json({ error: e.message, query: q })
  }
})

const PORT = process.env.PORT || 8002
app.listen(PORT, () => console.log(`MCP DuckDuckGo running on port ${PORT} (real data)`)
