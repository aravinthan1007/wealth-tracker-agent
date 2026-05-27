const express = require('express')
const fetch = require('node-fetch')
const app = express()
app.use(express.json())

// POST /fetch { url }
app.post('/fetch', async (req,res)=>{
  const url = req.body && req.body.url
  if(!url) return res.status(400).json({ error: 'url required' })
  try{
    const r = await fetch(url)
    const text = await r.text()
    res.json({ url, status: r.status, content: text.slice(0,2000) })
  }catch(e){
    res.status(500).json({ error: e.message })
  }
})

const PORT = process.env.PORT || 8003
app.listen(PORT, ()=> console.log('Mock MCP Fetcher running on', PORT))
