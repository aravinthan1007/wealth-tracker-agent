import React, { useState, useEffect, useRef } from 'react'
import {
  Brain, Search, TrendingUp, DollarSign, BarChart2, RefreshCw, Scissors,
  FileText, BookOpen, Send, ExternalLink, Zap, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle, Globe, Terminal, Calculator, CreditCard, User,
} from 'lucide-react'
import { C, mono, fmt, PageHeader, Card, Btn, Badge, Input, Spinner, EmptyState } from '../components/ui'

/* ── Tool icon / color map (for ReAct step display) ── */
const TOOL_META = {
  get_networth:     { icon: BarChart2,   color: C.green },
  get_stock_quotes: { icon: TrendingUp,  color: C.blue },
  get_expenses:     { icon: DollarSign,  color: '#f59e0b' },
  get_credit_cards: { icon: CreditCard,  color: '#ef4444' },
  get_income:       { icon: DollarSign,  color: C.green },
  get_profile:      { icon: User,        color: '#a78bfa' },
  search_web:       { icon: Globe,       color: C.blue },
  fetch_url:        { icon: ExternalLink, color: C.blue },
  calculate:        { icon: Calculator,  color: '#f59e0b' },
  remember:         { icon: Brain,       color: '#a78bfa' },
  recall:           { icon: Brain,       color: '#a78bfa' },
}

