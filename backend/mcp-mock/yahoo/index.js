const express = require('express')
const app = express()

// simple quote endpoint: /quote?symbol=AAPL
app.get('/quote', (req,res)=>{
  const symbol = (req.query.symbol||'').toUpperCase()
  const prices = { AAPL:170.45, MSFT:320.1, GOOGL:130.5 }
  const price = prices[symbol] || 100.0
  res.json({ symbol, price, timestamp: Date.now() })
})

const PORT = process.env.PORT || 8001
app.listen(PORT, ()=> console.log('Mock MCP Yahoo running on', PORT))
