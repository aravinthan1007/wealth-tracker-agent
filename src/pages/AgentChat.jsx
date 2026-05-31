import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import {
  Brain, Zap, ChevronDown, ChevronUp, CheckCircle, AlertTriangle,
  RefreshCw, Send, Terminal, Globe, Calculator, CreditCard,
  TrendingUp, DollarSign, User, BarChart2, Sparkles, Trash2,
} from 'lucide-react'
import { C, fmt, Spinner, mono } from '../components/ui'

// ── Tool icon / color maps ────────────────────────────────────────────────────
const TOOL_ICON = {
  get_networth:     BarChart2,
  get_stock_quotes: TrendingUp,
  get_expenses:     DollarSign,
  get_credit_cards: CreditCard,
  get_income:       DollarSign,
  get_profile:      User,
  search_web:       Globe,
  calculate:        Calculator,
}
const TOOL_COLOR = {
  get_networth:     C.green,
  get_stock_quotes: C.blue,
  get_expenses:     '#f59e0b',
  get_credit_cards: '#ef4444',
  get_income:       C.green,
  get_profile:      '#a78bfa',
  search_web:       C.blue,
  calculate:        '#f59e0b',
}

const SUGGESTIONS = [
  "What is my current net worth and how is it broken down?",
  "How much did I spend this month vs last month?",
  "Which credit card has the highest APR I should pay off first?",
  "How much would I have at retirement if I save my current surplus?",
  "What are AAPL, MSFT, and NVDA trading at today?",
  "Am I on track for retirement based on my income and savings rate?",
  "How much of my income is going to debt repayment?",
  "Search for the current Fed funds rate and how it affects my savings.",
]

