'use strict'

/**
 * WealthTrack Eval Runner
 *
 * Orchestrates eval runs:
 *   1. Calls the ReAct agent for each golden-dataset example
 *   2. Extracts tool observations as grounding context
 *   3. Runs the matching evaluators (groundedness / correctness / soundness / toolSelection)
 *   4. Logs each result as an EVALUATOR span to Arize Phoenix
 *   5. Saves a full results JSON to data/db/evalResults.json
 *
 * Architecture note from the design doc:
 *   "Eval only the LLM outputs."
 *   - Net worth, Sankey, math → deterministic, no eval
 *   - Copilot answers, stock verdict, goal advice → eval these
 */

const fs      = require('fs')
const path    = require('path')
const dataset = require('./goldenDataset')
const { groundedness, correctness, financialSoundness } = require('./evaluators')
const { SEMCONV } = require('../tracing')

let fetch
try { fetch = require('node-fetch') } catch { fetch = global.fetch }

const RESULTS_FILE = path.join(__dirname, '../../data/db/evalResults.json')
const AGENT_URL    = process.env.AGENT_URL || 'http://localhost:3000/api/react-agent/run'

// ── Arize Phoenix span logging ────────────────────────────────────────────────

const { trace, SpanStatusCode, ROOT_CONTEXT } = require('@opentelemetry/api')

function logEvalSpan(example, agentResult, scores) {
  let tracer
  try { tracer = trace.getTracer('wealthtrack-evals', '1.0.0') } catch { return }

  let span
  try {
    span = tracer.startSpan(`eval.${example.id}`, {}, ROOT_CONTEXT)

    const allScores  = Object.values(scores).map(s => s.score)
    const avgScore   = allScores.length
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length * 100) / 100
      : 0.5

    span.setAttributes({
      'openinference.span.kind':  'EVALUATOR',
      'eval.example_id':          example.id,
      'eval.category':            example.category,
      'eval.question':            example.question,
      'eval.answer':              String(agentResult.answer || '').slice(0, 2000),
      'eval.tools_used':          (agentResult.toolsUsed || []).join(','),
      'eval.model':               agentResult.model || '',
      'eval.overall_score':       avgScore,
      'eval.pass':                String(avgScore >= 0.7),
      [SEMCONV.INPUT_VALUE]:      example.question,
      [SEMCONV.OUTPUT_VALUE]:     String(agentResult.answer || '').slice(0, 2000),
      [SEMCONV.INPUT_MIME_TYPE]:  'text/plain',
      [SEMCONV.OUTPUT_MIME_TYPE]: 'text/plain',
    })

    if (scores.groundedness) {
      span.setAttributes({
        'eval.groundedness.score':       scores.groundedness.score,
        'eval.groundedness.explanation': scores.groundedness.explanation || '',
      })
    }
    if (scores.correctness) {
      span.setAttributes({
        'eval.correctness.score':         scores.correctness.score,
        'eval.correctness.explanation':   scores.correctness.explanation || '',
        'eval.correctness.keyword_score': scores.correctness.keywordScore ?? -1,
        'eval.correctness.llm_score':     scores.correctness.llmScore ?? -1,
      })
    }
    if (scores.soundness) {
      span.setAttributes({
        'eval.financial_soundness.score':       scores.soundness.score,
        'eval.financial_soundness.explanation': scores.soundness.explanation || '',
      })
    }
    if (scores.toolSelection) {
      span.setAttributes({
        'eval.tool_selection.score':       scores.toolSelection.score,
        'eval.tool_selection.explanation': scores.toolSelection.explanation || '',
      })
    }

    span.setStatus({ code: SpanStatusCode.OK })
  } catch (e) {
    if (span) span.setStatus({ code: SpanStatusCode.ERROR, message: e.message })
  } finally {
    if (span) span.end()
  }
}

// ── Call the ReAct agent ──────────────────────────────────────────────────────

async function callAgent(question) {
  try {
    const r = await fetch(AGENT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ question }),
      signal:  AbortSignal.timeout(90_000),
    })
    if (!r.ok) return { answer: '', steps: [], toolsUsed: [], error: `HTTP ${r.status}` }
    return await r.json()
  } catch (e) {
    return { answer: '', steps: [], toolsUsed: [], error: e.message }
  }
}

// ── Extract tool observations into a grounding context string ─────────────────

function extractContext(steps) {
  if (!Array.isArray(steps)) return ''
  return steps
    .filter(s => s.type === 'action' && s.observation)
    .map(s => `[${s.tool}]:\n${JSON.stringify(s.observation, null, 2)}`)
    .join('\n\n---\n\n')
}

// ── Score one example ─────────────────────────────────────────────────────────

