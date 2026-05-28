/**
 * Multi-provider web search module for the wealth agent
 * Priority: Tavily → Exa → Serper → SearXNG (self-hosted)
 *
 * Free tiers:
 *   Tavily  — 1,000 searches/month  https://tavily.com  (TAVILY_API_KEY)
 *   Exa     — trial credits          https://exa.ai      (EXA_API_KEY)
 *   Serper  — 2,500 searches/month   https://serper.dev  (SERPER_API_KEY)
 *   SearXNG — unlimited, self-hosted  http://localhost:8080 (SEARXNG_URL or default)
 */

let fetch
try { fetch = require('node-fetch') } catch { fetch = globalThis.fetch }

// ─── Tavily ───────────────────────────────────────────────────────────────────
async function searchTavily(query, maxResults = 6) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: 'advanced',
      max_results: maxResults,
      include_answer: true,
      include_raw_content: false,
    }),
  })
  if (!res.ok) throw new Error(`Tavily ${res.status}`)
  const d = await res.json()
  return {
    provider: 'Tavily',
    answer: d.answer || '',
    results: (d.results || []).map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
      score: r.score,
    })),
  }
}

// ─── Exa ──────────────────────────────────────────────────────────────────────
async function searchExa(query, maxResults = 6) {
  const res = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: { 'x-api-key': process.env.EXA_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      numResults: maxResults,
      contents: { text: { maxCharacters: 800 } },
      type: 'neural',
      useAutoprompt: true,
    }),
  })
  if (!res.ok) throw new Error(`Exa ${res.status}`)
  const d = await res.json()
  return {
    provider: 'Exa',
    answer: '',
    results: (d.results || []).map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.text || r.highlights?.[0] || '',
      score: r.score,
    })),
  }
}

// ─── Serper (Google) ──────────────────────────────────────────────────────────
async function searchSerper(query, maxResults = 6) {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, num: maxResults }),
  })
  if (!res.ok) throw new Error(`Serper ${res.status}`)
  const d = await res.json()
  const items = [...(d.organic || []), ...(d.news || [])].slice(0, maxResults)
  return {
    provider: 'Serper (Google)',
    answer: d.answerBox?.answer || d.answerBox?.snippet || '',
    results: items.map(r => ({
      title: r.title,
      url: r.link,
      snippet: r.snippet || r.date || '',
    })),
  }
}

// ─── SearXNG (self-hosted, free & unlimited) ──────────────────────────────────
async function searchSearXNG(query, maxResults = 6) {
  const base = process.env.SEARXNG_URL || 'http://localhost:8080'
  const url = `${base}/search?q=${encodeURIComponent(query)}&format=json&engines=google,bing,duckduckgo&language=en`
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
  if (!res.ok) throw new Error(`SearXNG ${res.status}`)
  const d = await res.json()
  return {
    provider: 'SearXNG (local)',
    answer: d.infoboxes?.[0]?.content || '',
    results: (d.results || []).slice(0, maxResults).map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
    })),
  }
}

// ─── Auto-detect active provider ─────────────────────────────────────────────
async function detectProvider() {
  if (process.env.TAVILY_API_KEY)  return 'tavily'
  if (process.env.EXA_API_KEY)     return 'exa'
  if (process.env.SERPER_API_KEY)  return 'serper'
  // Check if SearXNG is running
  try {
    const r = await fetch((process.env.SEARXNG_URL || 'http://localhost:8080') + '/search?q=test&format=json', { signal: AbortSignal.timeout(2000) })
    if (r.ok) return 'searxng'
  } catch {}
  return null
}

// ─── Unified search() ─────────────────────────────────────────────────────────
async function search(query, maxResults = 6) {
  const provider = await detectProvider()
  if (!provider) throw new Error('No search provider configured. Set TAVILY_API_KEY, EXA_API_KEY, SERPER_API_KEY, or run SearXNG locally.')

  switch (provider) {
    case 'tavily':  return searchTavily(query, maxResults)
    case 'exa':     return searchExa(query, maxResults)
    case 'serper':  return searchSerper(query, maxResults)
    case 'searxng': return searchSearXNG(query, maxResults)
  }
}

// ─── Status for /status endpoint ──────────────────────────────────────────────
async function status() {
  const provider = await detectProvider()
  return {
    searchProvider: provider,
    searchConfigured: !!provider,
    providers: {
      tavily:  { configured: !!process.env.TAVILY_API_KEY,  free: '1,000/mo',  link: 'https://tavily.com' },
      exa:     { configured: !!process.env.EXA_API_KEY,     free: 'trial',     link: 'https://exa.ai' },
      serper:  { configured: !!process.env.SERPER_API_KEY,  free: '2,500/mo',  link: 'https://serper.dev' },
      searxng: { configured: !!(await (async () => { try { const r = await fetch((process.env.SEARXNG_URL || 'http://localhost:8080') + '/search?q=test&format=json', { signal: AbortSignal.timeout(1500) }); return r.ok } catch { return false } })()) , free: 'unlimited', link: 'https://github.com/searxng/searxng' },
    },
  }
}

module.exports = { search, status, detectProvider }
