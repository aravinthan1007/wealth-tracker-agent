const express = require('express')
const app = express()

// simple search endpoint: /search?q=term
app.get('/search', (req,res)=>{
  const q = req.query.q || ''
  res.json({ query: q, results: [ { title: `Result for ${q}`, url: 'https://example.com' } ] })
})

const PORT = process.env.PORT || 8002
app.listen(PORT, ()=> console.log('Mock MCP DuckDuckGo running on', PORT))