async function scoreExample(example, agentResult) {
  const answer  = agentResult.answer || ''
  const context = extractContext(agentResult.steps)
  const types   = example.evalTypes || []
  const scores  = {}

  // Run evaluators concurrently where possible
  const tasks = []

  if (types.includes('groundedness')) {
    tasks.push(
      groundedness(example.question, context || 'No tool observations available.', answer)
        .then(r => { scores.groundedness = r })
    )
  }
  if (types.includes('correctness')) {
    tasks.push(
      correctness(example.question, answer, example)
        .then(r => { scores.correctness = r })
    )
  }
  if (types.includes('soundness')) {
    tasks.push(
      financialSoundness(example.question, answer)
        .then(r => { scores.soundness = r })
    )
  }

  await Promise.all(tasks)

  // Tool selection — deterministic code check, no LLM
  const toolsUsed    = agentResult.toolsUsed || []
  const expected     = example.expectedTools || []
  const correctly    = expected.filter(t => toolsUsed.includes(t))
  scores.toolSelection = {
    score: expected.length > 0 ? round(correctly.length / expected.length) : 1.0,
    explanation: expected.length === 0
      ? 'No expected tools defined.'
      : `Called ${correctly.length}/${expected.length} expected tools. ` +
        (correctly.length < expected.length
          ? `Missing: ${expected.filter(t => !toolsUsed.includes(t)).join(', ')}.`
          : 'All required tools called.'),
  }

  return scores
}

// ── Main eval runner ──────────────────────────────────────────────────────────

/**
 * Run the eval suite.
 *
 * @param {object} options
 * @param {string[]} [options.ids]        — run only these example IDs
 * @param {string[]} [options.categories] — run only these categories
 * @param {Function} [options.onProgress] — callback({ type, id, result? })
 * @returns {object} { summary, results, runAt }
 */
async function runEvals(options = {}) {
  const { ids, categories, onProgress } = options

  const examples = dataset.filter(ex => {
    if (ids       && !ids.includes(ex.id))             return false
    if (categories && !categories.includes(ex.category)) return false
    return true
  })

  const results = []
  let passed = 0
  let failed = 0

  for (const example of examples) {
    if (onProgress) onProgress({ type: 'start', id: example.id, question: example.question, total: examples.length })

    // Run agent
    const agentResult = await callAgent(example.question)

    // Score
    const scores = await scoreExample(example, agentResult)

    // Overall score = mean of all evaluator scores
    const allScores   = Object.values(scores).map(s => s.score)
    const overallScore = allScores.length
      ? round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : 0.5
    const pass = overallScore >= 0.7

    const result = {
      id:           example.id,
      category:     example.category,
      question:     example.question,
      answer:       (agentResult.answer || '').slice(0, 1200),
      toolsUsed:    agentResult.toolsUsed || [],
      scores,
      overallScore,
      pass,
      error:        agentResult.error || null,
      runAt:        new Date().toISOString(),
    }

    results.push(result)
    if (pass) passed++; else failed++

    // Log to Arize Phoenix
    logEvalSpan(example, agentResult, scores)

    if (onProgress) onProgress({ type: 'done', id: example.id, result })
  }

  // Build summary
  const summary = buildSummary(results, passed, failed)
  const output  = { summary, results, runAt: summary.runAt }

  // Persist to disk
  try {
    fs.mkdirSync(path.dirname(RESULTS_FILE), { recursive: true })
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(output, null, 2))
  } catch (e) {
    console.error('[evals] Failed to write results:', e.message)
  }

  return output
}

function buildSummary(results, passed, failed) {
  const byCategory = {}

  for (const r of results) {
    const cat = byCategory[r.category] || (byCategory[r.category] = { total: 0, passed: 0, scores: [] })
    cat.total++
    if (r.pass) cat.passed++
    cat.scores.push(r.overallScore)
  }

  for (const cat of Object.values(byCategory)) {
    cat.passRate = cat.total > 0 ? Math.round(cat.passed / cat.total * 100) : 0
    cat.avgScore = cat.scores.length
      ? round(cat.scores.reduce((a, b) => a + b, 0) / cat.scores.length)
      : 0
    delete cat.scores
  }

  const avgScore = results.length
    ? round(results.reduce((s, r) => s + r.overallScore, 0) / results.length)
    : 0

  return {
    total:      results.length,
    passed,
    failed,
    passRate:   results.length > 0 ? Math.round(passed / results.length * 100) : 0,
    avgScore,
    byCategory,
    runAt:      new Date().toISOString(),
  }
}

// ── Load last saved results ───────────────────────────────────────────────────

function loadLastResults() {
  try {
    if (fs.existsSync(RESULTS_FILE)) return JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'))
  } catch {}
  return null
}

function round(n) { return Math.round(n * 100) / 100 }

module.exports = { runEvals, loadLastResults }