/* ── Skill definitions — each has buildQuestion for the ReAct agent ── */
const SKILLS = [
  {
    id: 'market-research',
    label: 'Market Research',
    icon: Search,
    color: C.blue,
    desc: 'ReAct agent gathers live price data, analyst ratings, recent news, and key risks for any stock or sector.',
    fields: [{ key: 'query', label: 'Stock / Sector to research', placeholder: 'e.g. NVDA, AI semiconductor sector, S&P 500 outlook' }],
    buildQuestion: (f) =>
      `Do comprehensive market research on: ${f.query || 'S&P 500'}. ` +
      `Use search_web to find: current price and YTD performance, analyst ratings and price targets, ` +
      `recent news from the last 2 weeks, key financial metrics (P/E, revenue growth, margins), ` +
      `and top 3 risks. Conclude with a wealth management insight.`,
  },
  {
    id: 'portfolio-rebalance',
    label: 'Portfolio Rebalance',
    icon: RefreshCw,
    color: C.green,
    desc: 'ReAct agent fetches your real holdings, income, and market data to generate tax-aware rebalancing trades.',
    fields: [
      { key: 'riskProfile', label: 'Risk Profile', placeholder: 'conservative / moderate / aggressive', default: 'moderate' },
    ],
    buildQuestion: (f, portfolio) => {
      const holdingsStr = portfolio.length ? portfolio.map(h => `${h.symbol} (${h.shares} shares @ $${h.avgCost})`).join(', ') : 'no holdings saved yet'
      return `Analyze my portfolio for rebalancing. Risk profile: ${f.riskProfile || 'moderate'}. ` +
        `Holdings: ${holdingsStr}. ` +
        `Get my net worth and income data. Then: identify allocation drift from target, ` +
        `recommend specific trades (buy/sell what amount), check tax implications, ` +
        `and list 5 priority actions for this month.`
    },
    needsPortfolio: true,
  },
  {
    id: 'financial-plan',
    label: 'Financial Plan',
    icon: FileText,
    color: '#a78bfa',
    desc: 'ReAct agent reads your actual income, expenses, and debt to build a complete retirement and savings plan.',
    fields: [
      { key: 'age', label: 'Your Age', placeholder: '30', type: 'number' },
      { key: 'retirementAge', label: 'Target Retirement Age', placeholder: '65', type: 'number' },
      { key: 'additionalContext', label: 'Additional Context (optional)', placeholder: 'e.g. planning to buy house in 2 years' },
    ],
    buildQuestion: (f) =>
      `Create a comprehensive financial plan. Age: ${f.age || 30}, target retirement age: ${f.retirementAge || 65}. ` +
      (f.additionalContext ? `Context: ${f.additionalContext}. ` : '') +
      `First get my actual income, expenses, credit cards, and net worth. Then: ` +
      `(1) assess savings rate vs target, (2) project retirement portfolio at 6% and 8% returns, ` +
      `(3) calculate optimal monthly savings needed, (4) debt payoff strategy, (5) top 5 action items. ` +
      `Use calculate() for projections. Include specific dollar amounts.`,
  },
  {
    id: 'tax-loss-harvesting',
    label: 'Tax-Loss Harvesting',
    icon: Scissors,
    color: '#f59e0b',
    desc: 'ReAct agent finds unrealized losses in your portfolio, estimates tax savings, and suggests wash-sale-safe swaps.',
    fields: [
      { key: 'ytdGains', label: 'YTD Realized Gains ($)', placeholder: '5000', type: 'number' },
      { key: 'taxBracket', label: 'Tax Bracket (%)', placeholder: '24', type: 'number' },
    ],
    buildQuestion: (f, portfolio) => {
      const holdingsStr = portfolio.length ? portfolio.map(h => `${h.symbol} (${h.shares} shares @ $${h.avgCost} cost basis)`).join(', ') : 'standard diversified portfolio'
      return `Tax-loss harvesting analysis. YTD realized gains: $${f.ytdGains || 0}. Tax bracket: ${f.taxBracket || 24}%. ` +
        `Holdings: ${holdingsStr}. ` +
        `Get current stock quotes for each position. Calculate unrealized gain/loss per position. ` +
        `Identify positions with losses to harvest. Calculate tax savings on offsetting the gains. ` +
        `Suggest specific ETF replacements that maintain market exposure without triggering wash sale rules. ` +
        `Search for any 2026 tax rule changes affecting harvesting strategy.`
    },
    needsPortfolio: true,
  },
  {
    id: 'client-review',
    label: 'Quarterly Review',
    icon: BookOpen,
    color: '#f472b6',
    desc: 'ReAct agent pulls your real financial data to prepare a professional quarterly review with metrics and recommendations.',
    fields: [
      { key: 'period', label: 'Review Period', placeholder: 'Q2 2026', default: 'Q2 2026' },
    ],
    buildQuestion: (f, portfolio) => {
      const holdingsStr = portfolio.length ? portfolio.map(h => h.symbol).join(', ') : 'no holdings'
      return `Prepare a professional ${f.period || 'Q2 2026'} quarterly financial review. ` +
        `Holdings: ${holdingsStr}. ` +
        `Gather my income, expenses, credit cards, and net worth data. ` +
        `Then search for market performance this quarter (S&P 500, bonds, key indices). ` +
        `Produce: (1) financial health score and savings rate, (2) spending breakdown vs budget, ` +
        `(3) debt reduction progress, (4) market context for the holdings, (5) top 3 recommendations for next quarter.`
    },
    needsPortfolio: true,
  },
  {
    id: 'investment-proposal',
    label: 'Investment Proposal',
    icon: TrendingUp,
    color: '#38bdf8',
    desc: 'ReAct agent builds a specific ETF portfolio with expected returns, risk analysis, and step-by-step implementation.',
    fields: [
      { key: 'targetAmount', label: 'Amount to Invest ($)', placeholder: '10000', type: 'number' },
      { key: 'goal', label: 'Goal', placeholder: 'long-term growth / income / capital preservation' },
      { key: 'riskProfile', label: 'Risk Profile', placeholder: 'moderate', default: 'moderate' },
      { key: 'timeHorizon', label: 'Time Horizon (years)', placeholder: '10', type: 'number' },
    ],
    buildQuestion: (f) =>
      `Create a specific investment proposal for $${f.targetAmount || 10000}. ` +
      `Goal: ${f.goal || 'long-term growth'}. Risk: ${f.riskProfile || 'moderate'}. Horizon: ${f.timeHorizon || 10} years. ` +
      `Get my financial profile to personalize advice. ` +
      `Search for 2026 market conditions and top-performing ETFs in this category. ` +
      `Propose an exact ETF allocation table (ticker, %, amount, expense ratio). ` +
      `Use calculate() to project value at 6% and 8% annual returns over the time horizon. ` +
      `Include lump-sum vs DCA recommendation and rebalancing trigger.`,
  },
]

