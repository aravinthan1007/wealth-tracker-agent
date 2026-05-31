import React, { useState, useEffect, useCallback } from 'react'
import {
  Shield, CreditCard, Home, Sun, GraduationCap, TrendingUp,
  RefreshCw, Check, AlertTriangle, ChevronDown, ChevronUp,
  Pencil, X, Target, Sparkles, Info, CheckCircle2,
} from 'lucide-react'
import { C, fmt, fmtK, PageHeader, Card, Btn, Badge, Spinner, mono } from '../components/ui'

/* ── Icon + color map per goal type ─────────────────────────────────────── */
const TYPE_META = {
  emergency_fund:    { Icon: Shield,         color: C.amber,  label: 'Safety net' },
  debt_payoff:       { Icon: CreditCard,     color: C.red,    label: 'Debt freedom' },
  home_down_payment: { Icon: Home,           color: C.blue,   label: 'Homeownership' },
  retirement:        { Icon: Sun,            color: C.green,  label: 'Retirement' },
  education_fund:    { Icon: GraduationCap,  color: C.purple, label: 'Education' },
  investment_growth: { Icon: TrendingUp,     color: '#22d3ee',label: 'Wealth growth' },
}

const PRIORITY_LABELS = { 1: 'Highest', 2: 'High', 3: 'Medium', 4: 'Medium', 5: 'Medium', 6: 'Optional' }

/* ── Currency helpers ────────────────────────────────────────────────────── */
const fmtAmt  = n => isFinite(n) ? fmt.format(n) : '$0'
const fmtShort = n => {
  if (!isFinite(n)) return '$0'
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (Math.abs(n) >= 1e3) return `$${Math.round(n / 1e3)}k`
  return `$${Math.round(n)}`
}

function monthsUntil(dateStr) {
  return Math.max(1, Math.round((new Date(dateStr) - Date.now()) / (30.5 * 24 * 3600 * 1000)))
}

