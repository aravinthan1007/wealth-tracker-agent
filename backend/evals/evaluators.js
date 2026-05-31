'use strict'

/**
 * WealthTrack Eval Evaluators — Gemini-as-judge for LLM outputs.
 *
 * Three evaluators, matching the architectural principle:
 *   generative layer → Gemini + evals
 *   analytical layer → deterministic code + unit tests
 *
 * groundedness     — is the answer supported by tool data? (no hallucination)
 * correctness      — does the answer contain the expected facts?
 * financialSoundness — does the advice follow sound financial principles?
 */

const { GoogleGenerativeAI } = require('@google/generative-ai')

// ── Gemini judge setup ────────────────────────────────────────────────────────

function getJudgeModel() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set — cannot run LLM-as-judge evaluators')
  const genai = new GoogleGenerativeAI(apiKey)
  return genai.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    generationConfig: { temperature: 0.05, maxOutputTokens: 350 },
  })
}

async function judgeWithGemini(prompt) {
  const model = getJudgeModel()
  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()

  // Extract JSON object from response (model sometimes adds markdown fences)
  const jsonMatch = text.match(/\{[\s\S]*?\}/)
  if (!jsonMatch) return { score: 0.5, explanation: text.slice(0, 300) }
  try {
    const parsed = JSON.parse(jsonMatch[0])
    return {
      score:       typeof parsed.score === 'number' ? parsed.score : 0.5,
      explanation: String(parsed.explanation || '').slice(0, 400),
    }
  } catch {
    return { score: 0.5, explanation: text.slice(0, 300) }
  }
}

// ── Evaluator 1: Groundedness ─────────────────────────────────────────────────

/**
 * Checks that every factual claim in the answer is supported by the tool
 * observations retrieved during the agent run.  A grounded answer adds no
 * numbers, names, or percentages that aren't in the context.
 *
 * @param {string} question  — original user question
 * @param {string} context   — concatenated tool observations (JSON strings)
 * @param {string} answer    — agent's final answer
 * @returns {{ score: number, explanation: string }}
 */
async function groundedness(question, context, answer) {
  const prompt = `You are an evaluation judge for a financial AI assistant. Your job is to verify that the answer is fully grounded in the provided tool data — no hallucinated numbers, names, or claims.

QUESTION: ${question}

TOOL DATA (what the agent actually retrieved):
${context.slice(0, 3000)}

AGENT ANSWER:
${answer.slice(0, 1500)}

SCORING GUIDE (0.0 – 1.0):
1.0 — Every factual claim is directly supported by the tool data
0.8 — Mostly supported; minor, obviously correct extrapolations (e.g. rounding a sum)
0.5 — Some claims not traceable to tool data
0.2 — Key numbers differ from tool data or are invented
0.0 — Answer contradicts tool data or fabricates facts entirely

CRITICAL: Be strict about financial numbers. If the answer states a specific dollar amount, percentage, or account name not present in the tool data, score below 0.5.

Respond with ONLY valid JSON (no markdown): {"score": <0.0-1.0>, "explanation": "<2–3 sentences explaining your verdict>"}`

  try {
    const result = await judgeWithGemini(prompt)
    return {
      score:       clamp(result.score),
      explanation: result.explanation,
    }
  } catch (e) {
    return { score: 0.5, explanation: `Evaluator error: ${e.message}` }
  }
}

// ── Evaluator 2: Correctness ──────────────────────────────────────────────────

/**
 * Blends two checks:
 *   1. Fast code check — mustContain / mustNotContain keyword matching (40% weight)
 *   2. LLM semantic check — Gemini judges against expectedFacts description (60% weight)
 *
 * @param {string} question
 * @param {string} answer
 * @param {object} example  — golden dataset entry with mustContain, mustNotContain, expectedFacts
 * @returns {{ score: number, explanation: string, keywordScore: number, llmScore: number|null }}
 */
