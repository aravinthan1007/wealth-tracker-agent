const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')

const DB = path.join(__dirname, '../../data/db')
const TOKEN_FILE = path.join(DB, 'googleTokens.json')

// Lazy-load googleapis
function getGoogleAuth() {
  const { google } = require('googleapis')
  const creds = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google/callback',
  }
  if (!creds.clientId || !creds.clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET not set in environment')
  }
  const auth = new google.auth.OAuth2(creds.clientId, creds.clientSecret, creds.redirectUri)
  if (fs.existsSync(TOKEN_FILE)) {
    const tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'))
    auth.setCredentials(tokens)
  }
  return auth
}

function readJson(name) {
  try { return JSON.parse(fs.readFileSync(path.join(DB, name), 'utf8')) } catch { return [] }
}

// GET /api/sheets/status — check if Sheets is configured
router.get('/status', (req, res) => {
  const hasEnv = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  const hasToken = fs.existsSync(TOKEN_FILE)
  res.json({
    configured: hasEnv,
    authenticated: hasToken,
    message: !hasEnv ? 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env'
      : !hasToken ? 'Not authenticated — connect Google via /api/google/connect'
      : 'Ready to sync',
  })
})

// POST /api/sheets/export
// Body: { sheetId: "...", sheetName: "WealthTrack" }
// Exports income, expenses, credit cards to a Google Sheet
router.post('/export', async (req, res) => {
  const { sheetId, sheetName = 'WealthTrack' } = req.body || {}
  if (!sheetId) return res.status(400).json({ error: 'sheetId required' })

  let auth
  try { auth = getGoogleAuth() } catch(e) {
    return res.status(503).json({ error: e.message, setup: true })
  }

  try {
    const { google } = require('googleapis')
    const sheets = google.sheets({ version: 'v4', auth })

    // Read all data
    const income = readJson('income.json').filter(i => i.active)
    const expenses = readJson('expenses.json')
    const cards = readJson('creditCards.json')

    const now = new Date().toLocaleDateString()

    // Build rows for each sheet tab
    const incomeRows = [
      ['Type', 'Label', 'Amount', 'Frequency', 'Monthly Equiv', 'Taxable', 'Start Date'],
      ...income.map(i => {
        const toMonthly = { annual: i.amount/12, quarterly: i.amount/3, weekly: i.amount*4.33, biweekly: i.amount*2.17 }
        const m = toMonthly[i.frequency] ?? i.amount
        return [i.type, i.label, i.amount, i.frequency, m.toFixed(2), i.taxable ? 'Yes' : 'No', i.startDate]
      }),
    ]

    const expenseRows = [
      ['Date', 'Category', 'Description', 'Amount', 'Merchant', 'Account'],
      ...expenses.map(e => [e.date, e.category, e.description || '', e.amount, e.merchant || '', e.account || '']),
    ]

    const cardRows = [
      ['Card Name', 'Last 4', 'Balance', 'Limit', 'Utilization %', 'APR', 'Due Date'],
      ...cards.map(c => [c.name, c.lastFour || '', c.balance, c.limit, c.limit ? ((c.balance/c.limit)*100).toFixed(1)+'%' : '', c.apr || '', c.dueDate || '']),
    ]

    // Helper to update a named range/sheet tab
    async function writeTab(title, rows) {
      try {
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `${title}!A1`,
          valueInputOption: 'RAW',
          requestBody: { values: rows },
        })
      } catch(err) {
        // Try creating the sheet tab first if it doesn't exist
        if (err.code === 400) {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: sheetId,
            requestBody: { requests: [{ addSheet: { properties: { title } } }] },
          })
          await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: `${title}!A1`,
            valueInputOption: 'RAW',
            requestBody: { values: rows },
          })
        } else throw err
      }
    }

    await writeTab('Income', incomeRows)
    await writeTab('Expenses', expenseRows)
    await writeTab('Credit Cards', cardRows)

    // Summary tab
    const totalMonthlyIncome = income.reduce((s, i) => {
      const m = { annual: i.amount/12, quarterly: i.amount/3, weekly: i.amount*4.33, biweekly: i.amount*2.17 }
      return s + (m[i.frequency] ?? i.amount)
    }, 0)
    const totalDebt = cards.reduce((s, c) => s + (c.balance || 0), 0)
    const summaryRows = [
      ['WealthTrack Summary', `Exported: ${now}`],
      [],
      ['Metric', 'Value'],
      ['Monthly Income', `$${totalMonthlyIncome.toFixed(2)}`],
      ['Annual Income', `$${(totalMonthlyIncome*12).toFixed(2)}`],
      ['Total Credit Card Debt', `$${totalDebt.toFixed(2)}`],
      ['Expense Entries', expenses.length],
    ]
    await writeTab(sheetName, summaryRows)

    res.json({ ok: true, tabs: ['Income', 'Expenses', 'Credit Cards', sheetName], exportedAt: now })
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/sheets/import-expenses
// Reads expenses from a Google Sheet tab and imports to local DB
router.post('/import-expenses', async (req, res) => {
  const { sheetId, range = 'Expenses!A2:F500' } = req.body || {}
  if (!sheetId) return res.status(400).json({ error: 'sheetId required' })

  let auth
  try { auth = getGoogleAuth() } catch(e) {
    return res.status(503).json({ error: e.message })
  }

  try {
    const { google } = require('googleapis')
    const sheets = google.sheets({ version: 'v4', auth })
    const resp = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range })
    const rows = resp.data.values || []

    const expensesFile = path.join(DB, 'expenses.json')
    const existing = JSON.parse(fs.readFileSync(expensesFile, 'utf8') || '[]')
    const imported = rows.filter(r => r[0] && r[3]).map(r => ({
      id: Date.now().toString() + Math.random(),
      date: r[0],
      category: r[1] || 'Other',
      description: r[2] || '',
      amount: parseFloat(r[3]) || 0,
      merchant: r[4] || '',
      account: r[5] || '',
    }))

    const merged = [...existing, ...imported]
    fs.writeFileSync(expensesFile, JSON.stringify(merged, null, 2))
    res.json({ imported: imported.length, total: merged.length })
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