/* ── Feasibility strip ──────────────────────────────────────────────────── */
function FeasibilityStrip({ goals, context }) {
  const activeGoals = goals.filter(g => g.active)
  const totalRequired = activeGoals.reduce((s, g) => s + (g.monthlyContribution || 0), 0)
  const surplus = context?.surplus || 0
  const feasible = surplus >= totalRequired
  const gap = totalRequired - surplus
  const maxBar = Math.max(totalRequired, surplus, 1)

  const GOAL_COLORS = goals.map(g => TYPE_META[g.type]?.color || C.muted)

  return (
    <div style={{
      background: feasible ? C.greenBg : C.redBg,
      border: `1px solid ${feasible ? C.greenBorder : 'rgba(240,80,96,0.25)'}`,
      borderRadius: 12, padding: '14px 20px', marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {feasible
            ? <CheckCircle2 size={15} color={C.green} />
            : <AlertTriangle size={15} color={C.red} />}
          <span style={{ fontSize: 13, fontWeight: 600, color: feasible ? C.green : C.red }}>
            {feasible
              ? `Feasible — $${Math.round(surplus - totalRequired).toLocaleString()}/mo to spare`
              : `Gap of $${Math.round(gap).toLocaleString()}/mo — trim goals or increase income`}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, ...mono }}>
          <span style={{ color: C.muted }}>Income <span style={{ color: C.green, fontWeight: 600 }}>{fmtShort(context?.totalMonthly)}/mo</span></span>
          <span style={{ color: C.muted }}>Expenses <span style={{ color: C.red, fontWeight: 600 }}>{fmtShort(context?.totalExpenses)}/mo</span></span>
          <span style={{ color: C.muted }}>Goals <span style={{ color: feasible ? C.amber : C.red, fontWeight: 600 }}>{fmtShort(totalRequired)}/mo</span></span>
        </div>
      </div>

      {/* Stacked contribution bar */}
      <div style={{ height: 8, borderRadius: 6, background: C.border, overflow: 'hidden', display: 'flex', position: 'relative' }}>
        {/* Surplus marker */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: 0,
          width: `${Math.min(surplus / maxBar * 100, 100)}%`,
          background: `${C.green}22`, borderRight: `2px solid ${C.green}`,
          zIndex: 1,
        }} />
        {/* Goal segments */}
        {activeGoals.map((g, i) => (
          <div key={g.id} style={{
            height: '100%',
            width: `${(g.monthlyContribution / maxBar) * 100}%`,
            background: GOAL_COLORS[goals.indexOf(g)] + 'cc',
            transition: 'width 0.3s ease',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
        {activeGoals.map((g, i) => {
          const color = GOAL_COLORS[goals.indexOf(g)]
          return (
            <span key={g.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: C.muted }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} />
              {g.label} <span style={{ ...mono, color }}>${g.monthlyContribution.toLocaleString()}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

/* ── Inline editable field ───────────────────────────────────────────────── */
function EditableAmount({ value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const start = () => { setDraft(String(Math.round(value))); setEditing(true) }
  const commit = () => {
    const n = parseFloat(draft.replace(/[^0-9.]/g, ''))
    if (isFinite(n) && n > 0) onChange(n)
    setEditing(false)
  }

  if (editing) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 13, color: C.muted }}>$</span>
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          style={{
            width: 110, padding: '3px 7px', borderRadius: 6,
            background: C.card2, border: `1px solid ${C.green}60`,
            color: C.text, fontSize: 14, fontWeight: 700, ...mono,
            outline: 'none',
          }}
        />
        <button onClick={commit} style={{ background: 'none', border: 'none', color: C.green, cursor: 'pointer', padding: 2 }}>
          <Check size={13} />
        </button>
      </div>
    )
  }

  return (
    <span
      onClick={start}
      title="Click to edit"
      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 6px', borderRadius: 6,
        border: '1px dashed transparent',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.border2 }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent' }}
    >
      <span style={{ fontSize: 21, fontWeight: 700, ...mono, color: C.text }}>{fmtAmt(value)}</span>
      <Pencil size={11} color={C.subtle} />
    </span>
  )
}

function EditableDate({ value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const commit = () => {
    if (draft) onChange(draft)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus type="date" value={draft}
        min={new Date().toISOString().slice(0, 10)}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        style={{
          padding: '3px 8px', borderRadius: 6,
          background: C.card2, border: `1px solid ${C.green}60`,
          color: C.text, fontSize: 12, outline: 'none',
        }}
      />
    )
  }

  const d = new Date(value)
  const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  return (
    <span
      onClick={() => { setDraft(value); setEditing(true) }}
      title="Click to edit"
      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 12, color: C.muted, padding: '2px 5px', borderRadius: 5,
        border: '1px dashed transparent',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.border2 }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent' }}
    >
      {label} <Pencil size={9} color={C.subtle} />
    </span>
  )
}

/* ── Toggle switch ───────────────────────────────────────────────────────── */
function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
        background: on ? C.green : C.border2, transition: 'background 0.2s', position: 'relative', flexShrink: 0,
      }}
      title={on ? 'Turn off' : 'Turn on'}
    >
      <span style={{
        position: 'absolute', top: 3, left: on ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', display: 'block',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </button>
  )
}

/* ── Goal Card ───────────────────────────────────────────────────────────── */
function GoalCard({ goal, onChange, onRemove }) {
  const [expanded, setExpanded] = useState(false)
  const meta = TYPE_META[goal.type] || { Icon: Target, color: C.muted, label: '' }
  const { Icon, color } = meta
  const priorityLabel = PRIORITY_LABELS[goal.priority] || 'Optional'
  const months = monthsUntil(goal.targetDate)

  const updateAmount = (newAmt) => {
    const newMonthly = Math.round(newAmt / months)
    onChange({ ...goal, targetAmount: Math.round(newAmt), monthlyContribution: newMonthly })
  }

  const updateDate = (newDate) => {
    const newMonths = monthsUntil(newDate)
    const newMonthly = Math.round(goal.targetAmount / newMonths)
    onChange({ ...goal, targetDate: newDate, monthlyContribution: newMonthly })
  }

  return (
    <div style={{
      background: C.card,
      border: `1px solid ${goal.active ? color + '30' : C.border}`,
      borderRadius: 14,
      overflow: 'hidden',
      opacity: goal.active ? 1 : 0.55,
      transition: 'all 0.2s',
    }}>
      {/* Priority accent line */}
      <div style={{ height: 3, background: goal.active ? color : C.border }} />

      <div style={{ padding: '16px 20px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          {/* Icon */}
          <div style={{
            width: 40, height: 40, borderRadius: 11, flexShrink: 0,
            background: color + '18', border: `1px solid ${color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={18} color={color} />
          </div>

          {/* Title + priority */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{goal.label}</span>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                background: color + '18', color, border: `1px solid ${color}30`,
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}>{priorityLabel}</span>
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{meta.label}</div>
          </div>

          {/* Toggle + expand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <Toggle on={goal.active} onChange={v => onChange({ ...goal, active: v })} />
            <button
              onClick={() => setExpanded(e => !e)}
              style={{ background: 'none', border: 'none', color: C.subtle, cursor: 'pointer', padding: 4 }}
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* Metrics row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: C.subtle, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
              Target
            </div>
            <EditableAmount value={goal.targetAmount} onChange={updateAmount} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.subtle, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
              By
            </div>
            <div style={{ marginTop: 4 }}>
              <EditableDate value={goal.targetDate} onChange={updateDate} />
              <div style={{ fontSize: 11, color: C.subtle, marginTop: 1 }}>{months} months</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.subtle, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
              Monthly needed
            </div>
            <div style={{
              fontSize: 18, fontWeight: 700, ...mono,
              color: goal.active ? color : C.muted,
              marginTop: 4,
            }}>
              {fmtAmt(goal.monthlyContribution)}
            </div>
          </div>
        </div>

        {/* Expanded: reason + cards detail */}
        {expanded && (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
              <Info size={13} color={C.subtle} style={{ marginTop: 1, flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 13, color: C.muted, lineHeight: 1.55 }}>{goal.reason}</p>
            </div>

            {goal.meta?.cards && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {goal.meta.cards.map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted,
                    padding: '7px 10px', background: C.card2, borderRadius: 8, ...mono }}>
                    <span>{c.name}</span>
                    <span style={{ color: C.red }}>${Math.round(c.balance).toLocaleString()} @ {c.apr}%</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={onRemove}
              style={{ marginTop: 10, background: 'none', border: 'none', color: C.red, cursor: 'pointer',
                fontSize: 12, padding: '4px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <X size={12} /> Remove this goal
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Profile capture (Step 1) ────────────────────────────────────────────── */
function ProfileCapture({ onSubmit }) {
  const [age, setAge]   = useState('')
  const [deps, setDeps] = useState('0')
  const [loading, setLoading] = useState(false)
  const [err, setErr]   = useState('')

  const submit = async () => {
    const a = parseInt(age)
    const d = parseInt(deps)
    if (!isFinite(a) || a < 16 || a > 100) { setErr('Enter a valid age (16–100)'); return }
    if (!isFinite(d) || d < 0)             { setErr('Enter 0 or more dependents'); return }
    setLoading(true)
    await onSubmit(a, d)
    setLoading(false)
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 9,
    background: C.card2, border: `1px solid ${C.border2}`,
    color: C.text, fontSize: 16, fontWeight: 600, ...mono,
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 420, padding: 40 }}>
      <div style={{ maxWidth: 440, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, margin: '0 auto 16px',
            background: C.greenBg, border: `1px solid ${C.greenBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Target size={24} color={C.green} />
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: C.text }}>
            Two quick questions
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
            Your app already has your income, expenses, and debts.<br />
            These two signals are all the agent needs to propose your goals.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted,
              textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>
              Your age
            </label>
            <input
              type="number" min="16" max="100" placeholder="e.g. 32"
              value={age} onChange={e => setAge(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted,
              textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>
              Financial dependents <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(children, family members)</span>
            </label>
            <input
              type="number" min="0" max="20" placeholder="0"
              value={deps} onChange={e => setDeps(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              style={inputStyle}
            />
          </div>

          {err && <p style={{ margin: 0, fontSize: 12, color: C.red }}>{err}</p>}

          <Btn onClick={submit} disabled={loading} size="lg" style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}>
            {loading ? <Spinner size={14} /> : <Sparkles size={15} />}
            Analyze my finances
          </Btn>
        </div>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 11, color: C.subtle }}>
          The agent reads your income, expenses, and credit cards — no manual entry needed.
        </p>
      </div>
    </div>
  )
}

/* ── Saved confirmation banner ───────────────────────────────────────────── */
function SavedBanner({ onAskAI }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
      background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 10,
      padding: '12px 18px', marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <CheckCircle2 size={16} color={C.green} />
        <span style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>Goals saved</span>
        <span style={{ fontSize: 13, color: C.muted }}>— your agent will track progress from here.</span>
      </div>
      <button
        onClick={onAskAI}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
          padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
          background: C.greenBg, border: `1px solid ${C.greenBorder}`, color: C.green,
        }}
      >
        <Sparkles size={12} /> Ask AI about my plan
      </button>
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────────────────── */
export default function Goals() {
  const [phase, setPhase]     = useState('loading')  // loading | profile | analyzing | cards
  const [profile, setProfile] = useState(null)
  const [inferred, setInferred] = useState(null)
  const [goals, setGoals]     = useState([])
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [inferErr, setInferErr] = useState(null)

  /* ── Bootstrap ── */
  useEffect(() => { init() }, [])

  async function init() {
    try {
      const [prof, saved] = await Promise.all([
        fetch('/api/goals/profile').then(r => r.json()),
        fetch('/api/goals').then(r => r.json()),
      ])
      setProfile(prof)

      if (saved.length > 0) {
        // Already has saved goals — show them directly
        setGoals(saved)
        // Re-run inference to get fresh context for feasibility
        runInfer().then(d => d && setInferred(d))
        setPhase('cards')
      } else if (prof.age) {
        // Profile exists but no saved goals — auto-infer
        await runInfer(true)
      } else {
        // Fresh start — need age/dependents
        setPhase('profile')
      }
    } catch (e) {
      setInferErr(e.message)
      setPhase('profile')
    }
  }

  const runInfer = useCallback(async (setGoalsFromResult = false) => {
    setInferErr(null)
    try {
      const d = await fetch('/api/goals/infer').then(r => r.json())
      if (d.error) throw new Error(d.error)
      setInferred(d)
      if (setGoalsFromResult) {
        setGoals(d.suggestions)
        setPhase('cards')
      }
      return d
    } catch (e) {
      setInferErr(e.message)
      setPhase('cards')
      return null
    }
  }, [])

  async function handleProfileSubmit(age, dependents) {
    setPhase('analyzing')
    await fetch('/api/goals/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ age, dependents }),
    })
    await runInfer(true)
  }

  async function reanalyze() {
    setPhase('analyzing')
    await runInfer(true)
    setSaved(false)
  }

  function updateGoal(id, updated) {
    setGoals(gs => gs.map(g => g.id === id ? updated : g))
    setSaved(false)
  }

  function removeGoal(id) {
    setGoals(gs => gs.filter(g => g.id !== id))
    setSaved(false)
  }

  async function saveAll() {
    setSaving(true)
    await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goals),
    })
    setSaving(false)
    setSaved(true)
  }

  function askAI() {
    const activeGoals = goals.filter(g => g.active)
    const totalMonthly = activeGoals.reduce((s, g) => s + g.monthlyContribution, 0)
    window.dispatchEvent(new CustomEvent('wt:open-copilot', {
      detail: {
        question: `I have ${activeGoals.length} active financial goals requiring $${totalMonthly.toLocaleString()}/mo total. My goals are: ${activeGoals.map(g => g.label).join(', ')}. My monthly surplus is $${inferred?.context?.surplus?.toLocaleString() || '?'}. Is this plan realistic and what should I prioritize first?`,
      },
    }))
  }

  /* ── Render ── */
  return (
    <div>
      <PageHeader
        title="Financial Goals"
        subtitle="Agent-inferred goal plan — auto-built from your income, expenses, and debts"
        actions={
          phase === 'cards' && <>
            <Btn onClick={reanalyze} variant="secondary" size="sm"><RefreshCw size={12} />Re-analyze</Btn>
            <Btn onClick={saveAll} disabled={saving} size="sm">
              {saving ? <Spinner size={12} /> : <Check size={12} />}
              {saved ? 'Saved!' : 'Save goals'}
            </Btn>
          </>
        }
      />

      {phase === 'loading' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <Spinner />
        </div>
      )}

      {phase === 'profile' && (
        <ProfileCapture onSubmit={handleProfileSubmit} />
      )}

      {phase === 'analyzing' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 360, gap: 18 }}>
          <Spinner />
          <div style={{ fontSize: 14, color: C.muted }}>Reading your income, expenses, and debts…</div>
          <div style={{ fontSize: 13, color: C.subtle }}>Inference engine running</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {['Emergency fund', 'Debt check', 'Retirement', 'Feasibility'].map((s, i) => (
              <div key={i} style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 99,
                background: C.greenBg, border: `1px solid ${C.greenBorder}`, color: C.green,
                animation: `pulse ${0.8 + i * 0.2}s ease-in-out infinite alternate`,
              }}>{s}</div>
            ))}
          </div>
        </div>
      )}

      {phase === 'cards' && (
        <div style={{ padding: '20px 28px' }}>
          {/* Reset profile link */}
          {profile?.age && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 12, color: C.subtle }}>
              <Info size={12} />
              Suggested for age {profile.age}{profile.dependents > 0 ? `, ${profile.dependents} dependent${profile.dependents > 1 ? 's' : ''}` : ''}.
              <button
                onClick={() => { fetch('/api/goals/profile', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({age:0,dependents:0}) }); setPhase('profile') }}
                style={{ background: 'none', border: 'none', color: C.blue, cursor: 'pointer', fontSize: 12, padding: 0, textDecoration: 'underline' }}
              >
                Update
              </button>
            </div>
          )}

          {/* Saved banner */}
          {saved && <SavedBanner onAskAI={askAI} />}

          {/* Error */}
          {inferErr && (
            <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderRadius: 10,
              background: C.redBg, border: '1px solid rgba(240,80,96,0.2)', marginBottom: 16, fontSize: 13, color: C.muted }}>
              <AlertTriangle size={14} color={C.red} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Could not refresh inference: {inferErr}. Showing last known goals.</span>
            </div>
          )}

          {/* Feasibility strip */}
          {inferred?.context && goals.length > 0 && (
            <FeasibilityStrip goals={goals} context={inferred.context} />
          )}

          {/* Goal cards */}
          {goals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: C.subtle }}>
              <Target size={36} color={C.border2} style={{ marginBottom: 12 }} />
              <div>No goals yet. <button onClick={reanalyze} style={{ background: 'none', border: 'none', color: C.green, cursor: 'pointer', fontSize: 14, textDecoration: 'underline' }}>Run analysis</button></div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 14 }}>
              {goals.map(g => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  onChange={updated => updateGoal(g.id, updated)}
                  onRemove={() => removeGoal(g.id)}
                />
              ))}
            </div>
          )}

          {/* Bottom action row */}
          {goals.length > 0 && !saved && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, flexWrap: 'wrap', gap: 12 }}>
              <span style={{ fontSize: 13, color: C.muted }}>
                {goals.filter(g => g.active).length} active · toggle goals on/off · click any amount or date to edit inline
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn onClick={askAI} variant="secondary" size="sm"><Sparkles size={12} />Ask AI about my plan</Btn>
                <Btn onClick={saveAll} disabled={saving} size="sm">
                  {saving ? <Spinner size={12} /> : <Check size={12} />}
                  Accept & save goals
                </Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
