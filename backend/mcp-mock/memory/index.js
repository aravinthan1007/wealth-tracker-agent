const express = require('express')
const app = express()
app.use(express.json())

// In-memory store (persists for Docker container lifetime)
const store = {}

app.post('/set', (req, res) => {
  const { key, value } = req.body || {}
  if (!key) return res.status(400).json({ error: 'key required' })
  store[key] = { value, timestamp: new Date().toISOString() }
  res.json({ ok: true, key })
})

app.get('/get', (req, res) => {
  const key = req.query.key
  if (!key) return res.status(400).json({ error: 'key required' })
  const entry = store[key]
  res.json(entry ? { key, value: entry.value, timestamp: entry.timestamp } : { key, value: null })
})

app.get('/all', (req, res) => {
  res.json(store)
})

app.delete('/delete', (req, res) => {
  const key = req.query.key
  if (!key) return res.status(400).json({ error: 'key required' })
  delete store[key]
  res.json({ ok: true, key })
})

const PORT = process.env.PORT || 8004
app.listen(PORT, () => console.log(`MCP Memory server running on port ${PORT}`))
