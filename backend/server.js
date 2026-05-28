require('dotenv').config()
const express = require('express')
const path = require('path')
const cors = require('cors')
const helmet = require('helmet')
const { rateLimit } = require('express-rate-limit')

const app = express()

// ── Security headers ────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false })) // CSP disabled: Vite handles it

// ── CORS: restrict to local dev origins only ────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173', // Vite preview
  'http://127.0.0.1:4173',
]
app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server (no origin) and whitelisted origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
    cb(new Error('CORS: origin not allowed'))
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// ── Global rate limit: 200 req / 15 min per IP ──────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
}))

// ── Tighter limit on stock quotes (hits external Yahoo Finance) ──────────────
app.use('/api/stocks', rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  message: { error: 'Stock quote rate limit exceeded.' },
}))

// ── Tighter limit on file upload ─────────────────────────────────────────────
app.use('/api/upload', rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  message: { error: 'Upload rate limit exceeded.' },
}))

app.use(express.json({ limit: '1mb' }))

// Serve static frontend ONLY — NOT the data/ directory
app.use(express.static(path.join(__dirname, '..', 'public')))

// agent API
app.use('/api/agents', require('./api/agentRoutes'))
app.use('/api/stocks', require('./api/stocksRoutes'))
app.use('/api/creditcards', require('./api/creditCardRoutes'))
app.use('/api/expenses', require('./api/expensesRoutes'))
app.use('/api/income', require('./api/incomeRoutes'))
app.use('/api/sheets', require('./api/sheetsRoutes'))
app.use('/api/upload', require('./api/uploadRoutes'))
app.use('/api/google', require('./api/googleRoutes'))
app.use('/api/perplexity', require('./api/perplexityRoutes'))
app.use('/api/react-agent', require('./api/reactAgentRoutes'))
app.use('/api/onboarding', require('./api/onboardingRoutes'))

// ── MongoDB: connect on startup (non-blocking, graceful fallback) ─────────────
require('./db/mongo').connect()

const PORT = process.env.PORT || 3000
app.listen(PORT, '0.0.0.0', (err)=>{
  if(err){
    console.error('Failed to start server', err)
    process.exit(1)
  }
  console.log('Server listening on', PORT)
})

// start scheduler (non-blocking). For demo purposes uses setInterval.
try{
  const scheduler = require('./scheduler/cronJobs')
  scheduler.scheduleJobs()
}catch(e){
  console.log('Scheduler not started:', e.message)
}
