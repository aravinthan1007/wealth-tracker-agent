const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')

const DB = path.join(__dirname, '../../data/db')
if (!fs.existsSync(DB)) fs.mkdirSync(DB, { recursive: true })

const EXP_FILE = path.join(DB, 'expenses.json')
if (!fs.existsSync(EXP_FILE)) {
  const now = new Date()
  const m = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
  fs.writeFileSync(EXP_FILE, JSON.stringify([
    { id: 'e1', category: 'Rent', amount: 2200, date: `${m}-01`, description: 'Monthly rent', type: 'housing', recurring: true },
    { id: 'e2', category: 'Groceries', amount: 380, date: `${m}-05`, description: 'Whole Foods', type: 'food', recurring: false },
    { id: 'e3', category: 'Utilities', amount: 145, date: `${m}-03`, description: 'Electric + Water', type: 'utilities', recurring: true },
    { id: 'e4', category: 'Netflix', amount: 22.99, date: `${m}-01`, description: 'Streaming', type: 'entertainment', recurring: true },
    { id: 'e5', category: 'Gym', amount: 55, date: `${m}-01`, description: 'LA Fitness', type: 'health', recurring: true },
    { id: 'e6', category: 'Gas', amount: 95, date: `${m}-10`, description: 'Shell', type: 'transport', recurring: false },
    { id: 'e7', category: 'Dining Out', amount: 210, date: `${m}-12`, description: 'Restaurants', type: 'food', recurring: false },
    { id: 'e8', category: 'Insurance', amount: 180, date: `${m}-01`, description: 'Auto + Health', type: 'insurance', recurring: true },
    { id: 'e9', category: 'Internet', amount: 89.99, date: `${m}-03`, description: 'Xfinity', type: 'utilities', recurring: true },
    { id: 'e10', category: 'Coffee', amount: 68, date: `${m}-15`, description: 'Starbucks etc', type: 'food', recurring: false }
  ], null, 2))
}

const BUD_FILE = path.join(DB, 'budgets.json')
if (!fs.existsSync(BUD_FILE)) fs.writeFileSync(BUD_FILE, JSON.stringify({
  housing: 2500, food: 700, utilities: 300, entertainment: 150, health: 100, transport: 200, insurance: 250, other: 300
}, null, 2))

function loadExpenses() { return JSON.parse(fs.readFileSync(EXP_FILE, 'utf8')) }
function saveExpenses(d) { fs.writeFileSync(EXP_FILE, JSON.stringify(d, null, 2)) }
function loadBudgets() { return JSON.parse(fs.readFileSync(BUD_FILE, 'utf8')) }
function saveBudgets(d) { fs.writeFileSync(BUD_FILE, JSON.stringify(d, null, 2)) }

// GET all expenses (optionally filter by month=YYYY-MM)
router.get('/', (req, res) => {
  let exp = loadExpenses()
  if (req.query.month) exp = exp.filter(e => e.date && e.date.startsWith(req.query.month))
  res.json(exp)
})

// GET monthly summary
router.get('/summary', (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0,7)
  const exp = loadExpenses().filter(e => e.date && e.date.startsWith(month))
  const budgets = loadBudgets()
  const byCategory = {}
  exp.forEach(e => { byCategory[e.type] = (byCategory[e.type] || 0) + e.amount })
  const total = exp.reduce((s, e) => s + e.amount, 0)
  res.json({ month, total, byCategory, budgets, expenses: exp })
})

// POST add expense
router.post('/', (req, res) => {
  const exp = loadExpenses()
  const item = { id: `e${Date.now()}`, ...req.body }
  exp.push(item)
  saveExpenses(exp)
  res.status(201).json(item)
})

// PUT update expense
router.put('/:id', (req, res) => {
  let exp = loadExpenses()
  const idx = exp.findIndex(e => e.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  exp[idx] = { ...exp[idx], ...req.body }
  saveExpenses(exp)
  res.json(exp[idx])
})

// DELETE expense
router.delete('/:id', (req, res) => {
  let exp = loadExpenses().filter(e => e.id !== req.params.id)
  saveExpenses(exp)
  res.json({ ok: true })
})

// GET /budgets
router.get('/budgets', (req, res) => res.json(loadBudgets()))

// PUT /budgets
router.put('/budgets', (req, res) => {
  saveBudgets(req.body)
  res.json(req.body)
})

module.exports = router