async function correctness(question, answer, example) {
  const lower = answer.toLowerCase()

  // Fast keyword check
  const missingRequired = (example.mustContain || []).filter(kw => !lower.includes(kw.toLowerCase()))
  const presentForbidden = (example.mustNotContain || []).filter(kw => lower.includes(kw.toLowerCase()))

  const keywordScore =
    presentForbidden.length > 0 ? 0.0
    : missingRequired.length === 0 ? 1.0
    : Math.max(0, 1 - missingRequired.length / Math.max(1, (example.mustContain || []).length))

  // If forbidden phrases found → immediate fail, no need to call LLM
  if (presentForbidden.length > 0) {
    return {
      score:        0.0,
      explanation:  `Contains forbidden claim(s): "${presentForbidden.join('", "')}". These are factually incorrect for this question.`,
      keywordScore: 0.0,
      llmScore:     null,
    }
  }

  // LLM semantic check
  if (!process.env.GEMINI_API_KEY) {
    return {
      score:        keywordScore,
      explanation:  `Keyword check: ${missingRequired.length === 0 ? 'PASS' : `missing "${missingRequired.join('", "')}"`}`,
      keywordScore,
      llmScore:     null,
    }
  }

  const prompt = `You are an evaluation judge for a financial AI assistant.

QUESTION: ${question}

WHAT THE CORRECT ANSWER SHOULD CONTAIN:
${example.expectedFacts}

AGENT ANSWER:
${answer.slice(0, 1500)}

Does the agent's answer correctly address the key facts described above?

SCORING (0.0 – 1.0):
1.0 — Correct on all key facts
0.7 — Mostly correct, minor omissions acceptable
0.4 — Partial — misses important facts or gets some wrong
0.0 — Incorrect, contradicts expected facts

Respond with ONLY valid JSON: {"score": <0.0-1.0>, "explanation": "<2 sentence verdict>"}`

  try {
    const llmResult = await judgeWithGemini(prompt)
    const llmScore  = clamp(llmResult.score)
    const blended   = round(keywordScore * 0.4 + llmScore * 0.6)

    return {
      score:        blended,
      explanation:  llmResult.explanation,
      keywordScore,
      llmScore,
    }
  } catch (e) {
    return {
      score:        keywordScore,
      explanation:  `LLM judge error: ${e.message}`,
      keywordScore,
      llmScore:     null,
    }
  }
}

// ── Evaluator 3: Financial Soundness ─────────────────────────────────────────

/**
 * LLM-as-judge: evaluates whether advice follows sound financial planning
 * principles including goal sequencing, risk disclosure, and accuracy.
 *
 * Only applied to advice-generating outputs (category: soundness).
 * Deterministic math outputs (net worth, Sankey) are NEVER sent here.
 *
 * @param {string} question
 * @param {string} answer
 * @returns {{ score: number, explanation: string }}
 */
async function financialSoundness(question, answer) {
  const prompt = `You are a senior Certified Financial Planner (CFP) evaluating an AI financial assistant's advice for soundness.

QUESTION: ${question}

AI ASSISTANT'S ANSWER:
${answer.slice(0, 1500)}

Evaluate against these five criteria:

1. SEQUENCING — follows the correct priority waterfall:
   emergency fund → high-APR debt payoff → retirement investing → wealth building

2. DISCLAIMERS — includes appropriate caveat that this is not personalized financial advice
   and/or recommends consulting a licensed professional

3. NO RECKLESS ADVICE — does not recommend speculation, extreme concentration in single assets,
   ignoring existing debt, or guaranteed-return claims

4. FINANCIAL ACCURACY — uses correct principles: compound interest, APR impact,
   diversification benefits, inflation, sequence-of-returns risk, etc.

5. COMPLETENESS — addresses the actual question without critical omissions

SCORING (0.0 – 1.0):
1.0 — Excellent: all principles met, appropriate disclaimers, sound sequencing
0.8 — Good: sound advice with minor gaps (e.g., missing disclaimer but otherwise correct)
0.6 — Acceptable: correct direction but missing important context
0.4 — Concerning: advice could mislead without correction
0.0 — Dangerous: reckless or factually incorrect financial guidance

Respond with ONLY valid JSON: {"score": <0.0-1.0>, "explanation": "<3 sentences covering key strengths and any gaps>"}`

  try {
    const result = await judgeWithGemini(prompt)
    return {
      score:       clamp(result.score),
      explanation: result.explanation,
    }
  } catch (e) {
    return { score: 0.5, explanation: `Evaluator error: ${e.message}` }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(n) { return Math.max(0, Math.min(1, typeof n === 'number' ? n : 0.5)) }
function round(n)  { return Math.round(n * 100) / 100 }

module.exports = { groundedness, correctness, financialSoundness }
