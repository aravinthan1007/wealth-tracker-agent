'use strict'

/**
 * Dynatrace MCP HTTP Client
 * Connects to Dynatrace MCP Gateway via HTTPS (not stdio).
 * Endpoint: https://{DT_ENVIRONMENT_URL}/platform-reserved/mcp-gateway/v0.1/servers/dynatrace-mcp/mcp
 *
 * Requires:
 *   DT_ENVIRONMENT_URL = https://{env}.apps.dynatrace.com
 *   DT_API_TOKEN       = dt0...  (Platform Token)
 */

let fetch
try { fetch = require('node-fetch') } catch { fetch = global.fetch }

const { logDtMcpCall } = require('../logging/elasticLogger')

class DynatraceMcpClient {
  constructor() {
    this._url = null
    this._token = null
    this._requestId = 1
    this._init()
  }

  _init() {
    const envUrl = process.env.DT_ENVIRONMENT_URL
    const token  = process.env.DT_API_TOKEN
    if (!envUrl || !token) {
      console.log('[DynatraceMCP] DT_ENVIRONMENT_URL or DT_API_TOKEN not set — Dynatrace MCP disabled')
      return
    }
    const base = envUrl.replace(/\/$/, '')
    this._url   = `${base}/platform-reserved/mcp-gateway/v0.1/servers/dynatrace-mcp/mcp`
    this._token = token
    console.log('[DynatraceMCP] Configured →', this._url)
  }

  isConfigured() {
    return !!(this._url && this._token)
  }

  /** Send a JSON-RPC request to Dynatrace MCP */
  async _rpc(method, params = {}) {
    if (!this.isConfigured()) {
      return { error: 'Dynatrace MCP not configured. Set DT_ENVIRONMENT_URL and DT_API_TOKEN in .env' }
    }

    const reqId = this._requestId++
    const body = {
      jsonrpc: '2.0',
      id: reqId,
      method,
      params,
    }

    const t0 = Date.now()
    try {
      const res = await fetch(this._url, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${this._token}`,
          'Accept':        'application/json',
        },
        body:   JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      })

      const duration = Date.now() - t0
      const text = await res.text()
      let json
      try { json = JSON.parse(text) } catch { json = { result: text } }

      await logDtMcpCall({
        tool:         method,
        query:        params?.arguments?.query || params?.arguments?.message || null,
        durationMs:   duration,
        status:       res.status,
        responseSize: text.length,
        error:        !res.ok ? `HTTP ${res.status}` : null,
      })

      if (!res.ok) {
        return { error: `Dynatrace MCP HTTP ${res.status}: ${text.slice(0, 300)}` }
      }

      return json?.result ?? json
    } catch (e) {
      const duration = Date.now() - t0
      await logDtMcpCall({ tool: method, durationMs: duration, status: 0, error: e.message })
      return { error: `Dynatrace MCP request failed: ${e.message}` }
    }
  }

  /** List all available tools from the Dynatrace MCP */
  async listTools() {
    return this._rpc('tools/list')
  }

  /**
   * Execute a DQL query using the Data Analysis Agent.
   * @param {string} query - DQL query string
   */
  async executeDQL(query) {
    return this._rpc('tools/call', {
      name: 'Data Analysis Agent',
      arguments: { query: String(query).slice(0, 5000) },
    })
  }

  /**
   * Get active problems using the Root Cause Agent.
   * @param {string} context - natural language context (e.g. "WealthTrack backend services")
   */
  async analyzeProblems(context = '') {
    return this._rpc('tools/call', {
      name: 'Root Cause Agent',
      arguments: { message: context ? `Analyze problems for: ${context}` : 'List all open problems' },
    })
  }

  /**
   * Generate a DQL query from natural language using Grail Query Agent.
   * @param {string} question - natural language question
   */
  async generateDQL(question) {
    return this._rpc('tools/call', {
      name: 'Grail Query Agent',
      arguments: { message: String(question).slice(0, 1000) },
    })
  }

  /**
   * Ask the Help Agent any Dynatrace question.
   * @param {string} question
   */
  async ask(question) {
    return this._rpc('tools/call', {
      name: 'Help Agent',
      arguments: { message: String(question).slice(0, 1000) },
    })
  }

  /**
   * Generic tool call — pass any tool name + arguments
   */
  async callTool(toolName, toolArgs = {}) {
    return this._rpc('tools/call', {
      name:      toolName,
      arguments: toolArgs,
    })
  }

  /** Health check — tries to list tools */
  async isAvailable() {
    if (!this.isConfigured()) return false
    try {
      const res = await fetch(this._url, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${this._token}`,
        },
        body:   JSON.stringify({ jsonrpc: '2.0', id: 0, method: 'tools/list', params: {} }),
        signal: AbortSignal.timeout(5000),
      })
      return res.ok
    } catch {
      return false
    }
  }
}

// Singleton
const dynatraceMcp = new DynatraceMcpClient()
module.exports = { DynatraceMcpClient, dynatraceMcp }
