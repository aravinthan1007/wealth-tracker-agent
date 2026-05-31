import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  FlaskConical, Play, ChevronDown, ChevronUp, CheckCircle2, XCircle,
  RefreshCw, Database, Info, BarChart3, AlertTriangle, Shield,
} from 'lucide-react'
import { C, sans, mono, PageHeader, Card, Btn, Badge, Spinner } from '../components/ui'

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_META = {
  groundedness: { label: 'Groundedness',      color: C.blue,   icon: Shield,        desc: 'Does the answer match tool data? No hallucination.' },
  correctness:  { label: 'Correctness',        color: C.green,  icon: CheckCircle2,  desc: 'Does the answer get the key facts right?' },
  soundness:    { label: 'Financial Soundness',color: C.purple, icon: BarChart3,      desc: 'Does the advice follow sound financial principles?' },
}

const EVAL_TYPE_LABELS = {
  groundedness: 'Groundedness',
  correctness:  'Correctness',
  soundness:    'Soundness',
  toolSelection:'Tool Selection',
}

function scoreColor(s) {
  if (s == null) return C.muted
  if (s >= 0.8)  return C.green
  if (s >= 0.6)  return C.amber
  return C.red
}

function ScoreBar({ score, width = 120 }) {
  if (score == null) return <span style={{ color: C.subtle, fontSize: 12, fontFamily: mono }}>—</span>
  const pct = Math.round(score * 100)
  const color = scoreColor(score)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width, height: 6, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s' }} />
      </div>
      <span style={{ color, fontFamily: mono, fontSize: 12, fontWeight: 600, minWidth: 34 }}>{pct}%</span>
    </div>
  )
}

function PassBadge({ pass }) {
  return pass
    ? <Badge style={{ background: C.greenBg, color: C.green, border: `1px solid ${C.greenBorder}` }}>PASS</Badge>
    : <Badge style={{ background: C.redBg, color: C.red, border: `1px solid rgba(240,80,96,0.3)` }}>FAIL</Badge>
}

// ── Summary strip ─────────────────────────────────────────────────────────────

function SummaryStrip({ summary }) {
  if (!summary) return null
  const { total, passed, failed, passRate, avgScore, byCategory } = summary

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 20 }}>
      {[
        { label: 'Total',     value: total,         color: C.text },
        { label: 'Passed',    value: passed,         color: C.green },
        { label: 'Failed',    value: failed,         color: C.red },
        { label: 'Pass Rate', value: `${passRate}%`, color: passRate >= 70 ? C.green : passRate >= 50 ? C.amber : C.red },
        { label: 'Avg Score', value: `${Math.round(avgScore * 100)}%`, color: scoreColor(avgScore) },
      ].map(item => (
        <Card key={item.label} style={{ padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 700, color: item.color }}>{item.value}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</div>
        </Card>
      ))}
    </div>
  )
}

// ── Per-category breakdown ────────────────────────────────────────────────────

