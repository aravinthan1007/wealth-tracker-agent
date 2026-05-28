const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')

const DB = path.join(__dirname, '../../data/db')
if (!fs.existsSync(DB)) fs.mkdirSync(DB, { recursive: true })

const CARDS_FILE = path.join(DB, 'creditCards.json')
if (!fs.existsSync(CARDS_FILE)) fs.writeFileSync(CARDS_FILE, JSON.stringify([
  { id: 'cc1', name: 'Chase Sapphire', bank: 'Chase', last4: '4242', limit: 10000, balance: 2340.50, minPayment: 35, dueDate: '2026-06-15', apr: 22.99, rewards: 'Travel Points', color: '#0ea5e9' },
  { id: 'cc2', name: 'Citi Double Cash', bank: 'Citi', last4: '8888', limit: 8000, balance: 980.00, minPayment: 25, dueDate: '2026-06-20', apr: 19.99, rewards: '2% Cash Back', color: '#22c55e' },
  { id: 'cc3', name: 'Amex Gold', bank: 'American Express', last4: '1234', limit: 15000, balance: 5600.00, minPayment: 84, dueDate: '2026-06-10', apr: 0, rewards: '4x Dining', color: '#f59e0b' }
], null, 2))

function loadCards() { return JSON.parse(fs.readFileSync(CARDS_FILE, 'utf8')) }
function saveCards(data) { fs.writeFileSync(CARDS_FILE, JSON.stringify(data, null, 2)) }

// GET all cards
router.get('/', (req, res) => res.json(loadCards()))

// POST add card
router.post('/', (req, res) => {
  const b = req.body || {}
  // Validate required fields
  const limit = parseFloat(b.limit)
  const balance = parseFloat(b.balance)
  const minPayment = parseFloat(b.minPayment)
  const apr = parseFloat(b.apr)
  if (!b.name || typeof b.name !== 'string' || b.name.length > 100) {
    return res.status(400).json({ error: 'Invalid card name' })
  }
  if (!isFinite(limit) || limit < 0) return res.status(400).json({ error: 'Invalid limit' })
  if (!isFinite(balance) || balance < 0) return res.status(400).json({ error: 'Invalid balance' })
  const cards = loadCards()
  const card = {
    id: `cc${Date.now()}`,
    name: b.name.trim().slice(0, 100),
    bank: typeof b.bank === 'string' ? b.bank.trim().slice(0, 100) : '',
    last4: typeof b.last4 === 'string' ? b.last4.replace(/\D/g, '').slice(-4) : '',
    limit: isFinite(limit) ? limit : 0,
    balance: isFinite(balance) ? balance : 0,
    minPayment: isFinite(minPayment) ? minPayment : 0,
    dueDate: typeof b.dueDate === 'string' ? b.dueDate.slice(0, 10) : null,
    apr: isFinite(apr) && apr >= 0 ? apr : 0,
    rewards: typeof b.rewards === 'string' ? b.rewards.slice(0, 200) : '',
    color: typeof b.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(b.color) ? b.color : '#6366f1',
  }
  cards.push(card)
  saveCards(cards)
  res.status(201).json(card)
})

// PUT update card
router.put('/:id', (req, res) => {
  if (!/^cc\d+$/.test(req.params.id)) return res.status(400).json({ error: 'Invalid id' })
  let cards = loadCards()
  const idx = cards.findIndex(c => c.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  const b = req.body || {}
  const allowed = ['name', 'bank', 'last4', 'limit', 'balance', 'minPayment', 'dueDate', 'apr', 'rewards', 'color']
  const patch = {}
  for (const k of allowed) {
    if (!(k in b)) continue
    if (['limit','balance','minPayment','apr'].includes(k)) {
      const n = parseFloat(b[k])
      if (!isFinite(n) || n < 0) return res.status(400).json({ error: `Invalid ${k}` })
      patch[k] = n
    } else if (k === 'color') {
      if (typeof b[k] === 'string' && /^#[0-9a-fA-F]{6}$/.test(b[k])) patch[k] = b[k]
    } else {
      patch[k] = typeof b[k] === 'string' ? b[k].slice(0, 200) : b[k]
    }
  }
  cards[idx] = { ...cards[idx], ...patch }
  saveCards(cards)
  res.json(cards[idx])
})

// DELETE card
router.delete('/:id', (req, res) => {
  let cards = loadCards()
  cards = cards.filter(c => c.id !== req.params.id)
  saveCards(cards)
  res.json({ ok: true })
})

// GET summary
router.get('/summary', (req, res) => {
  const cards = loadCards()
  res.json({
    totalCards: cards.length,
    totalBalance: cards.reduce((s, c) => s + (c.balance || 0), 0),
    totalLimit: cards.reduce((s, c) => s + (c.limit || 0), 0),
    totalMinPayment: cards.reduce((s, c) => s + (c.minPayment || 0), 0),
    utilization: cards.reduce((s, c) => s + (c.balance || 0), 0) / (cards.reduce((s, c) => s + (c.limit || 0), 1)) * 100
  })
})

module.exports = router