// ── ReAct step renderer ───────────────────────────────────────────────────────
function ReActStep({ step }) {
  const [open, setOpen] = useState(true)

  if (step.type === 'answer') {
    return (
      <div style={{
        borderRadius: 12,
        border: `1px solid ${C.green}40`,
        background: 'linear-gradient(135deg, rgba(16,216,124,0.07) 0%, rgba(16,216,124,0.02) 100%)',
        padding: '16px 18px',
        marginTop: 4,
        animation: 'fadeIn 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <CheckCircle size={15} color={C.green} />
          <span style={{ fontSize: 11, fontWeight: 700, color: C.green, letterSpacing: '0.08em' }}>ANSWER</span>
        </div>
        {step.thought && (
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, fontStyle: 'italic', lineHeight: 1.6 }}>
            {step.thought}
          </div>
        )}
        <div style={{ fontSize: 14, color: C.text, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
          {step.answer}
        </div>
      </div>
    )
  }

  if (step.type === 'action') {
    const Icon  = TOOL_ICON[step.tool] || Terminal
    const color = TOOL_COLOR[step.tool] || C.subtle
    const obsStr = step.observation ? JSON.stringify(step.observation, null, 2) : ''

    return (
      <div style={{
        borderRadius: 10, border: `1px solid ${C.border}`,
        background: '#0a1020', overflow: 'hidden', marginBottom: 3,
        animation: 'slideIn 0.2s ease',
      }}>
        {step.thought && (
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Brain size={12} color={C.subtle} style={{ marginTop: 2, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, fontStyle: 'italic' }}>{step.thought}</span>
          </div>
        )}
        <div
          onClick={() => setOpen(o => !o)}
          style={{ padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', background: C.card }}
        >
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: `${color}20`, border: `1px solid ${color}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon size={12} color={color} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color }}>{step.tool}</span>
            {step.args && <span style={{ fontSize: 11, color: C.subtle, marginLeft: 6 }}>({step.args})</span>}
          </div>
          <span style={{ fontSize: 10, color: C.subtle, fontWeight: 600, letterSpacing: '0.06em' }}>STEP {step.step}</span>
          {open ? <ChevronUp size={12} color={C.subtle} /> : <ChevronDown size={12} color={C.subtle} />}
        </div>
        {open && step.observation && (
          <div style={{ borderTop: `1px solid ${C.border}`, padding: '10px 14px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.subtle, letterSpacing: '0.08em', marginBottom: 6 }}>OBSERVATION</div>
            {step.observation.error ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <AlertTriangle size={12} color={C.red} />
                <span style={{ fontSize: 12, color: C.red }}>{step.observation.error}</span>
              </div>
            ) : (
              <pre style={{
                fontSize: 11, color: C.muted, lineHeight: 1.6, margin: 0,
                overflow: 'auto', maxHeight: 200,
                fontFamily: "'JetBrains Mono','Fira Code',monospace",
                background: C.bg, padding: 8, borderRadius: 6,
              }}>
                {obsStr}
              </pre>
            )}
          </div>
        )}
      </div>
    )
  }

  return null
}

// ── Thinking indicator ────────────────────────────────────────────────────────
function Thinking({ tool }) {
  const Icon  = tool ? (TOOL_ICON[tool] || Terminal) : Brain
  const color = tool ? (TOOL_COLOR[tool] || C.subtle) : C.green
  const label = tool ? `Calling ${tool}…` : 'Reasoning…'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9,
      padding: '10px 14px', borderRadius: 9,
      background: '#0a1020', border: `1px solid ${C.border}`,
      animation: 'pulse 1.5s ease infinite',
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 6,
        background: `${color}20`, border: `1px solid ${color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={11} color={color} />
      </div>
      <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
      <Spinner size={11} />
    </div>
  )
}

// ── Main AgentChat component ──────────────────────────────────────────────────
// Expose `sendQuestion(q)` via ref so parent can inject questions.
// Pass `compact` to hide the internal header (used inside CopilotDrawer).
const AgentChat = forwardRef(function AgentChat({ compact = false }, ref) {
  const [question, setQuestion] = useState('')
  const [steps, setSteps]       = useState([])
  const [thinking, setThinking] = useState(null)
  const [answer, setAnswer]     = useState(null)
  const [error, setError]       = useState(null)
  const [running, setRunning]   = useState(false)
  const [toolsUsed, setToolsUsed] = useState([])
  const [model, setModel]       = useState(null)
  const [history, setHistory]   = useState([]) // [{question, answer, steps}]
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const esRef     = useRef(null)

  // Expose sendQuestion for parent use
  useImperativeHandle(ref, () => ({
    sendQuestion(q) {
      setQuestion(q)
      setTimeout(() => run(q), 50)
    },
  }))

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [steps, thinking, history])

  function reset() {
    esRef.current?.close()
    setSteps([])
    setThinking(null)
    setAnswer(null)
    setError(null)
    setRunning(false)
    setToolsUsed([])
    setModel(null)
  }

  async function run(q) {
    const query = (q || question).trim()
    if (!query || running) return
    reset()
    setQuestion(query)
    setRunning(true)
    setThinking('reasoning')

    const url = `/api/react-agent/stream?question=${encodeURIComponent(query)}`
    const es = new EventSource(url)
    esRef.current = es

    const accumulated = []

    es.addEventListener('step', (e) => {
      const step = JSON.parse(e.data)
      accumulated.push(step)
      setSteps(prev => [...prev, step])
      if (step.type === 'action') setThinking(step.tool)
      else if (step.type === 'answer') setThinking(null)
      else setThinking('reasoning')
    })

    es.addEventListener('done', (e) => {
      const data = JSON.parse(e.data)
      setAnswer(data.answer)
      setToolsUsed(data.toolsUsed || [])
      setModel(data.model)
      setThinking(null)
      setRunning(false)
      es.close()
      // archive into history
      setHistory(h => [...h, {
        question: query,
        answer: data.answer,
        steps: accumulated,
        toolsUsed: data.toolsUsed || [],
        model: data.model,
        ts: new Date(),
      }])
      // notify observability strip
      window.dispatchEvent(new Event('wt:agent-run'))
    })

    es.addEventListener('error', (e) => {
      let msg = 'Agent error'
      try { msg = JSON.parse(e.data)?.error || msg } catch {}
      setError(msg)
      setThinking(null)
      setRunning(false)
      es.close()
    })

    es.onerror = () => {
      if (running) {
        setError('Connection lost — is the backend running?')
        setThinking(null)
        setRunning(false)
        es.close()
      }
    }
  }

  const hasResult = steps.length > 0 || answer || error
  const isEmpty   = !hasResult && !running && history.length === 0

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', position: 'relative',
    }}>
      {/* ── Header bar (hidden in compact/drawer mode) ────────────────────── */}
      {!compact && (
      <div style={{
        padding: '14px 20px', borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'linear-gradient(135deg, rgba(16,216,124,0.03) 0%, transparent 60%)',
        flexShrink: 0,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 9,
          background: `linear-gradient(135deg, ${C.green}, ${C.green2})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(16,216,124,0.3)', flexShrink: 0,
        }}>
          <Brain size={16} color="#03180d" />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>
            WealthTrack Agent
          </div>
          <div style={{ fontSize: 11, color: C.subtle }}>
            ReAct reasoning · tools: get_networth, portfolio, search_web + more
            {model && <span style={{ color: C.green, marginLeft: 8 }}>● {model}</span>}
          </div>
        </div>
        {(hasResult || history.length > 0) && !running && (
          <button
            onClick={() => { reset(); setHistory([]); setQuestion('') }}
            style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 7, border: `1px solid ${C.border}`,
              background: 'transparent', color: C.subtle, fontSize: 11, cursor: 'pointer',
            }}
          >
            <Trash2 size={11} /> Clear
          </button>
        )}
      </div>
      )}

      {/* ── Scrollable conversation ───────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Empty state */}
        {isEmpty && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '40px 20px', textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: `linear-gradient(135deg, ${C.green}20, ${C.green}08)`,
              border: `1px solid ${C.green}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            }}>
              <Sparkles size={24} color={C.green} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6 }}>
              Ask anything about your wealth
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 24, maxWidth: 380, lineHeight: 1.6 }}>
              The agent reasons step-by-step, calls tools, observes results, and chains actions until it has your answer.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 540 }}>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setQuestion(s); setTimeout(() => run(s), 50) }}
                  style={{
                    padding: '6px 12px', borderRadius: 20, fontSize: 12,
                    background: C.card, border: `1px solid ${C.border}`,
                    color: C.muted, cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${C.green}60`; e.currentTarget.style.color = C.green }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation history */}
        {history.map((entry, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* User bubble */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{
                maxWidth: '75%', padding: '10px 14px', borderRadius: '12px 12px 3px 12px',
                background: `linear-gradient(135deg, ${C.green}18, ${C.green}08)`,
                border: `1px solid ${C.green}30`,
                fontSize: 13, color: C.text, lineHeight: 1.6,
              }}>
                {entry.question}
              </div>
            </div>
            {/* Collapsed answer */}
            <div style={{
              borderRadius: 12, border: `1px solid ${C.border}`,
              background: '#0a1020', padding: '12px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <CheckCircle size={13} color={C.green} />
                <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>ANSWERED</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: C.subtle }}>
                  {entry.toolsUsed.length} tools · {new Date(entry.ts).toLocaleTimeString()}
                </span>
              </div>
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {entry.answer}
              </div>
            </div>
          </div>
        ))}

        {/* Active conversation */}
        {(hasResult || running) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Current user question bubble */}
            {question && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{
                  maxWidth: '75%', padding: '10px 14px', borderRadius: '12px 12px 3px 12px',
                  background: `linear-gradient(135deg, ${C.green}18, ${C.green}08)`,
                  border: `1px solid ${C.green}30`,
                  fontSize: 13, color: C.text, lineHeight: 1.6,
                }}>
                  {question}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{
                padding: '12px 14px', borderRadius: 10,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#ef4444', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center',
              }}>
                <AlertTriangle size={14} /> {error}
                <span style={{ fontSize: 11, color: '#ef4444aa', marginLeft: 4 }}>
                  Is backend running? <code>npm run dev</code>
                </span>
              </div>
            )}

            {/* Reasoning chain */}
            {steps.length > 0 && (
              <div style={{
                borderRadius: 12, border: `1px solid ${C.border}`,
                background: '#080e1d', padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                  <Zap size={13} color={C.green} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.green, letterSpacing: '0.08em' }}>
                    REASONING CHAIN
                  </span>
                  {toolsUsed.length > 0 && (
                    <span style={{ fontSize: 10, color: C.subtle, marginLeft: 'auto' }}>
                      {[...new Set(toolsUsed)].join(' · ')}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {steps.map((step, i) => (
                    <ReActStep key={i} step={step} />
                  ))}
                  {thinking && <Thinking tool={thinking === 'reasoning' ? null : thinking} />}
                </div>
              </div>
            )}

            {/* Pure thinking (no steps yet) */}
            {thinking && steps.length === 0 && <Thinking tool={null} />}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar (pinned bottom) ──────────────────────────────────────── */}
      <div style={{
        padding: '12px 20px 14px',
        borderTop: `1px solid ${C.border}`,
        background: '#080e1d',
        flexShrink: 0,
      }}>
        {/* Tool pills */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 8, flexWrap: 'wrap' }}>
          {Object.keys(TOOL_ICON).map(name => {
            const Icon  = TOOL_ICON[name]
            const color = TOOL_COLOR[name]
            const used  = toolsUsed.includes(name)
            return (
              <div key={name} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '2px 7px', borderRadius: 12,
                background: used ? `${color}20` : 'transparent',
                border: `1px solid ${used ? color + '50' : C.border}`,
                fontSize: 9, color: used ? color : C.subtle,
                transition: 'all 0.2s',
              }}>
                <Icon size={9} />
                {name}
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run() }
            }}
            placeholder="Ask anything about your wealth… (Enter to send, Shift+Enter for new line)"
            disabled={running}
            rows={2}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 10,
              background: C.bg, border: `1px solid ${C.border}`,
              color: C.text, fontSize: 13, outline: 'none',
              resize: 'none', lineHeight: 1.5,
              opacity: running ? 0.6 : 1,
              fontFamily: "'Inter',system-ui,sans-serif",
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = `${C.green}60`}
            onBlur={e => e.target.style.borderColor = C.border}
          />
          <button
            onClick={() => run()}
            disabled={!question.trim() || running}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, padding: '10px 16px', borderRadius: 10,
              background: running || !question.trim()
                ? '#0d1528'
                : `linear-gradient(135deg, ${C.green}, ${C.green2})`,
              border: running || !question.trim() ? `1px solid ${C.border}` : 'none',
              color: running || !question.trim() ? C.muted : '#03180d',
              fontWeight: 700, fontSize: 13, cursor: running || !question.trim() ? 'not-allowed' : 'pointer',
              boxShadow: running || !question.trim() ? 'none' : '0 2px 12px rgba(16,216,124,0.25)',
              transition: 'all 0.2s', height: 44, flexShrink: 0,
            }}
          >
            {running
              ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
              : <Send size={15} />}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
        @keyframes pulse   { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  )
})

export default AgentChat
