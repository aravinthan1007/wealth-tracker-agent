const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')

const DB = path.join(__dirname, '../../data/db')
const INCOME_FILE = path.join(DB, 'income.json')
const PROFILE_FILE = path.join(DB, 'profile.json')

function readIncome() {
  try { return JSON.parse(fs.readFileSync(INCOME_FILE, 'utf8')) } catch { return [] }
}
function writeIncome(data) { fs.writeFileSync(INCOME_FILE, JSON.stringify(data, null, 2)) }

function readProfile() {
  try { return JSON.parse(fs.readFileSync(PROFILE_FILE, 'utf8')) } catch { return {} }
}
function writeProfile(data) { fs.writeFileSync(PROFILE_FILE, JSON.stringify(data, null, 2)) }

// ── Profile (name, salary, onboarding) ─────────────────────────────────────

// GET /api/income/profile
router.get('/profile', (req, res) => {
  res.json(readProfile())
})

// PUT /api/income/profile
router.put('/profile', (req, res) => {
  const existing = readProfile()
  const b = req.body || {}
  // Whitelist profile fields — never blindly spread req.body into stored data
  const ALLOWED_PROFILE = ['name','email','phone','occupation','annualSalary','taxRate','currency','riskProfile','investmentGoal','retirementAge','onboarded']
  const patch = {}
  for (const k of ALLOWED_PROFILE) {
    if (!(k in b)) continue
    if (['annualSalary','taxRate','retirementAge'].includes(k)) {
      const n = parseFloat(b[k])
      if (!isFinite(n) || n < 0) continue
      patch[k] = n
    } else if (typeof b[k] === 'string') {
      patch[k] = b[k].slice(0, 200)
    } else if (typeof b[k] === 'boolean') {
      patch[k] = b[k]
    }
  }
  const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() }
  writeProfile(updated)
  res.json(updated)
})

// ── Income sources ──────────────────────────────────────────────────────────

// GET /api/income
// Returns all income sources + computed totals
router.get('/', (req, res) => {
  const income = readIncome()
  const monthly = income.reduce((s, i) => {
    if (!i.active) return s
    const amt = i.amount || 0
    switch (i.frequency) {
      case 'annual': return s + amt / 12
      case 'quarterly': return s + amt / 3
      case 'weekly': return s + amt * 4.33
      case 'biweekly': return s + amt * 2.17
      default: return s + amt // monthly
    }
  }, 0)
  const byType = income.filter(i => i.active).reduce((acc, i) => {
    const monthly = i.frequency === 'annual' ? i.amount / 12
      : i.frequency === 'quarterly' ? i.amount / 3
      : i.frequency === 'weekly' ? i.amount * 4.33
      : i.frequency === 'biweekly' ? i.amount * 2.17
      : i.amount
    acc[i.type] = (acc[i.type] || 0) + monthly
    return acc
  }, {})
  res.json({ income, totalMonthly: monthly, totalAnnual: monthly * 12, byType })
})

// POST /api/income
router.post('/', (req, res) => {
  const income = readIncome()
  const entry = {
    id: Date.now().toString(),
    type: req.body.type || 'other',       // salary|dividend|options|rental|freelance|interest|other
    label: req.body.label || '',
    amount: parseFloat(req.body.amount) || 0,
    frequency: req.body.frequency || 'monthly', // monthly|annual|quarterly|weekly|biweekly
    currency: req.body.currency || 'USD',
    taxable: req.body.taxable !== false,
    notes: req.body.notes || '',
    active: req.body.active !== false,
    startDate: req.body.startDate || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  }
  income.push(entry)
  writeIncome(income)
  res.status(201).json(entry)
})

// PUT /api/income/:id
router.put('/:id', (req, res) => {
  const income = readIncome()
  const idx = income.findIndex(i => i.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  const b = req.body || {}
  const VALID_TYPES = new Set(['salary','dividend','options','rental','freelance','interest','other'])
  const VALID_FREQ = new Set(['monthly','annual','quarterly','weekly','biweekly'])
  const patch = {}
  if (b.type !== undefined && VALID_TYPES.has(b.type)) patch.type = b.type
  if (b.label !== undefined) patch.label = String(b.label).slice(0, 200)
  if (b.amount !== undefined) {
    const n = parseFloat(b.amount)
    if (isFinite(n) && n >= 0) patch.amount = n
  }
  if (b.frequency !== undefined && VALID_FREQ.has(b.frequency)) patch.frequency = b.frequency
  if (b.notes !== undefined) patch.notes = String(b.notes).slice(0, 500)
  if (b.active !== undefined) patch.active = !!b.active
  if (b.taxable !== undefined) patch.taxable = !!b.taxable
  income[idx] = { ...income[idx], ...patch, id: income[idx].id, updatedAt: new Date().toISOString() }
  writeIncome(income)
  res.json(income[idx])
})

// DELETE /api/income/:id
router.delete('/:id', (req, res) => {
  const income = readIncome()
  const filtered = income.filter(i => i.id !== req.params.id)
  writeIncome(filtered)
  res.json({ ok: true })
})

// GET /api/income/summary
// Returns monthly totals by type — used by Overview networth
router.get('/summary', (req, res) => {
  const income = readIncome()
  const active = income.filter(i => i.active)
  const toMonthly = i => {
    switch (i.frequency) {
      case 'annual': return i.amount / 12
      case 'quarterly': return i.amount / 3
      case 'weekly': return i.amount * 4.33
      case 'biweekly': return i.amount * 2.17
      default: return i.amount
    }
  }
  const totalMonthly = active.reduce((s, i) => s + toMonthly(i), 0)
  const salary = active.filter(i => i.type === 'salary').reduce((s, i) => s + toMonthly(i), 0)
  const dividend = active.filter(i => i.type === 'dividend').reduce((s, i) => s + toMonthly(i), 0)
  const options = active.filter(i => i.type === 'options').reduce((s, i) => s + toMonthly(i), 0)
  const other = active.filter(i => !['salary','dividend','options'].includes(i.type)).reduce((s, i) => s + toMonthly(i), 0)
  res.json({ totalMonthly, totalAnnual: totalMonthly * 12, salary, dividend, options, other, count: active.length })
})

module.exports = router
