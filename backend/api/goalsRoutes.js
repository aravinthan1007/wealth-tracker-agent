'use strict'
/**
 * Goals Inference Engine + CRUD
 *
 * GET  /api/goals               — load saved goals
 * POST /api/goals               — persist goals (replace all)
 * PUT  /api/goals/:id           — update one goal
 * DELETE /api/goals/:id         — remove one goal
 * GET  /api/goals/profile       — load goals profile (age, dependents)
 * POST /api/goals/profile       — save goals profile
 * GET  /api/goals/infer         — run inference engine → suggested goals
 */

const express = require('express')
const router  = express.Router()
const fs      = require('fs')
const path    = require('path')

const DB = path.join(__dirname, '../../data/db')
if (!fs.existsSync(DB)) fs.mkdirSync(DB, { recursive: true })

const GOALS_FILE   = path.join(DB, 'goals.json')
const PROFILE_FILE = path.join(DB, 'goalsProfile.json')

function loadGoals()   { try { return JSON.parse(fs.readFileSync(GOALS_FILE, 'utf8')) } catch { return [] } }
function saveGoals(d)  { fs.writeFileSync(GOALS_FILE, JSON.stringify(d, null, 2)) }
function loadProfile() { try { return JSON.parse(fs.readFileSync(PROFILE_FILE, 'utf8')) } catch { return {} } }
function saveProfile(d){ fs.writeFileSync(PROFILE_FILE, JSON.stringify(d, null, 2)) }

// ── Profile ──────────────────────────────────────────────────────────────────

router.get('/profile', (req, res) => res.json(loadProfile()))

router.post('/profile', (req, res) => {
  const b = req.body || {}
  const age  = parseInt(b.age)
  const deps = parseInt(b.dependents)
  if (!isFinite(age) || age < 16 || age > 100) return res.status(400).json({ error: 'age must be 16–100' })
  if (!isFinite(deps) || deps < 0 || deps > 20) return res.status(400).json({ error: 'Invalid dependents' })
  const profile = { age, dependents: deps, updatedAt: new Date().toISOString() }
  saveProfile(profile)
  res.json(profile)
})

// ── Inference engine ──────────────────────────────────────────────────────────

