const express = require('express')
const router = express.Router()
const multer = require('multer')
const fs = require('fs')
const path = require('path')

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
    // Match lines like: "04/15/2026   AMAZON.COM   $89.99" or "04/15  STARBUCKS  12.50"
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

    // Extract totals
    const totalMatch = text.match(/(?:new balance|total amount due|statement balance)[:\s]+\$?([\d,]+\.\d{2})/i)
    const totalBalance = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : null
    const minMatch = text.match(/minimum payment[:\s]+\$?([\d,]+\.\d{2})/i)
    const minPayment = minMatch ? parseFloat(minMatch[1].replace(/,/g, '')) : null
    const dueMatch = text.match(/payment due date[:\s]+([\w\s,]+\d{4}|\d{2}\/\d{2}\/\d{4})/i)
    const dueDate = dueMatch ? dueMatch[1].trim() : null

    res.json({
      filename: req.file.filename,
      pages: data.numpages,
      parsed: { totalBalance, minPayment, dueDate, transactionCount: transactions.length, transactions: transactions.slice(0, 50) },
      text: text.slice(0, 3000)
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

module.exports = router
