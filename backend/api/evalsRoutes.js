'use strict'

/**
 * Eval API Routes
 *
 * GET  /api/evals/dataset      — view the golden dataset (examples + metadata)
 * GET  /api/evals/results      — last run results from disk
 * GET  /api/evals/status       — whether an eval is currently running
 * POST /api/evals/run          — trigger an eval run (SSE streaming)
 *   body: { ids?: string[], categories?: string[] }
 */

const express = require('express')
const router  = express.Router()
const dataset = require('../evals/goldenDataset')
const { runEvals, loadLastResults } = require('../evals/runner')

// Prevent concurrent eval runs
let runningEval = false

// ── GET /api/evals/dataset ────────────────────────────────────────────────────
router.get('/dataset', (_req, res) => {
  res.json({
    count:       dataset.length,
    categories:  [...new Set(dataset.map(e => e.category))],
    evalTypes:   [...new Set(dataset.flatMap(e => e.evalTypes))],
    examples:    dataset.map(e => ({
      id:           e.id,
      category:     e.category,
      evalTypes:    e.evalTypes,
      question:     e.question,
      expectedTools: e.expectedTools,
      mustContain:  e.mustContain,
      mustNotContain: e.mustNotContain,
      expectedFacts: e.expectedFacts,
      notes:        e.notes,
    })),
  })
})

// ── GET /api/evals/results ────────────────────────────────────────────────────
router.get('/results', (_req, res) => {
  const results = loadLastResults()
  if (!results) {
    return res.json({
      message: 'No eval results yet — run POST /api/evals/run to generate them.',
      results: null,
    })
  }
  res.json(results)
})

// ── GET /api/evals/status ─────────────────────────────────────────────────────
router.get('/status', (_req, res) => {
  res.json({ running: runningEval })
})

// ── POST /api/evals/run (SSE) ─────────────────────────────────────────────────
router.post('/run', async (req, res) => {
  if (runningEval) {
    return res.status(409).json({ error: 'An eval run is already in progress.' })
  }

  const { ids, categories } = req.body || {}

  // Validate filters
  if (ids && !Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' })
  if (categories && !Array.isArray(categories)) return res.status(400).json({ error: 'categories must be an array' })

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  runningEval = true

  const send = (data) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }
  }

  try {
    const total = ids
      ? ids.length
      : categories
        ? dataset.filter(e => categories.includes(e.category)).length
        : dataset.length

    send({ type: 'start', total })

    const output = await runEvals({
      ids,
      categories,
      onProgress: (event) => send(event),
    })

    send({ type: 'complete', summary: output.summary })
  } catch (e) {
    console.error('[evals/run] Error:', e.message)
    send({ type: 'error', message: e.message })
  } finally {
    runningEval = false
    if (!res.writableEnded) res.end()
  }
})

module.exports = router