router.get('/infer', (req, res) => {
  try {
    const profile = loadProfile()

    /* ── Fetch raw data ── */
    const incomeFile = path.join(DB, 'income.json')
    const incomeRows = fs.existsSync(incomeFile) ? JSON.parse(fs.readFileSync(incomeFile, 'utf8')) : []
    const totalMonthly = incomeRows.filter(i => i.active).reduce((s, i) => {
      const a = i.amount || 0
      switch (i.frequency) {
        case 'annual':    return s + a / 12
        case 'quarterly': return s + a / 3
        case 'weekly':    return s + a * 4.33
        case 'biweekly':  return s + a * 2.17
        default:          return s + a
      }
    }, 0)

    const expFile  = path.join(DB, 'expenses.json')
    const allExp   = fs.existsSync(expFile) ? JSON.parse(fs.readFileSync(expFile, 'utf8')) : []
    // Average last 2 months of expenses for a stable baseline
    const now      = new Date()
    const months   = [0, 1].map(n => {
      const d = new Date(now.getFullYear(), now.getMonth() - n, 1)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })
    const recentExp  = allExp.filter(e => months.some(m => e.date?.startsWith(m)))
    const expTotal   = recentExp.reduce((s, e) => s + (e.amount || 0), 0)
    const monthCount = recentExp.length > 0 ? (months.filter(m => recentExp.some(e => e.date?.startsWith(m))).length || 1) : 1
    const avgMonthlyExp = expTotal / monthCount || 3_500  // fallback $3,500

    const cardsFile      = path.join(DB, 'creditCards.json')
    const cards          = fs.existsSync(cardsFile) ? JSON.parse(fs.readFileSync(cardsFile, 'utf8')) : []
    const highAprCards   = cards.filter(c => c.apr > 15 && c.balance > 0)
    const totalHighAprDebt = highAprCards.reduce((s, c) => s + (c.balance || 0), 0)

    const surplus     = totalMonthly - avgMonthlyExp
    const age         = profile.age        || 30
    const dependents  = profile.dependents || 0

    const tsNow       = Date.now()
    function futureDate(months) {
      const d = new Date(tsNow + months * 30.5 * 24 * 3600 * 1000)
      return d.toISOString().slice(0, 10)
    }
    function monthsUntil(dateStr) {
      return Math.max(1, Math.round((new Date(dateStr) - tsNow) / (30.5 * 24 * 3600 * 1000)))
    }

    const suggestions = []

    /* ─── PRIORITY 1 · Emergency Fund ────────────────────────────────────── */
    const emergencyTarget = Math.round(avgMonthlyExp * 6)
    const emergencyMonths = 18
    suggestions.push({
      id: 'goal_emergency',
      type: 'emergency_fund',
      priority: 1,
      label: 'Emergency Fund',
      reason: `Covers 6 months of your ~$${Math.round(avgMonthlyExp).toLocaleString()}/mo expenses. Highest priority — without this, any setback forces debt.`,
      targetAmount: emergencyTarget,
      targetDate: futureDate(emergencyMonths),
      monthlyContribution: Math.round(emergencyTarget / emergencyMonths),
      active: true,
      progress: 0,
    })

    /* ─── PRIORITY 2 · High-APR Debt Payoff ──────────────────────────────── */
    if (totalHighAprDebt > 0) {
      const avgApr = highAprCards.reduce((s, c) => s + c.apr * c.balance, 0) / totalHighAprDebt
      // Snowball: aggressive monthly = 12% of balance, min $300
      const aggressiveMonthly = Math.max(Math.round(totalHighAprDebt * 0.12), 300)
      const payoffMonths      = Math.ceil(totalHighAprDebt / aggressiveMonthly)
      suggestions.push({
        id: 'goal_debt',
        type: 'debt_payoff',
        priority: 2,
        label: 'Pay Off High-APR Debt',
        reason: `${highAprCards.length} card${highAprCards.length > 1 ? 's' : ''} totaling $${Math.round(totalHighAprDebt).toLocaleString()} at avg ${avgApr.toFixed(1)}% APR. Every dollar here beats any investment return.`,
        targetAmount: Math.round(totalHighAprDebt),
        targetDate: futureDate(payoffMonths),
        monthlyContribution: aggressiveMonthly,
        active: true,
        progress: 0,
        meta: { cards: highAprCards.map(c => ({ name: c.name, balance: c.balance, apr: c.apr })) },
      })
    }

    /* ─── PRIORITY 3 · Home Down Payment ─────────────────────────────────── */
    const housingExp      = allExp.filter(e => e.type === 'housing' || e.category?.toLowerCase().includes('rent'))
    const monthlyHousing  = housingExp.reduce((s, e) => s + (e.amount || 0), 0) / monthCount
    if (monthlyHousing > 0) {
      const affordableHome = monthlyHousing * 12 * 5   // rule of thumb: 5× annual housing cost
      const downPayment    = Math.round(affordableHome * 0.2)
      const dpMonths       = 60  // 5 years
      suggestions.push({
        id: 'goal_home',
        type: 'home_down_payment',
        priority: 3,
        label: 'Home Down Payment',
        reason: `20% down on an est. $${Math.round(affordableHome / 1000)}k home. Eliminates PMI and reduces lifetime interest paid.`,
        targetAmount: downPayment,
        targetDate: futureDate(dpMonths),
        monthlyContribution: Math.round(downPayment / dpMonths),
        active: false,
        progress: 0,
      })
    }

    /* ─── PRIORITY 4 · Retirement ────────────────────────────────────────── */
    const yearsToRetirement  = Math.max(65 - age, 5)
    const retirementTarget   = Math.round(avgMonthlyExp * 12 * 25)  // 4% rule
    const retMonths          = yearsToRetirement * 12
    // Future value compound factor (assume 7% annual return)
    const r = 0.07 / 12
    const fvFactor = ((Math.pow(1 + r, retMonths) - 1) / r)
    const retMonthly = fvFactor > 0 ? Math.round(retirementTarget / fvFactor) : Math.round(retirementTarget / retMonths)
    suggestions.push({
      id: 'goal_retirement',
      type: 'retirement',
      priority: 4,
      label: 'Retirement Fund',
      reason: `At ${age}, you need ${fmtM(retirementTarget)} by 65 (25× annual expenses, 4% rule). Start now — compounding does the heavy lifting.`,
      targetAmount: retirementTarget,
      targetDate: futureDate(retMonths),
      monthlyContribution: retMonthly,
      active: true,
      progress: 0,
    })

    /* ─── PRIORITY 5 · Education Fund ────────────────────────────────────── */
    if (dependents > 0) {
      const perChild     = 140_000  // est. 4-year college
      const eduTarget    = perChild * dependents
      const eduMonths    = 18 * 12  // assume young children
      suggestions.push({
        id: 'goal_education',
        type: 'education_fund',
        priority: 5,
        label: `Education Fund${dependents > 1 ? ` (${dependents} children)` : ''}`,
        reason: `~$140k per child × ${dependents}. 529 plans + early investing can cover most of this with time.`,
        targetAmount: eduTarget,
        targetDate: futureDate(eduMonths),
        monthlyContribution: Math.round(eduTarget / eduMonths),
        active: dependents > 0,
        progress: 0,
      })
    }

    /* ─── PRIORITY 6 · Investment Growth ─────────────────────────────────── */
    const activeMonthly   = suggestions.filter(s => s.active).reduce((s, g) => s + g.monthlyContribution, 0)
    const remainingSurplus = Math.max(surplus - activeMonthly, 0)
    const investMonthly   = Math.max(remainingSurplus, surplus > 0 ? Math.round(surplus * 0.2) : 200)
    const investTarget    = Math.round(investMonthly * 120 * 2.5)  // 10yr at ~7% growth est
    suggestions.push({
      id: 'goal_invest',
      type: 'investment_growth',
      priority: 6,
      label: 'Investment Growth',
      reason: `Invest your monthly surplus to build long-term wealth. Even $${investMonthly}/mo compounded over 10 years becomes ${fmtM(investTarget)}.`,
      targetAmount: investTarget,
      targetDate: futureDate(120),
      monthlyContribution: investMonthly,
      active: false,
      progress: 0,
    })

    /* ─── Feasibility pass ─────────────────────────────────────────────────── */
    const totalRequired = suggestions.filter(s => s.active).reduce((s, g) => s + g.monthlyContribution, 0)
    const feasible      = surplus >= totalRequired
    const gap           = Math.round(totalRequired - surplus)

    res.json({
      suggestions,
      context: {
        totalMonthly:   Math.round(totalMonthly),
        totalExpenses:  Math.round(avgMonthlyExp),
        surplus:        Math.round(surplus),
        totalRequired:  Math.round(totalRequired),
        feasible,
        gap,
      },
      profile,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

function fmtM(n) {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${Math.round(n / 1e3)}k`
  return `$${n}`
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

router.get('/', (req, res) => res.json(loadGoals()))

router.post('/', (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Expected array' })
  // Sanitize
  const clean = req.body.map(g => ({
    id:                  String(g.id || '').slice(0, 100),
    type:                String(g.type || '').slice(0, 50),
    priority:            Number(g.priority) || 99,
    label:               String(g.label || '').slice(0, 200),
    reason:              String(g.reason || '').slice(0, 500),
    targetAmount:        Number(g.targetAmount) || 0,
    targetDate:          String(g.targetDate || '').slice(0, 10),
    monthlyContribution: Number(g.monthlyContribution) || 0,
    active:              Boolean(g.active),
    progress:            Number(g.progress) || 0,
    meta:                g.meta || undefined,
    savedAt:             new Date().toISOString(),
  }))
  saveGoals(clean)
  res.status(201).json(clean)
})

router.put('/:id', (req, res) => {
  const id = req.params.id
  if (!/^[\w-]{1,100}$/.test(id)) return res.status(400).json({ error: 'Invalid id' })
  const goals = loadGoals()
  const idx   = goals.findIndex(g => g.id === id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  const b = req.body || {}
  const allowed = ['label','targetAmount','targetDate','monthlyContribution','active','progress']
  const patch = {}
  for (const k of allowed) {
    if (!(k in b)) continue
    if (['targetAmount','monthlyContribution','progress'].includes(k)) patch[k] = Number(b[k]) || 0
    else if (k === 'active') patch[k] = Boolean(b[k])
    else patch[k] = String(b[k]).slice(0, 200)
  }
  goals[idx] = { ...goals[idx], ...patch }
  saveGoals(goals)
  res.json(goals[idx])
})

router.delete('/:id', (req, res) => {
  const id = req.params.id
  if (!/^[\w-]{1,100}$/.test(id)) return res.status(400).json({ error: 'Invalid id' })
  saveGoals(loadGoals().filter(g => g.id !== id))
  res.json({ ok: true })
})

module.exports = router
