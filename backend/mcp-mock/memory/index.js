const express = require('express')
const app = express()
app.use(express.json())

const store = {}

app.post('/set', (req,res)=>{
  const { key, value } = req.body || {}
  if(!key) return res.status(400).json({ error: 'key required' })
  store[key] = value
  res.json({ ok: true })
})

app.get('/get', (req,res)=>{
  const key = req.query.key
  if(!key) return res.status(400).json({ error: 'key required' })
  res.json({ key, value: store[key] })
})

const PORT = process.env.PORT || 8004
app.listen(PORT, ()=> console.log('Mock MCP Memory running on', PORT))
