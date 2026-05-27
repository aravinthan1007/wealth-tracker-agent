import React, { useState, useEffect, useRef } from 'react'
import {
  Brain, Search, TrendingUp, DollarSign, BarChart2, RefreshCw, Scissors,
  FileText, BookOpen, Send, ExternalLink, Zap, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle, Globe,
} from 'lucide-react'
import { C, mono, fmt, PageHeader, Card, Btn, Badge, Input, Spinner, EmptyState } from '../components/ui'

/* ── Skill definitions (Anthropic financial-services wealth-management vertical) ── */
const SKILLS = [
  {
    id: 'market-research',
    label: 'Market Research',
    icon: Search,
    color: C.blue,
    desc: 'Live internet research on any stock, ETF, or sector with real-time prices, analyst ratings, and news.',
    endpoint: '/api/perplexity/market-research',
    fields: [{ key: 'query', label: 'Stock / Sector to research', placeholder: 'e.g. NVDA, AI semiconductor sector, S&P 500 outlook' }],
    buildBody: f => ({ query: f.query }),
  },
  {
    id: 'portfolio-rebalance',
    label: 'Portfolio Rebalance',
    icon: RefreshCw,
    color: C.green,
    desc: 'Analyze portfolio drift vs. target allocation. Get tax-aware trade recommendations.',
    endpoint: '/api/perplexity/portfolio-rebalance',
    fields: [
      { key: 'riskProfile', label: 'Risk Profile', placeholder: 'conservative / moderate / aggressive', default: 'moderate' },
    ],
    buildBody: (f, portfolio) => ({ holdings: portfolio, riskProfile: f.riskProfile || 'moderate' }),
    needsPortfolio: true,
  },
  {
    id: 'financial-plan',
    label: 'Financial Plan',
    icon: FileText,
    color: '#a78bfa',
    desc: 'Comprehensive plan: retirement projections, savings rate, debt payoff, tax optimization using your real income/expense data.',
    endpoint: '/api/perplexity/financial-plan',
    fields: [
      { key: 'age', label: 'Your Age', placeholder: '30', type: 'number' },
      { key: 'retirementAge', label: 'Target Retirement Age', placeholder: '65', type: 'number' },
      { key: 'additionalContext', label: 'Additional Context (optional)', placeholder: 'e.g. planning to buy house in 2 years, have 401k at work' },
    ],
    buildBody: f => ({ age: parseInt(f.age) || 30, retirementAge: parseInt(f.retirementAge) || 65, additionalContext: f.additionalContext }),
  },
  {
    id: 'tax-loss-harvesting',
    label: 'Tax-Loss Harvesting',
    icon: Scissors,
    color: C.amber,
    desc: 'Find unrealized losses to harvest, suggest wash-sale-safe replacements, estimate tax savings.',
    endpoint: '/api/perplexity/tax-loss-harvesting',
    fields: [
      { key: 'ytdGains', label: 'YTD Realized Gains ($)', placeholder: '5000', type: 'number' },
      { key: 'taxBracket', label: 'Tax Bracket (%)', placeholder: '24', type: 'number' },
    ],
    buildBody: (f, portfolio) => ({ holdings: portfolio, ytdGains: parseFloat(f.ytdGains) || 0, taxBracket: parseInt(f.taxBracket) || 24 }),
    needsPortfolio: true,
  },
  {
    id: 'client-review',
    label: 'Quarterly Review',
    icon: BookOpen,
    color: '#f472b6',
    desc: 'Professional quarterly portfolio & financial health review using your live data and real market performance.',
    endpoint: '/api/perplexity/client-review',
    fields: [
      { key: 'period', label: 'Review Period', placeholder: 'Q2 2026', default: 'Q2 2026' },
    ],
    buildBody: (f, portfolio) => ({ holdings: portfolio, period: f.period || 'Q2 2026' }),
    needsPortfolio: true,
  },
  {
    id: 'investment-proposal',
    label: 'Investment Proposal',
    icon: TrendingUp,
    color: '#38bdf8',
    desc: 'Get a specific investment proposal with exact ETF allocations, expected returns, and risk analysis.',
    endpoint: '/api/perplexity/investment-proposal',
    fields: [
      { key: 'targetAmount', label: 'Amount to Invest ($)', placeholder: '10000', type: 'number' },
      { key: 'goal', label: 'Goal', placeholder: 'long-term growth / income / capital preservation' },
      { key: 'riskProfile', label: 'Risk Profile', placeholder: 'moderate', default: 'moderate' },
      { key: 'timeHorizon', label: 'Time Horizon (years)', placeholder: '10', type: 'number' },
    ],
    buildBody: f => ({ targetAmount: parseFloat(f.targetAmount) || 10000, goal: f.goal || 'long-term growth', riskProfile: f.riskProfile || 'moderate', timeHorizon: parseInt(f.timeHorizon) || 10 }),
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

function SkillCard({ skill, portfolio, apiKey }) {
  const [fields, setFields] = useState(() => {
    const init = {}
    skill.fields.forEach(f => { init[f.key] = f.default || '' })
    return init
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const Icon = skill.icon

  async function run() {
    setLoading(true)
    setError(null)
    setResult(null)
    setExpanded(true)
    try {
      const body = skill.buildBody(fields, portfolio)
      const res = await fetch(skill.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setResult(data)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <Card style={{ padding: 0, overflow: 'hidden', border: result ? `1px solid ${skill.color}30` : `1px solid ${C.border}` }}>
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
          {result && <Badge color="green">Done</Badge>}
          {skill.needsPortfolio && portfolio.length === 0 && <Badge color="amber">No holdings</Badge>}
          {expanded ? <ChevronUp size={14} color={C.subtle} /> : <ChevronDown size={14} color={C.subtle} />}
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Input fields */}
          {skill.fields.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: skill.fields.length > 2 ? 'repeat(2, 1fr)' : 'repeat(' + skill.fields.length + ', 1fr)', gap: 10 }}>
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
              ⚠ Add holdings on the Portfolio page for best results. The AI will use example data.
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={run} disabled={loading || !apiKey}>
              {loading ? <><Spinner size={12} /> Running…</> : <><Zap size={12} /> Run Skill</>}
            </Btn>
            {result && <Btn onClick={() => setResult(null)} variant="secondary" size="sm">Clear</Btn>}
          </div>

          {!apiKey && (
            <div style={{ fontSize: 12, color: '#f05060', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={12} /> Set PERPLEXITY_API_KEY in your .env to use these skills
            </div>
          )}

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(240,80,96,0.08)', border: `1px solid rgba(240,80,96,0.2)`, borderRadius: 8, fontSize: 12, color: '#f05060' }}>
              {error}
            </div>
          )}

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '20px 0', alignItems: 'center' }}>
              <Spinner />
              <div style={{ fontSize: 12, color: C.muted }}>Searching the web for real-time financial data…</div>
            </div>
          )}

          {result && (
            <div>
              {/* Citations */}
              {result.citations?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  <span style={{ fontSize: 11, color: C.subtle }}>Sources:</span>
                  {result.citations.slice(0, 5).map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: C.blue, textDecoration: 'none', padding: '2px 8px', background: 'rgba(61,142,240,0.1)', borderRadius: 4 }}>
                      <Globe size={9} /> {new URL(url).hostname}
                    </a>
                  ))}
                </div>
              )}
              {/* Result text */}
              <div style={{ background: '#080e1d', borderRadius: 10, padding: '16px 20px', border: `1px solid ${C.border}`, maxHeight: 600, overflowY: 'auto' }}>
                <MarkdownText text={result.text} />
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: C.subtle, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={10} color={C.green} />
                Powered by Perplexity {MODEL} · Internet-grounded answer · Not investment advice
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
    { role: 'assistant', content: 'Hi! I\'m your AI wealth advisor with real-time internet access. Ask me anything — stock analysis, tax questions, portfolio strategy, market outlook, or anything finance-related. I\'ll use your saved income and expense data for personalized answers.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send() {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    const history = messages.filter(m => m.role !== 'assistant' || messages.indexOf(m) > 0)
      .map(m => ({ role: m.role, content: m.content }))
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)
    try {
      const res = await fetch('/api/perplexity/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, conversationHistory: history }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || data.error, citations: data.citations }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: ' + e.message }])
    }
    setLoading(false)
  }

  return (
    <Card style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 520 }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Brain size={16} color={C.green} />
        <span style={{ fontWeight: 700, fontSize: 14 }}>AI Wealth Advisor Chat</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: apiKey ? C.green : '#f05060' }} />
          <span style={{ fontSize: 11, color: C.subtle }}>{apiKey ? 'Perplexity sonar-pro' : 'API key missing'}</span>
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
              {msg.citations?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                  {msg.citations.slice(0, 3).map((url, j) => (
                    <a key={j} href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: C.blue, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <ExternalLink size={8} /> {new URL(url).hostname}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: C.muted, fontSize: 12 }}>
            <Spinner size={14} /> Searching web for real-time data…
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
          placeholder={apiKey ? 'Ask about stocks, taxes, portfolio strategy…' : 'Set PERPLEXITY_API_KEY to enable chat'}
          disabled={!apiKey || loading}
          style={{ flex: 1, padding: '9px 14px', background: '#0a1424', border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, outline: 'none' }}
        />
        <button onClick={send} disabled={!input.trim() || loading || !apiKey}
          style={{ width: 38, height: 38, borderRadius: 10, background: apiKey && input.trim() ? C.green : C.card2, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Send size={15} color={apiKey && input.trim() ? '#03180d' : C.subtle} />
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
        subtitle={<>6 wealth management skills · Powered by Perplexity <span style={{ color: C.blue }}>sonar-pro</span> with live internet access · Adapted from <a href="https://github.com/anthropics/financial-services" target="_blank" rel="noopener noreferrer" style={{ color: C.blue, textDecoration: 'none' }}>Anthropics financial-services</a></>}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: apiKey ? 'rgba(16,216,124,0.08)' : 'rgba(240,80,96,0.08)', border: `1px solid ${apiKey ? 'rgba(16,216,124,0.2)' : 'rgba(240,80,96,0.2)'}`, borderRadius: 8 }}>
              <Globe size={12} color={apiKey ? C.green : '#f05060'} />
              <span style={{ fontSize: 12, color: apiKey ? C.green : '#f05060', fontWeight: 600 }}>{apiKey ? 'Internet access active' : 'PERPLEXITY_API_KEY missing'}</span>
            </div>
          </div>
        }
      />

      <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* API key instructions if not set */}
        {status && !apiKey && (
          <div style={{ padding: '16px 20px', background: 'rgba(240,80,96,0.06)', border: `1px solid rgba(240,80,96,0.2)`, borderRadius: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6, color: '#f05060' }}>Setup Required</div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
              Get a free API key at <a href="https://www.perplexity.ai/settings/api" target="_blank" rel="noopener noreferrer" style={{ color: C.blue }}>perplexity.ai/settings/api</a>, then add to your project:
            </div>
            <div style={{ ...mono, fontSize: 12, background: '#080e1d', padding: '10px 14px', borderRadius: 8, marginTop: 10, color: C.green }}>
              # Create .env file in project root<br />
              PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxxxxxxxxxx
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>Then restart: <code style={{ ...mono }}>node backend/server.js</code></div>
          </div>
        )}

        {/* Skills grid — 2 columns */}
        <div>
          <div style={{ fontSize: 11, color: C.subtle, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
            Wealth Management Skills — Anthropic FSI Reference Implementation
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
                  Perplexity <strong style={{ color: C.text }}>sonar-pro</strong> model with real-time web search. Skills adapted from the <strong style={{ color: C.text }}>Anthropic financial-services</strong> open-source repo (wealth-management vertical).
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