function MarkdownText({ text }) {
  if (!text) return null
  // Simple markdown renderer — bold, headers, code, lists
  const lines = text.split('\n')
  return (
    <div style={{ fontSize: 13, lineHeight: 1.75, color: C.text }}>
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} style={{ margin: '16px 0 6px', fontSize: 13, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} style={{ margin: '20px 0 8px', fontSize: 15, fontWeight: 700, color: C.text }}>{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} style={{ margin: '20px 0 10px', fontSize: 17, fontWeight: 800 }}>{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <div key={i} style={{ paddingLeft: 16, color: C.muted, marginBottom: 3 }}>· {renderInline(line.slice(2))}</div>
        if (/^\d+\.\s/.test(line)) return <div key={i} style={{ paddingLeft: 16, color: C.muted, marginBottom: 3 }}>{renderInline(line)}</div>
        if (line.startsWith('|')) return <div key={i} style={{ ...mono, fontSize: 11, color: C.muted, borderBottom: `1px solid ${C.border}`, padding: '4px 0', overflowX: 'auto' }}>{line}</div>
        if (line === '') return <div key={i} style={{ height: 6 }} />
        return <p key={i} style={{ margin: '4px 0', color: C.muted }}>{renderInline(line)}</p>
      })}
    </div>
  )
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i} style={{ color: C.text, fontWeight: 600 }}>{p.slice(2, -2)}</strong>
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i} style={{ ...mono, fontSize: 11, background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4, color: C.green }}>{p.slice(1, -1)}</code>
    return p
  })
}

/* ── ReAct Step display (inline) ─────────────────────────────────────────── */
function ReActStepRow({ step }) {
  const [open, setOpen] = useState(false)
  const isAction = step.type === 'action'
  const meta = isAction ? (TOOL_META[step.tool] || { icon: Terminal, color: C.muted }) : null
  const ToolIcon = meta?.icon || Terminal

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div
        onClick={() => isAction && setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isAction ? 'pointer' : 'default', padding: '5px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.03)' }}
      >
        {isAction
          ? <ToolIcon size={11} color={meta.color} />
          : <Brain size={11} color={C.subtle} />
        }
        <span style={{ fontSize: 11, color: isAction ? meta.color : C.subtle, fontWeight: isAction ? 600 : 400, flex: 1 }}>
          {isAction ? `${step.tool}(${typeof step.args === 'object' ? JSON.stringify(step.args) : step.args || ''})` : step.thought}
        </span>
        {isAction && (open ? <ChevronUp size={10} color={C.subtle} /> : <ChevronDown size={10} color={C.subtle} />)}
      </div>
      {isAction && open && step.observation && (
        <div style={{ marginLeft: 20, padding: '6px 10px', background: '#080e1d', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 11, color: C.muted, fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto' }}>
          {typeof step.observation === 'string' ? step.observation : JSON.stringify(step.observation, null, 2)}
        </div>
      )}
    </div>
  )
}

