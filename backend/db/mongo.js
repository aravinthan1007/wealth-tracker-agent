'use strict'

/**
 * MongoDB connection singleton.
 * If MONGODB_URI is not set the app continues with JSON-file fallback.
 */

const mongoose = require('mongoose')

let _connected = false

async function connect() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.log('[MongoDB] MONGODB_URI not set — running with JSON fallback')
    return false
  }
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
    })
    _connected = true
    console.log('[MongoDB] Connected to Atlas')
    // Take a net-worth snapshot on startup
    try { await NetWorthSnapshot.maybeSnapshot() } catch (_) {}
    return true
  } catch (err) {
    console.error('[MongoDB] Connection failed:', err.message, '— falling back to JSON files')
    return false
  }
}

function isConnected() {
  return _connected && mongoose.connection.readyState === 1
}

// ── Schemas ───────────────────────────────────────────────────────────────────

// Agent memory (replaces MCP memory:8004 + agentMemory.json)
const agentMemorySchema = new mongoose.Schema({
  key:       { type: String, required: true, unique: true, maxlength: 80 },
  value:     { type: String, required: true, maxlength: 2000 },
  agentId:   { type: String, default: 'financial-agent' },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true })

// KB articles (WealthTrack architecture + Dynatrace onboarding knowledge)
const kbArticleSchema = new mongoose.Schema({
  appName:       { type: String, required: true, index: true },
  title:         { type: String, required: true },
  content:       { type: String, required: true },  // JSON string or markdown
  contentType:   { type: String, enum: ['json', 'markdown'], default: 'json' },
  version:       { type: String, default: '1.0' },
  tags:          [String],
}, { timestamps: true })

// Expenses (replaces data/db/expenses.json)
const expenseSchema = new mongoose.Schema({
  id:          { type: String, required: true, unique: true },
  category:    { type: String, required: true, maxlength: 100 },
  amount:      { type: Number, required: true, min: 0 },
  date:        { type: String, required: true },  // YYYY-MM-DD
  description: { type: String, maxlength: 500 },
  type:        { type: String, required: true },  // housing, food, etc.
  recurring:   { type: Boolean, default: false },
}, { timestamps: true })

// Budget limits (replaces data/db/budgets.json)
const budgetSchema = new mongoose.Schema({
  housing:       { type: Number, default: 2500 },
  food:          { type: Number, default: 700 },
  utilities:     { type: Number, default: 300 },
  entertainment: { type: Number, default: 150 },
  health:        { type: Number, default: 100 },
  transport:     { type: Number, default: 200 },
  insurance:     { type: Number, default: 250 },
  other:         { type: Number, default: 300 },
}, { timestamps: true })

// Income sources (replaces data/db/income.json)
const incomeSchema = new mongoose.Schema({
  id:        { type: String, required: true, unique: true },
  label:     { type: String, required: true, maxlength: 200 },
  amount:    { type: Number, required: true, min: 0 },
  frequency: { type: String, enum: ['monthly', 'annual', 'quarterly', 'biweekly', 'weekly'], default: 'monthly' },
  type:      { type: String, required: true, maxlength: 100 },
  taxable:   { type: Boolean, default: true },
  active:    { type: Boolean, default: true },
}, { timestamps: true })

// Credit cards (replaces data/db/creditCards.json)
const creditCardSchema = new mongoose.Schema({
  id:         { type: String, required: true, unique: true },
  name:       { type: String, required: true, maxlength: 100 },
  bank:       { type: String, maxlength: 100 },
  last4:      { type: String, maxlength: 4 },
  limit:      { type: Number, min: 0 },
  balance:    { type: Number, min: 0 },
  minPayment: { type: Number, min: 0 },
  dueDate:    { type: String },
  apr:        { type: Number, min: 0 },
  rewards:    { type: String, maxlength: 200 },
  color:      { type: String, default: '#6366f1' },
}, { timestamps: true })

// User profile (replaces data/db/profile.json)
const userProfileSchema = new mongoose.Schema({
  name:           { type: String, maxlength: 200 },
  email:          { type: String, maxlength: 200 },
  occupation:     { type: String, maxlength: 200 },
  annualSalary:   { type: Number, min: 0 },
  taxRate:        { type: Number, min: 0, max: 100 },
  currency:       { type: String, default: 'USD', maxlength: 10 },
  riskProfile:    { type: String, default: 'moderate' },
  investmentGoal: { type: String, default: 'growth' },
  retirementAge:  { type: Number, default: 65 },
  onboarded:      { type: Boolean, default: false },
}, { timestamps: true })

// Stock portfolio (replaces data/mockStocks.json)
const portfolioSchema = new mongoose.Schema({
  symbol:    { type: String, required: true, unique: true, maxlength: 10 },
  shares:    { type: Number, required: true, min: 0 },
  price:     { type: Number, required: true, min: 0 },
  change:    { type: Number, default: 0 },
  changePercent: { type: Number, default: 0 },
}, { timestamps: true })

