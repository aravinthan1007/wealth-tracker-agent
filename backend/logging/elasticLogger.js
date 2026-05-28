'use strict'

/**
 * Elasticsearch structured logger.
 * Logs MCP calls, agent steps, and app events to Elasticsearch indices.
 * Gracefully degrades when ES is unavailable.
 */

const { Client } = require('@elastic/elasticsearch')

let client = null
let available = false

function init() {
  const url = process.env.ELASTICSEARCH_URL
  if (!url) {
    console.log('[Elastic] ELASTICSEARCH_URL not set — logging disabled')
    return
  }
  try {
    const opts = { node: url }
    if (process.env.ELASTICSEARCH_API_KEY) {
      opts.auth = { apiKey: process.env.ELASTICSEARCH_API_KEY }
    }
    client = new Client(opts)
    available = true
    console.log('[Elastic] Logger initialised →', url)
  } catch (e) {
    console.error('[Elastic] Init failed:', e.message)
  }
}

async function log(index, doc) {
  if (!available || !client) return
  try {
    await client.index({
      index,
      document: { '@timestamp': new Date().toISOString(), ...doc },
    })
  } catch (_) {
    // Silent fail — never crash the app because of logging
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Log an MCP tool call (yahoo, duckduckgo, fetcher, memory, phoenix, dynatrace) */
async function logMcpCall({ tool, args, durationMs, resultSize, agentId, success, error }) {
  return log('mcp-calls', {
    tool:       String(tool || '').slice(0, 100),
    args:       typeof args === 'string' ? args.slice(0, 500) : JSON.stringify(args || '').slice(0, 500),
    durationMs: Number(durationMs) || 0,
    resultSize: Number(resultSize) || 0,
    agentId:    agentId || 'unknown',
    success:    success !== false,
    error:      error ? String(error).slice(0, 500) : null,
  })
}

/** Log a single ReAct agent step (thought / action / observation / answer) */
async function logAgentStep({ sessionId, agentId, stepType, stepNum, content, tool, args, durationMs }) {
  return log('agent-steps', {
    sessionId: sessionId || 'unknown',
    agentId:   agentId || 'financial-agent',
    stepType:  stepType || 'unknown',  // thought | action | observation | answer
    stepNum:   Number(stepNum) || 0,
    content:   typeof content === 'string' ? content.slice(0, 2000) : String(content || '').slice(0, 2000),
    tool:      tool || null,
    args:      args ? String(args).slice(0, 500) : null,
    durationMs: Number(durationMs) || 0,
  })
}

/** Log a Dynatrace MCP HTTPS call */
async function logDtMcpCall({ tool, query, durationMs, status, responseSize, error }) {
  return log('dt-mcp-calls', {
    tool:         String(tool || '').slice(0, 100),
    query:        typeof query === 'string' ? query.slice(0, 1000) : null,
    durationMs:   Number(durationMs) || 0,
    httpStatus:   Number(status) || 0,
    responseSize: Number(responseSize) || 0,
    success:      !error && status >= 200 && status < 300,
    error:        error ? String(error).slice(0, 500) : null,
  })
}

/** Log a generic application event */
async function logAppEvent({ event, level, message, metadata }) {
  return log('app-logs', {
    event:    String(event || 'generic').slice(0, 100),
    level:    level || 'INFO',
    message:  typeof message === 'string' ? message.slice(0, 2000) : String(message || ''),
    metadata: metadata ? JSON.stringify(metadata).slice(0, 1000) : null,
  })
}

/** Check if Elasticsearch is available */
async function isAvailable() {
  if (!available || !client) return false
  try {
    await client.ping()
    return true
  } catch (_) {
    return false
  }
}

// Initialise on module load
init()

module.exports = { logMcpCall, logAgentStep, logDtMcpCall, logAppEvent, isAvailable }
