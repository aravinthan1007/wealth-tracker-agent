import React, { useState, useEffect } from 'react'
import {
  DollarSign, Briefcase, TrendingUp, Home, Zap, PiggyBank, Plus, Trash2,
  Edit2, RefreshCw, BarChart2, Check,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import {
  C, mono, fmt, PageHeader, Card, Btn, Badge, Input, Modal, Spinner,
  EmptyState, SectionHeader, StatCard,
} from '../components/ui'

const INCOME_TYPES = [
  { value: 'salary',    label: 'Salary',          icon: Briefcase,   color: C.green },
  { value: 'dividend',  label: 'Dividends',        icon: TrendingUp,  color: C.blue },
  { value: 'options',   label: 'Options / Equity', icon: Zap,         color: '#a78bfa' },
  { value: 'rental',    label: 'Rental',           icon: Home,        color: C.amber },
  { value: 'freelance', label: 'Freelance',        icon: DollarSign,  color: '#f472b6' },
  { value: 'interest',  label: 'Interest / Bonds', icon: PiggyBank,   color: '#38bdf8' },
  { value: 'other',     label: 'Other',            icon: BarChart2,   color: C.muted },
]

const FREQ = [
  { value: 'monthly',   label: 'Monthly' },
  { value: 'annual',    label: 'Annual' },
  { value: 'biweekly',  label: 'Bi-weekly' },
  { value: 'weekly',    label: 'Weekly' },
  { value: 'quarterly', label: 'Quarterly' },
]

function toMonthly(amount, frequency) {
  switch (frequency) {
    case 'annual':    return amount / 12
    case 'quarterly': return amount / 3
    case 'weekly':    return amount * 4.33
    case 'biweekly':  return amount * 2.17
    default:          return amount
  }
}

const PIE_COLORS = ['#10d87c', '#3d8ef0', '#a78bfa', '#f5a623', '#f472b6', '#38bdf8', '#8898b8']

const emptyForm = { type: 'salary', label: '', amount: '', frequency: 'monthly', taxable: true, notes: '', startDate: new Date().toISOString().split('T')[0] }

export default function Income() {
  const [data, setData] = useState({ income: [], totalMonthly: 0, totalAnnual: 0, byType: {} })
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/income')
      const d = await res.json()
      setData(d)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(item) {
    setEditing(item)
    setForm({ ...item, amount: String(item.amount) })
    setModalOpen(true)
  }

  async function save() {
    setSaving(true)
    const payload = { ...form, amount: parseFloat(form.amount) || 0 }
    try {
      if (editing) {
        await fetch(`/api/income/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      } else {
        await fetch('/api/income', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      }
      setModalOpen(false)
      await load()
    } catch {}
    setSaving(false)
  }

  async function del(id) {
    await fetch(`/api/income/${id}`, { method: 'DELETE' })
    load()
  }

  async function toggle(item) {
    await fetch(`/api/income/${item.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !item.active }) })
    load()
  }

  const typeInfo = v => INCOME_TYPES.find(t => t.value === v) || INCOME_TYPES[INCOME_TYPES.length - 1]

  const pieData = Object.entries(data.byType || {}).map(([type, val], i) => ({
    name: typeInfo(type).label,
    value: Math.round(val),
    color: PIE_COLORS[i % PIE_COLORS.length],
  })).filter(d => d.value > 0)

  const active = (data.income || []).filter(i => i.active)
  const inactive = (data.income || []).filter(i => !i.active)

  return (
    <div>
      <PageHeader
        title="Income Sources"
        subtitle="Track all income streams — salary, dividends, options, rental, and more"
        actions={<>
          <Btn onClick={load} variant="secondary" size="sm"><RefreshCw size={12} />Refresh</Btn>
          <Btn onClick={openAdd} size="sm"><Plus size={12} />Add Income</Btn>
        </>}
      />

      <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <StatCard
            label="Monthly Income"
            value={fmt.format(data.totalMonthly)}
            icon={<DollarSign size={16} />}
            color={C.green}
            trend={active.length > 0 ? `${active.length} active` : 'No sources yet'}
          />
          <StatCard
            label="Annual Income"
            value={fmt.format(data.totalAnnual)}
            icon={<BarChart2 size={16} />}
            color={C.blue}
          />
          <StatCard
            label="Monthly Salary"
            value={fmt.format(data.byType?.salary || 0)}
            icon={<Briefcase size={16} />}
            color={C.green}
          />
          <StatCard
            label="Investment Income"
            value={fmt.format((data.byType?.dividend || 0) + (data.byType?.options || 0) + (data.byType?.interest || 0))}
            icon={<TrendingUp size={16} />}
            color="#a78bfa"
            trend="dividends + options + bonds"
          />
        </div>

        {/* Chart + list */}
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, alignItems: 'start' }}>

          {/* Pie breakdown */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Income Breakdown</span>
            </div>
            <div style={{ padding: 16 }}>
              {pieData.length === 0 ? (
                <EmptyState icon={<PiggyBank size={28} />} message="Add income sources to see breakdown" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={45} paddingAngle={2}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={v => [fmt.format(v) + '/mo', '']} contentStyle={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
                    <Legend formatter={name => <span style={{ fontSize: 12, color: C.muted }}>{name}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              {pieData.length > 0 && (
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 4 }}>
                  {pieData.map((d, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                        <span style={{ fontSize: 12, color: C.muted }}>{d.name}</span>
                      </div>
                      <span style={{ fontSize: 12, ...mono, fontWeight: 600 }}>{fmt.format(d.value)}/mo</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Income sources table */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Active Income Sources</span>
              <Badge color="green">{active.length} sources</Badge>
            </div>

            {loading ? <Spinner /> : active.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <EmptyState icon={<DollarSign size={32} />} message="No income sources yet — click + Add Income" />
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)' }}>
                  {['Type', 'Label', 'Amount', 'Frequency', 'Monthly Equiv', 'Taxable', ''].map(h => (
                    <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 11, color: C.subtle, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {active.map(item => {
                    const t = typeInfo(item.type)
                    const Icon = t.icon
                    const monthly = toMonthly(item.amount, item.frequency)
                    return (
                      <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.12s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '11px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 7, background: `${t.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Icon size={13} color={t.color} />
                            </div>
                            <span style={{ fontSize: 12, color: t.color, fontWeight: 600 }}>{t.label}</span>
                          </div>
                        </td>
                        <td style={{ padding: '11px 16px', fontSize: 13, color: C.text }}>{item.label || '—'}</td>
                        <td style={{ padding: '11px 16px', ...mono, fontSize: 13, fontWeight: 600 }}>{fmt.format(item.amount)}</td>
                        <td style={{ padding: '11px 16px', fontSize: 12, color: C.muted }}>{FREQ.find(f => f.value === item.frequency)?.label || item.frequency}</td>
                        <td style={{ padding: '11px 16px', ...mono, fontSize: 13, color: C.green, fontWeight: 700 }}>{fmt.format(monthly)}/mo</td>
                        <td style={{ padding: '11px 16px' }}>
                          <Badge color={item.taxable ? 'red' : 'green'}>{item.taxable ? 'Taxable' : 'Tax-free'}</Badge>
                        </td>
                        <td style={{ padding: '11px 16px', display: 'flex', gap: 6 }}>
                          <button onClick={() => openEdit(item)} style={{ background: 'none', border: 'none', color: C.subtle, cursor: 'pointer', padding: 4, borderRadius: 4 }}><Edit2 size={13} /></button>
                          <button onClick={() => toggle(item)} style={{ background: 'none', border: 'none', color: C.subtle, cursor: 'pointer', padding: 4, borderRadius: 4 }}><Check size={13} /></button>
                          <button onClick={() => del(item.id)} style={{ background: 'none', border: 'none', color: '#f05060', cursor: 'pointer', padding: 4, borderRadius: 4 }}><Trash2 size={13} /></button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}

            {inactive.length > 0 && (
              <div style={{ padding: '10px 20px', borderTop: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, color: C.subtle, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inactive ({inactive.length})</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {inactive.map(item => {
                    const t = typeInfo(item.type)
                    return (
                      <div key={item.id} onClick={() => toggle(item)} style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                        background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8,
                        fontSize: 12, color: C.subtle, cursor: 'pointer', opacity: 0.6,
                      }}>
                        <span>{item.label || t.label}</span>
                        <span style={{ ...mono }}>{fmt.format(item.amount)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Tax estimate box */}
        {data.totalMonthly > 0 && (
          <Card style={{ padding: '18px 24px', background: 'rgba(16,216,124,0.04)', border: `1px solid rgba(16,216,124,0.15)` }}>
            <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 11, color: C.subtle, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Est. Tax (25%)</div>
                <div style={{ fontSize: 18, fontWeight: 700, ...mono, color: '#f05060' }}>{fmt.format(data.totalMonthly * 0.25)}/mo</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.subtle, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Take-Home (est.)</div>
                <div style={{ fontSize: 18, fontWeight: 700, ...mono, color: C.green }}>{fmt.format(data.totalMonthly * 0.75)}/mo</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.subtle, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Annual Take-Home</div>
                <div style={{ fontSize: 18, fontWeight: 700, ...mono, color: C.text }}>{fmt.format(data.totalMonthly * 0.75 * 12)}</div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 11, color: C.subtle, alignSelf: 'flex-end' }}>
                * Simplified estimate — consult a tax advisor for accuracy
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Income Source' : 'Add Income Source'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Type picker */}
          <div>
            <div style={{ fontSize: 11, color: C.subtle, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Income Type</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {INCOME_TYPES.map(t => {
                const Icon = t.icon
                const sel = form.type === t.value
                return (
                  <div key={t.value} onClick={() => setForm(f => ({ ...f, type: t.value }))} style={{
                    padding: '8px 6px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                    border: sel ? `1px solid ${t.color}` : `1px solid ${C.border}`,
                    background: sel ? `${t.color}12` : 'transparent',
                    transition: 'all 0.12s',
                  }}>
                    <Icon size={14} color={sel ? t.color : C.subtle} style={{ marginBottom: 4 }} />
                    <div style={{ fontSize: 11, color: sel ? t.color : C.subtle, fontWeight: sel ? 600 : 400 }}>{t.label}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <Input label="Label (e.g. Google Salary, AAPL Dividends)" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Google L5 salary" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Amount ($)" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="10000" />
            <div>
              <div style={{ fontSize: 11, color: C.subtle, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Frequency</div>
              <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13 }}>
                {FREQ.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>

          {form.amount && (
            <div style={{ padding: '10px 14px', background: 'rgba(16,216,124,0.06)', border: `1px solid rgba(16,216,124,0.15)`, borderRadius: 8 }}>
              <span style={{ fontSize: 12, color: C.subtle }}>Monthly equivalent: </span>
              <span style={{ fontSize: 14, fontWeight: 700, ...mono, color: C.green }}>{fmt.format(toMonthly(parseFloat(form.amount) || 0, form.frequency))}</span>
              <span style={{ fontSize: 12, color: C.subtle }}> · Annual: </span>
              <span style={{ fontSize: 14, fontWeight: 700, ...mono, color: C.text }}>{fmt.format(toMonthly(parseFloat(form.amount) || 0, form.frequency) * 12)}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Start Date" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
              <input type="checkbox" id="taxable" checked={form.taxable} onChange={e => setForm(f => ({ ...f, taxable: e.target.checked }))} style={{ accentColor: C.green, width: 14, height: 14 }} />
              <label htmlFor="taxable" style={{ fontSize: 13, color: C.muted, cursor: 'pointer' }}>Taxable income</label>
            </div>
          </div>

          <Input label="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="E.g. vesting schedule, quarterly payout" />

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <Btn onClick={() => setModalOpen(false)} variant="secondary">Cancel</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Add Income'}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
