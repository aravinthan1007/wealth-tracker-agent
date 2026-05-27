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
  const cards = loadCards()
  const card = { id: `cc${Date.now()}`, ...req.body }
  cards.push(card)
  saveCards(cards)
  res.status(201).json(card)
})

// PUT update card
router.put('/:id', (req, res) => {
  let cards = loadCards()
  const idx = cards.findIndex(c => c.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  cards[idx] = { ...cards[idx], ...req.body }
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