function CategoryBreakdown({ byCategory }) {
  if (!byCategory) return null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginBottom: 20 }}>
      {Object.entries(byCategory).map(([cat, data]) => {
        const meta = CATEGORY_META[cat] || { label: cat, color: C.muted, desc: '' }
        const Icon = meta.icon || Info
        return (
          <Card key={cat} style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Icon size={15} color={meta.color} />
              <span style={{ fontWeight: 600, color: meta.color, fontSize: 13 }}>{meta.label}</span>
            </div>
            <div style={{ fontSize: 11, color: C.subtle, marginBottom: 10 }}>{meta.desc}</div>
            <ScoreBar score={data.avgScore} width={100} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: C.muted }}>
              <span>{data.passed}/{data.total} passed</span>
              <span style={{ color: data.passRate >= 70 ? C.green : C.amber }}>{data.passRate}% pass rate</span>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ── Result row ────────────────────────────────────────────────────────────────

function ResultRow({ result, inProgress }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '80px 1fr 100px 140px 80px',
          gap: 12,
          padding: '12px 16px',
          alignItems: 'center',
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onClick={() => setOpen(o => !o)}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span style={{ fontFamily: mono, fontSize: 11, color: C.subtle }}>{result.id}</span>

        <div>
          <div style={{ fontSize: 13, color: C.text, marginBottom: 3 }}>{result.question}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{
              fontSize: 10, padding: '2px 6px', borderRadius: 4,
              background: (CATEGORY_META[result.category]?.color || C.muted) + '22',
              color: CATEGORY_META[result.category]?.color || C.muted,
            }}>
              {CATEGORY_META[result.category]?.label || result.category}
            </span>
            {result.toolsUsed?.slice(0, 2).map(t => (
              <span key={t} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: C.card2, color: C.subtle }}>{t}</span>
            ))}
          </div>
        </div>

        <ScoreBar score={result.overallScore} width={80} />

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Object.entries(result.scores || {}).map(([type, s]) => (
            <div key={type} style={{ fontSize: 10, color: scoreColor(s.score), fontFamily: mono }}>
              {EVAL_TYPE_LABELS[type]?.slice(0, 4)}: {Math.round(s.score * 100)}%
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {inProgress
            ? <Spinner size={14} />
            : <PassBadge pass={result.pass} />}
          {open ? <ChevronUp size={14} color={C.subtle} /> : <ChevronDown size={14} color={C.subtle} />}
        </div>
      </div>

      {open && (
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Answer */}
          <div>
            <div style={{ fontSize: 11, color: C.subtle, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Agent Answer</div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, background: C.card2, padding: '10px 14px', borderRadius: 8, whiteSpace: 'pre-wrap' }}>
              {result.answer || <span style={{ color: C.subtle }}>No answer captured</span>}
            </div>
          </div>

          {/* Per-evaluator breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10 }}>
            {Object.entries(result.scores || {}).map(([type, s]) => (
              <div key={type} style={{ background: C.card2, borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{EVAL_TYPE_LABELS[type] || type}</span>
                  <ScoreBar score={s.score} width={70} />
                </div>
                {s.explanation && (
                  <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{s.explanation}</div>
                )}
                {s.keywordScore != null && (
                  <div style={{ fontSize: 11, color: C.subtle, marginTop: 4 }}>
                    keyword: {Math.round(s.keywordScore * 100)}% · llm: {s.llmScore != null ? Math.round(s.llmScore * 100) + '%' : '—'}
                  </div>
                )}
              </div>
            ))}
          </div>

          {result.error && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: C.red, fontSize: 12 }}>
              <AlertTriangle size={13} />
              Agent error: {result.error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Architecture table ────────────────────────────────────────────────────────

function ArchTable() {
  const rows = [
    ['Copilot Q&A',               '✅ Gemini + ReAct', '✅ Memory', '✅', '✅ 3 evals'],
    ['Stock AI Verdict',          '✅ Gemini (single call)', '—', '✅', '✅ groundedness + soundness'],
    ['Goal trade-off advice',     '✅ Gemini', '✅ Memory', '✅', '✅ soundness'],
    ['Goal inference rules',      '❌ code', '—', 'policy config', '❌ unit tests'],
    ['Feasibility math (FV)',     '❌ code', '—', '—', '❌ unit tests'],
    ['Net worth / Sankey',        '❌ code', '—', '—', '❌'],
    ['Live quotes / market data', '❌ MCP/API', '—', '—', '❌'],
  ]
  const th = { fontSize: 11, color: C.subtle, padding: '6px 10px', textAlign: 'left',
               textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${C.border}` }
  const td = { fontSize: 12, color: C.text, padding: '8px 10px', borderBottom: `1px solid ${C.border}22` }

  return (
    <Card style={{ overflow: 'hidden', marginBottom: 20 }}>
      <div style={{ padding: '14px 16px 8px', fontWeight: 600, fontSize: 13, color: C.text }}>
        What gets evaluated vs. unit-tested
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Component', 'LLM Layer', 'Memory', 'Skills', 'Eval Strategy'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} style={{ ...td, color: j === 0 ? C.text : cell.startsWith('✅') ? C.green : cell.startsWith('❌') ? C.subtle : C.muted }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Evals() {
  const [tab, setTab]           = useState('results')  // 'results' | 'dataset' | 'arch'
  const [results, setResults]   = useState(null)
  const [dataset, setDataset]   = useState(null)
  const [phase, setPhase]       = useState('idle')     // 'idle' | 'running' | 'done'
  const [progress, setProgress] = useState([])         // { id, done, pass, overallScore }
  const [filter, setFilter]     = useState('all')
  const [loading, setLoading]   = useState(true)
  const abortRef = useRef(null)

  // Load last results and dataset on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/evals/results').then(r => r.json()),
      fetch('/api/evals/dataset').then(r => r.json()),
    ]).then(([res, ds]) => {
      if (res.results) setResults(res)
      setDataset(ds)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const runEvals = useCallback(async () => {
    if (phase === 'running') return
    setPhase('running')
    setProgress([])

    try {
      const r = await fetch('/api/evals/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filter !== 'all' ? { categories: [filter] } : {}),
      })

      const reader = r.body.getReader()
      const dec    = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n\n')
        buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'start') {
              setProgress(Array.from({ length: event.total }, (_, i) => ({ pending: true, index: i })))
            } else if (event.type === 'done') {
              setProgress(prev => {
                const next = [...prev]
                const idx  = next.findIndex(p => p.pending)
                if (idx >= 0) next[idx] = event.result
                return next
              })
            } else if (event.type === 'complete') {
              // Refetch full results
              fetch('/api/evals/results').then(r => r.json()).then(res => {
                if (res.results) setResults(res)
              })
              setPhase('done')
              setTab('results')
            } else if (event.type === 'error') {
              setPhase('idle')
            }
          } catch {}
        }
      }
    } catch (e) {
      console.error('[evals] SSE error:', e)
      setPhase('idle')
    }
  }, [phase, filter])

  const filtered = results?.results?.filter(r => filter === 'all' || r.category === filter) || []

  return (
    <div id="evals" style={{ padding: '24px 0' }}>
      <PageHeader
        title="Eval Suite"
        subtitle={results?.summary
          ? `Last run ${new Date(results.runAt).toLocaleString()} · ${results.summary.passed}/${results.summary.total} passed`
          : 'Golden dataset · Gemini-as-judge evaluators · Arize Phoenix logging'}
        icon={<FlaskConical size={20} color={C.purple} />}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Filter */}
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{
                background: C.card2, color: C.text, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer',
              }}
            >
              <option value="all">All categories</option>
              <option value="groundedness">Groundedness</option>
              <option value="correctness">Correctness</option>
              <option value="soundness">Soundness</option>
            </select>

            <Btn
              onClick={runEvals}
              disabled={phase === 'running'}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {phase === 'running'
                ? <><Spinner size={13} /> Running…</>
                : <><Play size={13} /> Run Evals</>}
            </Btn>
          </div>
        }
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: C.card2, borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[
          { id: 'results', label: 'Results' },
          { id: 'dataset', label: 'Dataset' },
          { id: 'arch',    label: 'Architecture' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
              background: tab === t.id ? C.card : 'transparent',
              color:      tab === t.id ? C.text : C.muted,
              fontWeight: tab === t.id ? 600 : 400,
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Running progress */}
      {phase === 'running' && (
        <Card style={{ marginBottom: 20, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Spinner size={14} />
            <span style={{ fontSize: 13, color: C.text }}>Evaluating… ({progress.filter(p => !p.pending).length}/{progress.length})</span>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {progress.map((p, i) => (
              <div
                key={i}
                style={{
                  width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 10,
                  background: p.pending ? C.card2 : p.pass ? C.greenBg : C.redBg,
                  border: `1px solid ${p.pending ? C.border : p.pass ? C.greenBorder : 'rgba(240,80,96,0.3)'}`,
                  color: p.pending ? C.subtle : p.pass ? C.green : C.red,
                }}
                title={p.id || `Example ${i + 1}`}
              >
                {p.pending ? '·' : p.pass ? '✓' : '✗'}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Results tab ── */}
      {tab === 'results' && (
        <>
          {loading && <div style={{ textAlign: 'center', padding: 40 }}><Spinner size={20} /></div>}
          {!loading && !results && (
            <Card style={{ padding: 32, textAlign: 'center' }}>
              <FlaskConical size={32} color={C.subtle} style={{ marginBottom: 12 }} />
              <div style={{ color: C.text, marginBottom: 6 }}>No results yet</div>
              <div style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>Click "Run Evals" to score 20 golden examples with Gemini-as-judge</div>
              <Btn onClick={runEvals}><Play size={13} /> Run Evals</Btn>
            </Card>
          )}
          {results && (
            <>
              <SummaryStrip summary={results.summary} />
              <CategoryBreakdown byCategory={results.summary?.byCategory} />

              <Card style={{ overflow: 'hidden' }}>
                {/* Table header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr 100px 140px 80px',
                  gap: 12,
                  padding: '10px 16px',
                  borderBottom: `1px solid ${C.border}`,
                }}>
                  {['ID', 'Question', 'Score', 'Breakdown', 'Result'].map(h => (
                    <span key={h} style={{ fontSize: 11, color: C.subtle, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
                  ))}
                </div>

                {filtered.length === 0 && (
                  <div style={{ padding: 24, textAlign: 'center', color: C.muted, fontSize: 13 }}>No results for this filter</div>
                )}
                {filtered.map(result => (
                  <ResultRow
                    key={result.id}
                    result={result}
                    inProgress={false}
                  />
                ))}
              </Card>

              <div style={{ marginTop: 12, fontSize: 11, color: C.subtle, textAlign: 'right' }}>
                Results logged as EVALUATOR spans in Arize Phoenix · data/db/evalResults.json
              </div>
            </>
          )}
        </>
      )}

      {/* ── Dataset tab ── */}
      {tab === 'dataset' && (
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: C.text }}>
              Golden Dataset · {dataset?.count || 0} examples
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.entries(CATEGORY_META).map(([k, v]) => (
                <span key={k} style={{ fontSize: 11, color: v.color }}>
                  {dataset?.examples?.filter(e => e.category === k).length || 0} {v.label}
                </span>
              ))}
            </div>
          </div>

          {(dataset?.examples || []).map((ex, i) => (
            <div key={ex.id} style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}22`, display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12 }}>
              <div>
                <span style={{ fontFamily: mono, fontSize: 11, color: C.subtle }}>{ex.id}</span>
                <div style={{ marginTop: 4 }}>
                  {ex.evalTypes?.map(t => (
                    <div key={t} style={{ fontSize: 10, color: C.muted }}>{EVAL_TYPE_LABELS[t] || t}</div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: C.text, marginBottom: 4 }}>{ex.question}</div>
                <div style={{ fontSize: 11, color: C.subtle, marginBottom: 6 }}>{ex.expectedFacts}</div>
                {ex.mustContain?.length > 0 && (
                  <div style={{ fontSize: 11, color: C.green }}>
                    Must contain: {ex.mustContain.map(k => `"${k}"`).join(', ')}
                  </div>
                )}
                {ex.mustNotContain?.length > 0 && (
                  <div style={{ fontSize: 11, color: C.red }}>
                    Must not contain: {ex.mustNotContain.map(k => `"${k}"`).join(', ')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* ── Architecture tab ── */}
      {tab === 'arch' && (
        <>
          <ArchTable />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14 }}>
            {[
              {
                title: '1 · Groundedness',
                color: C.blue,
                desc: 'Most critical for finance. Checks every claimed dollar amount, percentage, and account name against the actual tool data retrieved during the agent run. Hallucinated numbers in financial advice are dangerous.',
              },
              {
                title: '2 · Correctness',
                color: C.green,
                desc: 'Blends fast keyword checks (mustContain / mustNotContain) with Gemini-as-judge semantic scoring against known expected facts. Applied to questions with deterministic right answers.',
              },
              {
                title: '3 · Financial Soundness',
                color: C.purple,
                desc: 'LLM-as-judge CFP perspective: does the advice follow the correct priority waterfall (emergency → debt → invest), include appropriate disclaimers, and avoid reckless recommendations?',
              },
              {
                title: '4 · Tool Selection',
                color: C.amber,
                desc: 'Deterministic code check — did the ReAct agent call the expected tools? No LLM needed. Catches cases where the agent skips a required data source and answers from hallucination instead.',
              },
            ].map(card => (
              <Card key={card.title} style={{ padding: '16px 18px' }}>
                <div style={{ fontWeight: 700, color: card.color, marginBottom: 8, fontSize: 13 }}>{card.title}</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{card.desc}</div>
              </Card>
            ))}
          </div>

          <Card style={{ marginTop: 14, padding: '14px 18px' }}>
            <div style={{ fontWeight: 600, color: C.text, marginBottom: 8, fontSize: 13 }}>Core principle</div>
            <div style={{ fontFamily: mono, fontSize: 12, color: C.muted, lineHeight: 1.8, background: C.card2, padding: '10px 14px', borderRadius: 8 }}>
              generative layer  → Gemini + ReAct / skills / memory  + <span style={{ color: C.green }}>evals</span>{'\n'}
              analytical layer  → deterministic code                  + <span style={{ color: C.blue }}>unit tests</span>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
