const fetch = require('node-fetch')
const { URLSearchParams } = require('url')

// Simple MCP client wrapper. Configure MCP base URLs via env or defaults.
const MCP_CONFIG = {
  yahoo: process.env.MCP_YAHOO_URL || 'http://localhost:8001',
  duckduckgo: process.env.MCP_DUCKDUCKGO_URL || 'http://localhost:8002',
  fetcher: process.env.MCP_FETCH_URL || 'http://localhost:8003',
  memory: process.env.MCP_MEMORY_URL || 'http://localhost:8004',
}

async function callMCP(baseUrl, path, method='GET', body){
  const url = baseUrl + path
  const opts = { method, headers: {} }
  if(body){
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }
  const res = await fetch(url, opts)
  return res.json()
}

module.exports = {
  async getStockQuote(symbol){
    // expects MCP server exposing /quote?symbol=SYM
    const path = '/quote?'+ new URLSearchParams({ symbol })
    return callMCP(MCP_CONFIG.yahoo, path)
  },

  async searchWeb(query){
    // expects MCP server exposing /search?q=...
    const path = '/search?'+ new URLSearchParams({ q: query })
    return callMCP(MCP_CONFIG.duckduckgo, path)
  },

  async fetchUrl(url){
    // expects MCP fetcher exposing /fetch with POST { url }
    return callMCP(MCP_CONFIG.fetcher, '/fetch', 'POST', { url })
  },

  async memorySet(key, value){
    return callMCP(MCP_CONFIG.memory, '/set', 'POST', { key, value })
  },

  async memoryGet(key){
    return callMCP(MCP_CONFIG.memory, '/get?'+ new URLSearchParams({ key }))
  }
}
