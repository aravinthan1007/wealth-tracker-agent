const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')

const DB = path.join(__dirname, '../../data/db')
if (!fs.existsSync(DB)) fs.mkdirSync(DB, { recursive: true })

const TOKEN_FILE = path.join(DB, 'googleTokens.json')

// GET /api/google/status — check if connected
router.get('/status', (req, res) => {
  const connected = fs.existsSync(TOKEN_FILE)
  res.json({ connected, message: connected ? 'Google account connected' : 'Not connected — use /api/google/connect' })
})

// GET /api/google/connect — redirect URI info (OAuth flow requires real credentials)
router.get('/connect', (req, res) => {
  res.json({
    status: 'setup_required',
    instructions: [
      '1. Create a Google Cloud project at console.cloud.google.com',
      '2. Enable Gmail API and Google Calendar API',
      '3. Create OAuth 2.0 credentials (Web application type)',
      '4. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env',
      '5. Restart backend and visit /api/google/auth to authenticate'
    ],
    envVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI']
  })
})

// GET /api/google/events — mock calendar events until OAuth is set up
router.get('/events', (req, res) => {
  const connected = fs.existsSync(TOKEN_FILE)
  if (!connected) {
    // Return mock data for demo
    const today = new Date()
    const events = [
      { id: '1', title: 'Chase Sapphire Payment Due', date: new Date(today.getFullYear(), today.getMonth(), 15).toISOString(), type: 'payment', amount: 35 },
      { id: '2', title: 'Amex Gold Payment Due', date: new Date(today.getFullYear(), today.getMonth(), 10).toISOString(), type: 'payment', amount: 84 },
      { id: '3', title: 'Citi Payment Due', date: new Date(today.getFullYear(), today.getMonth(), 20).toISOString(), type: 'payment', amount: 25 },
      { id: '4', title: 'Salary Deposit', date: new Date(today.getFullYear(), today.getMonth(), 1).toISOString(), type: 'income', amount: 8500 },
      { id: '5', title: 'Mortgage Payment', date: new Date(today.getFullYear(), today.getMonth(), 1).toISOString(), type: 'payment', amount: 2150 },
      { id: '6', title: 'Q2 Tax Filing', date: new Date(today.getFullYear(), today.getMonth() + 1, 15).toISOString(), type: 'deadline', amount: null }
    ]
    return res.json({ connected: false, mock: true, events })
  }
  // Real implementation would use Google Calendar API
  res.json({ connected: true, events: [], message: 'Google Calendar API integration pending OAuth setup' })
})

// GET /api/google/emails — mock Gmail finance summary
router.get('/emails', (req, res) => {
  const connected = fs.existsSync(TOKEN_FILE)
  if (!connected) {
    return res.json({
      connected: false,
      mock: true,
      emails: [
        { id: 'm1', subject: 'Your Chase statement is ready', from: 'no-reply@chase.com', date: new Date().toISOString(), amount: 2340.50, type: 'statement' },
        { id: 'm2', subject: 'Payment confirmation: $35.00', from: 'no-reply@chase.com', date: new Date(Date.now() - 86400000*2).toISOString(), amount: 35, type: 'payment' },
        { id: 'm3', subject: 'Amex: New charge $89.99 - AMAZON', from: 'no-reply@americanexpress.com', date: new Date(Date.now() - 86400000).toISOString(), amount: 89.99, type: 'charge' },
        { id: 'm4', subject: 'Direct Deposit: $8,500.00 credited', from: 'alerts@bofa.com', date: new Date(Date.now() - 86400000*5).toISOString(), amount: 8500, type: 'income' }
      ]
    })
  }
  res.json({ connected: true, emails: [], message: 'Gmail API integration pending OAuth setup' })
})

module.exports = router