function SkillCard({ skill, portfolio, apiKey }) {
  const [fields, setFields] = useState(() => {
    const init = {}
    skill.fields.forEach(f => { init[f.key] = f.default || '' })
    return init
  })
  const [running, setRunning] = useState(false)
  const [steps, setSteps] = useState([])
  const [thinking, setThinking] = useState(null)
  const [answer, setAnswer] = useState(null)
  const [toolsUsed, setToolsUsed] = useState([])
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [showChain, setShowChain] = useState(false)
  const esRef = useRef(null)
  const Icon = skill.icon

  function run() {
    if (running) return
    setRunning(true)
    setSteps([])
    setAnswer(null)
    setToolsUsed([])
    setError(null)
    setThinking('reasoning')
    setExpanded(true)
    setShowChain(true)

    const question = skill.buildQuestion(fields, portfolio)
    const es = new EventSource(`/api/react-agent/stream?question=${encodeURIComponent(question)}`)
    esRef.current = es

    es.addEventListener('step', e => {
      const step = JSON.parse(e.data)
      setSteps(prev => [...prev, step])
      setThinking(step.type === 'action' ? step.tool : 'reasoning')
    })

    es.addEventListener('done', e => {
      const data = JSON.parse(e.data)
      setAnswer(data.answer)
      setToolsUsed(data.toolsUsed || [])
      setThinking(null)
      setRunning(false)
      es.close()
    })

    es.addEventListener('error', e => {
      let msg = 'Agent error'
      try { msg = JSON.parse(e.data)?.error || msg } catch (_) {}
      setError(msg)
      setThinking(null)
      setRunning(false)
      es.close()
    })

    es.onerror = () => {
      setError('Connection lost — is Ollama running at localhost:11434?')
      setThinking(null)
      setRunning(false)
      es.close()
    }
  }

  useEffect(() => () => esRef.current?.close(), [])

  return (
    <Card style={{ padding: 0, overflow: 'hidden', border: answer ? `1px solid ${skill.color}30` : `1px solid ${C.border}` }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${skill.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={16} color={skill.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{skill.label}</div>
          <div style={{ fontSize: 12, color: C.muted }}>{skill.desc}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {answer && <Badge color="green">Done</Badge>}
          {running && <Badge color="blue">Reasoning…</Badge>}
          {skill.needsPortfolio && portfolio.length === 0 && <Badge color="amber">No holdings</Badge>}
          {expanded ? <ChevronUp size={14} color={C.subtle} /> : <ChevronDown size={14} color={C.subtle} />}
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Input fields */}
          {skill.fields.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: skill.fields.length > 2 ? 'repeat(2, 1fr)' : `repeat(${skill.fields.length}, 1fr)`, gap: 10 }}>
              {skill.fields.map(f => (
                <div key={f.key}>
                  <div style={{ fontSize: 11, color: C.subtle, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{f.label}</div>
                  <input
                    type={f.type || 'text'}
                    value={fields[f.key]}
                    onChange={e => setFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width: '100%', padding: '8px 12px', background: '#0a1424', border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>
          )}

          {skill.needsPortfolio && portfolio.length === 0 && (
            <div style={{ padding: '10px 14px', background: 'rgba(245,166,35,0.08)', border: `1px solid rgba(245,166,35,0.2)`, borderRadius: 8, fontSize: 12, color: C.amber }}>
              ⚠ Add holdings on the Portfolio page for best results. The agent will reason with available data.
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={run} disabled={running}>
              {running
                ? <><Spinner size={12} /> {thinking === 'reasoning' ? 'Thinking…' : `Calling ${thinking}…`}</>
                : <><Brain size={12} /> Run ReAct Agent</>}
            </Btn>
            {(answer || error) && (
              <Btn onClick={() => { setAnswer(null); setSteps([]); setError(null) }} variant="secondary" size="sm">Clear</Btn>
            )}
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(240,80,96,0.08)', border: `1px solid rgba(240,80,96,0.2)`, borderRadius: 8, fontSize: 12, color: '#f05060' }}>
              {error}
            </div>
          )}

          {/* ReAct chain — shown while running and after */}
          {steps.length > 0 && (
            <div>
              <div
                onClick={() => setShowChain(o => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 6 }}
              >
                <Terminal size={11} color={C.subtle} />
                <span style={{ fontSize: 11, color: C.subtle, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Agent Reasoning ({steps.length} step{steps.length !== 1 ? 's' : ''})
                </span>
                {showChain ? <ChevronUp size={10} color={C.subtle} /> : <ChevronDown size={10} color={C.subtle} />}
                {toolsUsed.length > 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: C.subtle }}>
                    Tools: {toolsUsed.join(', ')}
                  </span>
                )}
              </div>
              {showChain && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '10px', background: '#080e1d', borderRadius: 8, border: `1px solid ${C.border}`, maxHeight: 280, overflowY: 'auto' }}>
                  {steps.map((step, i) => <ReActStepRow key={i} step={step} />)}
                  {running && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', color: C.muted, fontSize: 11 }}>
                      <Spinner size={10} /> {thinking === 'reasoning' ? 'Thinking…' : `Calling ${thinking}…`}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Final answer */}
          {answer && (
            <div>
              <div style={{ background: '#080e1d', borderRadius: 10, padding: '16px 20px', border: `1px solid ${C.border}`, maxHeight: 600, overflowY: 'auto' }}>
                <MarkdownText text={answer} />
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: C.subtle, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={10} color={C.green} />
                ReAct agent · Ollama llama3.2 · {steps.length} reasoning steps · Not investment advice
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

/* ── Chat Panel ────────────────────────────────────────────────────────────── */
function ChatPanel({ apiKey }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m your AI wealth advisor powered by a ReAct reasoning agent. I reason step-by-step, fetch your real financial data, search the web, and give you grounded answers. Ask me anything — stocks, taxes, retirement, or your personal finances.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [thinkingMsg, setThinkingMsg] = useState('')
  const bottomRef = useRef(null)
  const esRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, thinkingMsg])

  function send() {
    if (!input.trim() || loading) return
    const question = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setLoading(true)
    setThinkingMsg('Reasoning…')

    const es = new EventSource(`/api/react-agent/stream?question=${encodeURIComponent(question)}`)
    esRef.current = es

    es.addEventListener('step', e => {
      const step = JSON.parse(e.data)
      if (step.type === 'action') setThinkingMsg(`Calling ${step.tool}…`)
      else setThinkingMsg('Thinking…')
    })

    es.addEventListener('done', e => {
      const data = JSON.parse(e.data)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        toolsUsed: data.toolsUsed,
        stepCount: data.steps?.length || 0,
      }])
      setThinkingMsg('')
      setLoading(false)
      es.close()
    })

    es.addEventListener('error', e => {
      let msg = 'Agent error'
      try { msg = JSON.parse(e.data)?.error || msg } catch (_) {}
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${msg}` }])
      setThinkingMsg('')
      setLoading(false)
      es.close()
    })

    es.onerror = () => {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection lost — is Ollama running at localhost:11434?' }])
      setThinkingMsg('')
      setLoading(false)
      es.close()
    }
  }

  useEffect(() => () => esRef.current?.close(), [])

  return (
    <Card style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 520 }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Brain size={16} color={C.green} />
        <span style={{ fontWeight: 700, fontSize: 14 }}>AI Wealth Advisor Chat</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: apiKey ? C.green : '#f05060' }} />
          <span style={{ fontSize: 11, color: C.subtle }}>{apiKey ? (status?.activeProvider || 'Ollama llama3.2') : 'Not configured'}</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '85%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: msg.role === 'user' ? 'rgba(16,216,124,0.12)' : C.card2,
              border: `1px solid ${msg.role === 'user' ? 'rgba(16,216,124,0.2)' : C.border}`,
              fontSize: 13, lineHeight: 1.6, color: C.text,
            }}>
              <MarkdownText text={msg.content} />
              {msg.toolsUsed?.length > 0 && (
                <div style={{ marginTop: 6, fontSize: 10, color: C.subtle }}>
                  Tools used: {msg.toolsUsed.join(', ')} · {msg.stepCount} steps
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: C.muted, fontSize: 12 }}>
            <Spinner size={14} /> {thinkingMsg}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 16px', display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask about stocks, taxes, portfolio strategy…"
          disabled={loading}
          style={{ flex: 1, padding: '9px 14px', background: '#0a1424', border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, outline: 'none' }}
        />
        <button onClick={send} disabled={!input.trim() || loading}
          style={{ width: 38, height: 38, borderRadius: 10, background: input.trim() && !loading ? C.green : C.card2, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Send size={15} color={input.trim() && !loading ? '#03180d' : C.subtle} />
        </button>
      </div>
    </Card>
  )
}

/* ── Main Page ─────────────────────────────────────────────────────────────── */
export default function Research() {
  const [status, setStatus] = useState(null)
  const [portfolio, setPortfolio] = useState([])

  useEffect(() => {
    fetch('/api/perplexity/status').then(r => r.json()).then(setStatus).catch(() => {})
    const saved = JSON.parse(localStorage.getItem('portfolio') || '[]')
    setPortfolio(saved)
  }, [])

  const apiKey = status?.configured

  const QUICK_PROMPTS = [
    'What is the current S&P 500 level and outlook for the rest of 2026?',
    'Should I buy bonds or stocks given current Fed policy?',
    'What are the best dividend ETFs for 2026?',
    'Explain tax-loss harvesting in simple terms',
    'What is the 4% rule for retirement?',
  ]

  return (
    <div>
      <PageHeader
        title="AI Research Agent"
        subtitle="6 wealth management skills powered by a ReAct reasoning loop · Thought → Action → Observation · Ollama llama3.2 (local, free) · Real financial data tools"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(16,216,124,0.08)', border: `1px solid rgba(16,216,124,0.2)`, borderRadius: 8 }}>
              <Globe size={12} color={C.green} />
              <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>
                ReAct Agent · Ollama llama3.2 · 8 tools
              </span>
            </div>
          </div>
        }
      />

      <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Setup instructions when not configured */}
        {status && !apiKey && (
          <div style={{ padding: '16px 20px', background: 'rgba(245,166,35,0.06)', border: `1px solid rgba(245,166,35,0.2)`, borderRadius: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: C.amber }}>⚡ Setup Required — Choose a free option:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
              <div style={{ padding: '12px 14px', background: '#080e1d', borderRadius: 8, border: `1px solid ${C.border}` }}>
                <div style={{ fontWeight: 600, marginBottom: 6, color: C.text }}>Option A — Ollama (100% local, free)</div>
                <div style={{ ...mono, fontSize: 11, color: C.green, lineHeight: 2 }}>
                  1. Install: <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" style={{ color: C.blue }}>ollama.com</a><br />
                  2. ollama pull llama3.2<br />
                  3. Restart backend
                </div>
              </div>
              <div style={{ padding: '12px 14px', background: '#080e1d', borderRadius: 8, border: `1px solid ${C.border}` }}>
                <div style={{ fontWeight: 600, marginBottom: 6, color: C.text }}>Option B — Free search API (+ Ollama)</div>
                <div style={{ ...mono, fontSize: 11, color: C.green, lineHeight: 2 }}>
                  Tavily: <a href="https://tavily.com" target="_blank" rel="noopener noreferrer" style={{ color: C.blue }}>tavily.com</a> (1k/mo free)<br />
                  Exa: <a href="https://exa.ai" target="_blank" rel="noopener noreferrer" style={{ color: C.blue }}>exa.ai</a> (trial credits)<br />
                  Serper: <a href="https://serper.dev" target="_blank" rel="noopener noreferrer" style={{ color: C.blue }}>serper.dev</a> (2.5k/mo free)
                </div>
              </div>
            </div>
            <div style={{ ...mono, fontSize: 12, background: '#080e1d', padding: '10px 14px', borderRadius: 8, marginTop: 10, color: C.green }}>
              # .env — add one of these:<br />
              TAVILY_API_KEY=tvly-...<br />
              EXA_API_KEY=...<br />
              SERPER_API_KEY=...
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>Then restart: <code style={{ ...mono }}>node backend/server.js</code></div>
          </div>
        )}

        {/* Skills grid — 2 columns */}
        <div>
          <div style={{ fontSize: 11, color: C.subtle, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
            Wealth Management Skills — ReAct Agent (Thought → Action → Observation)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {SKILLS.map(skill => (
              <SkillCard key={skill.id} skill={skill} portfolio={portfolio} apiKey={apiKey} />
            ))}
          </div>
        </div>

        {/* Chat */}
        <div>
          <div style={{ fontSize: 11, color: C.subtle, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
            Free-Form Chat — Your Personal AI Financial Advisor
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16, alignItems: 'start' }}>
            <ChatPanel apiKey={apiKey} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, color: C.subtle, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Quick Prompts</div>
              {QUICK_PROMPTS.map((p, i) => (
                <div key={i} onClick={() => { /* dispatch to chat — handled by user */ }}
                  style={{ padding: '9px 12px', background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.muted, cursor: 'pointer', lineHeight: 1.5, transition: 'all 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.color = C.text }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}>
                  {p}
                </div>
              ))}
              <div style={{ marginTop: 8, padding: '12px', background: 'rgba(16,216,124,0.04)', border: `1px solid rgba(16,216,124,0.1)`, borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: C.green, fontWeight: 600, marginBottom: 4 }}>💡 Powered by</div>
                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
                  Search: <strong style={{ color: C.text }}>{status?.activeProvider || 'auto-detect'}</strong> · LLM: <strong style={{ color: C.text }}>Ollama llama3.2</strong> (local, free). Skills adapted from the <strong style={{ color: C.text }}>Anthropic financial-services</strong> open-source repo (wealth-management vertical).
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
