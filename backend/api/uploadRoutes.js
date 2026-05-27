const express = require('express')
const router = express.Router()
const multer = require('multer')
const fs = require('fs')
const path = require('path')

let fetch
try { fetch = require('node-fetch') } catch(e) { fetch = global.fetch }

const UPLOAD_DIR = path.join(__dirname, '../../data/uploads')
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
})
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true)
    else cb(new Error('Only PDF files allowed'))
  }
})

// ── LLM analysis: tries Ollama first, then OpenAI ─────────────────────────
async function analyzePdfWithLLM(text) {
  const prompt = `You are a financial data extraction assistant. Extract structured data from the following bank/credit card statement text.

Return a JSON object with this exact structure (use null for missing values):
{
  "statementType": "credit_card|bank|brokerage|other",
  "accountHolder": "name or null",
  "accountLast4": "last 4 digits or null",
  "statementPeriod": { "from": "YYYY-MM-DD or null", "to": "YYYY-MM-DD or null" },
  "openingBalance": number_or_null,
  "closingBalance": number_or_null,
  "totalDebits": number_or_null,
  "totalCredits": number_or_null,
  "minimumPayment": number_or_null,
  "paymentDueDate": "YYYY-MM-DD or null",
  "transactions": [
    { "date": "YYYY-MM-DD", "description": "...", "amount": number, "type": "debit|credit", "category": "Food|Shopping|Travel|Utilities|Healthcare|Income|Transfer|Other" }
  ],
  "summary": "2-sentence plain-English summary of this statement"
}

Only return the JSON. No markdown, no explanation.

STATEMENT TEXT:
${text.slice(0, 6000)}`

  // Try Ollama (local, free)
  try {
    const r = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        messages: [{ role: 'user', content: prompt }],
        stream: false,
      }),
      timeout: 30000,
    })
    if (r.ok) {
      const d = await r.json()
      const content = d?.message?.content || d?.response || ''
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return { ...parsed, llm: 'ollama:llama3.2' }
      }
    }
  } catch(e) { /* Ollama not running — try OpenAI */ }

  // Try OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0,
          response_format: { type: 'json_object' },
        }),
        timeout: 30000,
      })
      if (r.ok) {
        const d = await r.json()
        const content = d?.choices?.[0]?.message?.content || ''
        const parsed = JSON.parse(content)
        return { ...parsed, llm: 'openai:gpt-4o-mini' }
      }
    } catch(e) { /* ignore */ }
  }

  return null // no LLM available
}

// POST /api/upload/statement
router.post('/statement', upload.single('statement'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  try {
    let pdfParse = null
    try { pdfParse = require('pdf-parse') } catch(e) {}
    if (!pdfParse) {
      return res.json({ filename: req.file.filename, text: null, parsed: null, message: 'pdf-parse not available' })
    }
    const buffer = fs.readFileSync(req.file.path)
    const data = await pdfParse(buffer)
    const text = data.text

    // Heuristic line-by-line parser for common credit card statement patterns
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    const transactions = []
    const txRegex = /(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\s+(.+?)\s+\$?([\d,]+\.\d{2})\s*(?:CR)?$/
    lines.forEach(line => {
      const m = line.match(txRegex)
      if (m) {
        const amount = parseFloat(m[3].replace(/,/g, ''))
        if (!isNaN(amount) && amount > 0 && amount < 50000) {
          transactions.push({ date: m[1], description: m[2].trim(), amount })
        }
      }
    })

    const totalMatch = text.match(/(?:new balance|total amount due|statement balance)[:\s]+\$?([\d,]+\.\d{2})/i)
    const totalBalance = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : null
    const minMatch = text.match(/minimum payment[:\s]+\$?([\d,]+\.\d{2})/i)
    const minPayment = minMatch ? parseFloat(minMatch[1].replace(/,/g, '')) : null
    const dueMatch = text.match(/payment due date[:\s]+([\w\s,]+\d{4}|\d{2}\/\d{2}\/\d{4})/i)
    const dueDate = dueMatch ? dueMatch[1].trim() : null

    // Try LLM analysis (non-blocking — if it fails, heuristic result is still returned)
    let llmResult = null
    try { llmResult = await analyzePdfWithLLM(text) } catch(e) {}

    res.json({
      filename: req.file.filename,
      pages: data.numpages,
      parsed: {
        totalBalance, minPayment, dueDate,
        transactionCount: transactions.length,
        transactions: transactions.slice(0, 50),
      },
      llm: llmResult,   // null if Ollama and OpenAI both unavailable
      text: text.slice(0, 3000),
    })
  } catch (e) {
    res.status(500).json({ error: e.message, filename: req.file?.filename })
  }
})

// GET /api/upload/statements — list uploaded files
router.get('/statements', (req, res) => {
  const files = fs.readdirSync(UPLOAD_DIR).map(f => {
    const stat = fs.statSync(path.join(UPLOAD_DIR, f))
    return { filename: f, size: stat.size, uploaded: stat.mtime }
  })
  res.json(files)
})

// GET /api/upload/llm-status — check which LLM backend is available
router.get('/llm-status', async (req, res) => {
  const status = { ollama: false, openai: false, ollamaModels: [] }
  try {
    const r = await fetch('http://localhost:11434/api/tags', { timeout: 3000 })
    if (r.ok) {
      const d = await r.json()
      status.ollama = true
      status.ollamaModels = (d.models || []).map(m => m.name)
    }
  } catch(e) {}
  status.openai = !!process.env.OPENAI_API_KEY
  res.json(status)
})

module.exports = router