// Liabilities: mortgages + loans (replaces mockMortgage.json + mockLoans.json)
const liabilitySchema = new mongoose.Schema({
  id:        { type: String, required: true, unique: true },
  type:      { type: String, enum: ['mortgage', 'personal_loan', 'student_loan', 'auto_loan', 'other'], required: true },
  label:     { type: String, maxlength: 200 },
  balance:   { type: Number, required: true, min: 0 },
  rate:      { type: Number, min: 0 },       // APR %
  payment:   { type: Number, min: 0 },       // monthly payment
}, { timestamps: true })

// Savings accounts (replaces data/mockSavings.json)
const savingsAccountSchema = new mongoose.Schema({
  id:      { type: String, required: true, unique: true },
  label:   { type: String, maxlength: 200 },
  bank:    { type: String, maxlength: 100 },
  balance: { type: Number, required: true, min: 0 },
  apy:     { type: Number, default: 0, min: 0 },
}, { timestamps: true })

// Net worth snapshots — time-series for trend charts
const netWorthSnapshotSchema = new mongoose.Schema({
  date:             { type: String, required: true, index: true }, // YYYY-MM-DD
  netWorth:         { type: Number, required: true },
  totalAssets:      { type: Number },
  totalLiabilities: { type: Number },
  stockPortfolio:   { type: Number },
  savingsAccounts:  { type: Number },
}, { timestamps: true })

// Financial goals
const financialGoalSchema = new mongoose.Schema({
  name:      { type: String, required: true, maxlength: 200 },
  target:    { type: Number, required: true, min: 0 },
  current:   { type: Number, default: 0, min: 0 },
  deadline:  { type: String },     // YYYY-MM-DD
  category:  { type: String, maxlength: 100 },
  notes:     { type: String, maxlength: 1000 },
  achieved:  { type: Boolean, default: false },
}, { timestamps: true })

// Agent sessions — full ReAct conversation history
const agentSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  agentId:   { type: String, default: 'financial-agent' },
  question:  { type: String, required: true },
  steps:     [{
    type: { type: String, enum: ['thought', 'action', 'observation', 'answer'] },
    content: String,
    tool: String,
    args: String,
    timestamp: { type: Date, default: Date.now },
  }],
  answer:    { type: String },
  duration:  { type: Number },   // ms
  model:     { type: String },
}, { timestamps: true })

// ── Models ────────────────────────────────────────────────────────────────────

const AgentMemory      = mongoose.model('AgentMemory',      agentMemorySchema)
const KbArticle        = mongoose.model('KbArticle',        kbArticleSchema)
const Expense          = mongoose.model('Expense',          expenseSchema)
const Budget           = mongoose.model('Budget',           budgetSchema)
const Income           = mongoose.model('Income',           incomeSchema)
const CreditCard       = mongoose.model('CreditCard',       creditCardSchema)
const UserProfile      = mongoose.model('UserProfile',      userProfileSchema)
const Portfolio        = mongoose.model('Portfolio',        portfolioSchema)
const Liability        = mongoose.model('Liability',        liabilitySchema)
const SavingsAccount   = mongoose.model('SavingsAccount',   savingsAccountSchema)
const NetWorthSnapshot = mongoose.model('NetWorthSnapshot', netWorthSnapshotSchema)
const FinancialGoal    = mongoose.model('FinancialGoal',    financialGoalSchema)
const AgentSession     = mongoose.model('AgentSession',     agentSessionSchema)

// Attach helper to NetWorthSnapshot
NetWorthSnapshot.maybeSnapshot = async function () {
  const today = new Date().toISOString().slice(0, 10)
  const exists = await this.findOne({ date: today })
  if (exists) return
  // Compute from current data
  const [stocks, savings, liabilities] = await Promise.all([
    Portfolio.find(),
    SavingsAccount.find(),
    Liability.find(),
  ])
  const stockValue   = stocks.reduce((s, x) => s + x.price * x.shares, 0)
  const savingsValue = savings.reduce((s, x) => s + x.balance, 0)
  const totalAssets  = stockValue + savingsValue
  const totalLiab    = liabilities.reduce((s, x) => s + x.balance, 0)
  await this.create({
    date: today,
    netWorth:         Math.round(totalAssets - totalLiab),
    totalAssets:      Math.round(totalAssets),
    totalLiabilities: Math.round(totalLiab),
    stockPortfolio:   Math.round(stockValue),
    savingsAccounts:  Math.round(savingsValue),
  })
}

module.exports = {
  connect,
  isConnected,
  // Models
  AgentMemory,
  KbArticle,
  Expense,
  Budget,
  Income,
  CreditCard,
  UserProfile,
  Portfolio,
  Liability,
  SavingsAccount,
  NetWorthSnapshot,
  FinancialGoal,
  AgentSession,
}
