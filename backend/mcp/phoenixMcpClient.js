'use strict'

/**
 * Phoenix MCP Client
 * Connects to the Arize Phoenix MCP server via stdio JSON-RPC.
 * The MCP server is @arizeai/phoenix-mcp, run via npx.
 *
 * Usage:
 *   const { phoenixMcp } = require('./phoenixMcpClient')
 *   const result = await phoenixMcp.callTool('list-traces', { projectName: 'wealthtrack-agent' })
 */

const { spawn } = require('child_process')
const readline  = require('readline')

const PHOENIX_BASE_URL = process.env.PHOENIX_HOST || 'http://localhost:6006'
const PHOENIX_API_KEY  = process.env.PHOENIX_API_KEY || ''

class PhoenixMcpClient {
  constructor() {
    this.child   = null
    this.pending = new Map()
    this.reqId   = 0
    this.ready   = false
    this._initPromise = null
  }

  _start() {
    const args = [
      '-y', '@arizeai/phoenix-mcp@latest',
      '--baseUrl', PHOENIX_BASE_URL,
    ]
    if (PHOENIX_API_KEY) args.push('--apiKey', PHOENIX_API_KEY)

    this.child = spawn('npx', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    })

    const rl = readline.createInterface({ input: this.child.stdout })
    rl.on('line', (line) => {
      line = line.trim()
      if (!line) return
      try {
        const msg = JSON.parse(line)
        if (msg.id != null && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id)
          this.pending.delete(msg.id)
          if (msg.error) reject(new Error(JSON.stringify(msg.error)))
          else resolve(msg.result)
        }
      } catch { /* non-JSON output — ignore */ }
    })

    this.child.stderr.on('data', (d) => {
      // Suppress noisy npx output unless debug mode
      if (process.env.DEBUG_PHOENIX_MCP) process.stderr.write(d)
    })

    this.child.on('exit', () => {
      this.ready = false
      this.child = null
      // Reject any pending requests
      for (const { reject } of this.pending.values()) {
        reject(new Error('Phoenix MCP process exited'))
      }
      this.pending.clear()
    })
  }

  async _initialize() {
    this._start()
    // Send MCP initialize handshake
    const initResult = await this._send('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'wealthtrack-agent', version: '1.0.0' },
    })
    // Send initialized notification
    this._notify('notifications/initialized', {})
    this.ready = true
    return initResult
  }

  _ensureStarted() {
    if (!this._initPromise) {
      this._initPromise = this._initialize().catch((e) => {
        this._initPromise = null // allow retry
        throw e
      })
    }
    return this._initPromise
  }

  _send(method, params) {
    return new Promise((resolve, reject) => {
      const id = ++this.reqId
      this.pending.set(id, { resolve, reject })

      const msg = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'
      this.child.stdin.write(msg)

      // 15s timeout
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id)
          reject(new Error(`Phoenix MCP timeout for ${method}`))
        }
      }, 15000)
    })
  }

  _notify(method, params) {
    if (!this.child?.stdin?.writable) return
    const msg = JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n'
    this.child.stdin.write(msg)
  }

  /**
   * Call a Phoenix MCP tool.
   * @param {string} toolName  — e.g. 'list-traces', 'get-spans'
   * @param {object} toolArgs  — tool arguments
   */
  async callTool(toolName, toolArgs = {}) {
    await this._ensureStarted()
    const result = await this._send('tools/call', {
      name:      toolName,
      arguments: toolArgs,
    })
    return result
  }

  /**
   * List available tools on the Phoenix MCP server.
   */
  async listTools() {
    await this._ensureStarted()
    return this._send('tools/list', {})
  }

  /**
   * Check if Phoenix MCP is available (Phoenix instance reachable).
   */
  async isAvailable() {
    try {
      // Quick HTTP check against Phoenix health endpoint
      const r = await fetch(`${PHOENIX_BASE_URL}/healthz`, { signal: AbortSignal.timeout(2000) })
      return r.ok
    } catch {
      return false
    }
  }
}

// Singleton — one MCP client per process
const phoenixMcp = new PhoenixMcpClient()

module.exports = { phoenixMcp }
