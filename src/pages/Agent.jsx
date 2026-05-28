import React, { useState, useRef, useEffect } from 'react'
import {
  Brain, Zap, ChevronDown, ChevronUp, CheckCircle, AlertTriangle,
  RefreshCw, Send, Terminal, Database, Globe, Calculator, CreditCard,
  TrendingUp, DollarSign, User, BarChart2,
} from 'lucide-react'
import { C, fmt, PageHeader, Card, Btn, Spinner } from '../components/ui'

// ── Tool icon map ────────────────────────────────────────────────────────────
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

// ── Suggested questions ──────────────────────────────────────────────────────
const SUGGESTIONS = [
  "What is my current net worth and how is it broken down?",
  "How much did I spend this month and what's my biggest expense category?",
  "What's my credit card utilization and which card has the highest APR?",
  "How much would I have at retirement if I save my current surplus?",
  "What are AAPL, MSFT, and NVDA trading at today?",
  "Am I on track for retirement based on my income and savings rate?",
  "How much of my income is going to debt repayment?",
  "Search for the current Fed funds rate and how it affects my savings.",
]

// ── Step component — shows one Thought/Action/Answer ─────────────────────────
function ReActStep({ step, index, isLast }) {
  const [open, setOpen] = useState(true)

  if (step.type === 'answer') {
    return (
      <div style={{
        borderRadius: 14,
        border: `1px solid ${C.green}40`,
        background: 'linear-gradient(135deg, rgba(16,216,124,0.07) 0%, rgba(16,216,124,0.02) 100%)',
        padding: '18px 20px',
        marginTop: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <CheckCircle size={16} color={C.green} />
          <span style={{ fontSize: 12, fontWeight: 700, color: C.green, letterSpacing: '0.08em' }}>FINAL ANSWER</span>
        </div>
        {step.thought && (
          <div style={{ fontSize: 12, color: '#8898b8', marginBottom: 10, fontStyle: 'italic', lineHeight: 1.6 }}>
            {step.thought}
          </div>
        )}
        <div style={{ fontSize: 14, color: '#e8edf5', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
          {step.answer}
        </div>
      </div>
    )
  }

  if (step.type === 'action') {
    const Icon = TOOL_ICON[step.tool] || Terminal
    const color = TOOL_COLOR[step.tool] || '#8898b8'
    const obsStr = step.observation ? JSON.stringify(step.observation, null, 2) : ''

    return (
      <div style={{
        borderRadius: 12,
        border: '1px solid #1a2540',
        background: '#0a1020',
        overflow: 'hidden',
        marginBottom: 4,
      }}>
        {/* Thought row */}
        {step.thought && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a2540', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Brain size={13} color='#546080' style={{ marginTop: 2, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#8898b8', lineHeight: 1.6, fontStyle: 'italic' }}>{step.thought}</span>
          </div>
        )}

        {/* Action row */}
        <div
          onClick={() => setOpen(o => !o)}
          style={{
            padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
            cursor: 'pointer', background: '#0d1528',
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: `${color}20`,
            border: `1px solid ${color}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon size={13} color={color} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color }}>
              {step.tool}
            </span>
            {step.args && (
              <span style={{ fontSize: 11, color: '#546080', marginLeft: 6 }}>({step.args})</span>
            )}
          </div>
          <span style={{ fontSize: 10, color: '#546080', fontWeight: 600, letterSpacing: '0.06em' }}>STEP {step.step}</span>
          {open ? <ChevronUp size={13} color='#546080' /> : <ChevronDown size={13} color='#546080' />}
        </div>

        {/* Observation panel */}
        {open && step.observation && (
          <div style={{ borderTop: '1px solid #1a2540', padding: '12px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#546080', letterSpacing: '0.08em', marginBottom: 8 }}>
              OBSERVATION
            </div>
            {step.observation.error ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <AlertTriangle size={12} color='#ef4444' />
                <span style={{ fontSize: 12, color: '#ef4444' }}>{step.observation.error}</span>
              </div>
            ) : (
              <pre style={{
                fontSize: 11, color: '#8898b8', lineHeight: 1.6, margin: 0,
                overflow: 'auto', maxHeight: 240,
                fontFamily: "'JetBrains Mono','Fira Code',monospace",
                background: '#060b17', padding: 10, borderRadius: 8,
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

// ── Pulsing thinking indicator ─────────────────────────────────────────────
function Thinking({ tool }) {
  const Icon = tool ? (TOOL_ICON[tool] || Terminal) : Brain
  const color = tool ? (TOOL_COLOR[tool] || '#8898b8') : C.green
  const label = tool ? `Calling ${tool}…` : 'Reasoning…'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, background: '#0a1020', border: '1px solid #1a2540' }}>
      <div style={{
        width: 24, height: 24, borderRadius: 6,
        background: `${color}20`, border: `1px solid ${color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={12} color={color} />
      </div>
      <span style={{ fontSize: 12, color: '#8898b8' }}>{label}</span>
      <Spinner size={12} />
    </div>
  )
}

// ── Main Agent page ──────────────────────────────────────────────────────────
export default function Agent() {
  const [question, setQuestion] = useState('')
  const [steps, setSteps] = useState([])       // completed steps
  const [thinking, setThinking] = useState(null) // null | 'reasoning' | toolName
  const [answer, setAnswer] = useState(null)
  const [error, setError] = useState(null)
  const [running, setRunning] = useState(false)
  const [toolsUsed, setToolsUsed] = useState([])
  const [model, setModel] = useState(null)
  const bottomRef = useRef(null)
  const esRef = useRef(null)

  // Auto-scroll as steps come in
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [steps, thinking])

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

  async function run() {
    if (!question.trim() || running) return
    reset()
    setRunning(true)
    setThinking('reasoning')

    // Use SSE streaming so each step appears in real-time
    const url = `/api/react-agent/stream?question=${encodeURIComponent(question.trim())}`
    const es = new EventSource(url)
    esRef.current = es

    es.addEventListener('step', (e) => {
      const step = JSON.parse(e.data)
      setSteps(prev => [...prev, step])

      if (step.type === 'action') {
        // Show next tool while we wait for its result to come back
        setThinking(step.tool)
      } else if (step.type === 'answer') {
        setThinking(null)
      } else {
        setThinking('reasoning')
      }
    })

    es.addEventListener('done', (e) => {
      const data = JSON.parse(e.data)
      setAnswer(data.answer)
      setToolsUsed(data.toolsUsed || [])
      setModel(data.model)
      setThinking(null)
      setRunning(false)
      es.close()
    })

    es.addEventListener('error', (e) => {
      let msg = 'Agent error'
      try { msg = JSON.parse(e.data)?.error || msg } catch (_) {}
      setError(msg)
      setThinking(null)
      setRunning(false)
      es.close()
    })

    // Fallback: EventSource native error (network-level)
    es.onerror = () => {
      if (running) {
        setError('Connection lost — is the backend running?')
        setThinking(null)
        setRunning(false)
        es.close()
      }
    }
  }

  const hasResult = steps.length > 0 || answer

  return (
    <div style={{ padding: '28px 28px 48px', maxWidth: 900, margin: '0 auto' }}>
      <PageHeader
        title="ReAct Agent"
        subtitle={
          <span>
            Reasoning + Acting — the agent thinks step-by-step, calls tools, observes results, and repeats until it has your answer.
            {model && <span style={{ marginLeft: 10, color: C.green, fontSize: 11 }}>● {model}</span>}
          </span>
        }
        icon={Brain}
        iconColor={C.green}
      />

      {/* Input card */}
      <Card style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && run()}
            placeholder="Ask anything about your finances…"
            disabled={running}
            style={{
              flex: 1, padding: '11px 14px', borderRadius: 10,
              background: '#060b17', border: '1px solid #1a2540',
              color: '#e8edf5', fontSize: 14, outline: 'none',
              opacity: running ? 0.6 : 1,
            }}
          />
          <Btn
            onClick={run}
            disabled={!question.trim() || running}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px' }}
          >
            {running ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
            {running ? 'Running…' : 'Run Agent'}
          </Btn>
          {hasResult && !running && (
            <Btn onClick={reset} style={{ padding: '10px 14px', background: '#0d1528', border: '1px solid #1a2540', color: '#8898b8' }}>
              Clear
            </Btn>
          )}
        </div>

        {/* Suggestions */}
        {!hasResult && !running && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, color: '#546080', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>
              TRY ASKING
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setQuestion(s)}
                  style={{
                    padding: '5px 10px', borderRadius: 20, fontSize: 11,
                    background: '#0d1528', border: '1px solid #1a2540',
                    color: '#8898b8', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.target.style.borderColor = C.green; e.target.style.color = C.green }}
                  onMouseLeave={e => { e.target.style.borderColor = '#1a2540'; e.target.style.color = '#8898b8' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Error banner */}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertTriangle size={14} />
          {error}
          <span style={{ fontSize: 11, color: '#ef4444aa', marginLeft: 4 }}>Is Ollama running? <code>ollama serve</code></span>
        </div>
      )}

      {/* Agent reasoning chain */}
      {hasResult && (
        <Card style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Zap size={14} color={C.green} />
            <span style={{ fontSize: 12, fontWeight: 700, color: C.green, letterSpacing: '0.08em' }}>
              AGENT REASONING CHAIN
            </span>
            {toolsUsed.length > 0 && (
              <span style={{ fontSize: 11, color: '#546080', marginLeft: 'auto' }}>
                {toolsUsed.length} tool{toolsUsed.length > 1 ? 's' : ''} used: {[...new Set(toolsUsed)].join(', ')}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {steps.map((step, i) => (
              <ReActStep key={i} step={step} index={i} isLast={i === steps.length - 1 && !thinking} />
            ))}

            {/* Live thinking indicator */}
            {thinking && <Thinking tool={thinking === 'reasoning' ? null : thinking} />}
          </div>

          <div ref={bottomRef} />
        </Card>
      )}

      {/* Tools reference panel */}
      {!hasResult && !running && (
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#546080', letterSpacing: '0.08em', marginBottom: 14 }}>
            AVAILABLE TOOLS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {Object.entries(TOOL_ICON).map(([name, Icon]) => (
              <div key={name} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', borderRadius: 8,
                background: '#0a1020', border: '1px solid #1a2540',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: `${TOOL_COLOR[name]}20`,
                  border: `1px solid ${TOOL_COLOR[name]}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={12} color={TOOL_COLOR[name]} />
                </div>
                <span style={{ fontSize: 11, color: '#8898b8' }}>{name}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
