import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Edit3, TrendingDown, Filter } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'
import { C, mono, fmt, PageHeader, Card, Btn, Badge, Input, Select, Modal, Spinner, StatCard } from '../components/ui'

const CATEGORY_COLORS = {
  housing: '#0ea5e9', food: '#22c55e', utilities: '#f59e0b',
  entertainment: '#a855f7', health: '#06b6d4', transport: '#f97316',
  insurance: '#64748b', other: '#94a3b8'
}

const CATEGORIES = ['housing', 'food', 'utilities', 'entertainment', 'health', 'transport', 'insurance', 'other']

export default function Expenses() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [form, setForm] = useState({ category: '', amount: '', date: new Date().toISOString().slice(0,10), description: '', type: 'other', recurring: false })
  const [budgets, setBudgets] = useState({})
  const [editExp, setEditExp] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/expenses/summary?month=${month}`)
      const d = await res.json()
      setData(d)
      setBudgets(d.budgets || {})
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [month])

  async function saveExpense() {
    const payload = { ...form, amount: parseFloat(form.amount) || 0 }
    if (editExp) {
      await fetch(`/api/expenses/${editExp.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) })
    } else {
      await fetch('/api/expenses', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) })
    }
    setAddOpen(false); setEditExp(null); load()
  }

  async function deleteExpense(id) {
    await fetch(`/api/expenses/${id}`, { method:'DELETE' })
    load()
  }

  async function saveBudgets() {
    await fetch('/api/expenses/budgets', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(budgets) })
    setBudgetOpen(false); load()
  }

  function openEdit(exp) {
    setForm({ ...exp, amount: String(exp.amount) })
    setEditExp(exp); setAddOpen(true)
  }

  const pieData = data ? Object.entries(data.byCategory).map(([k,v]) => ({ name:k, value:v, color:CATEGORY_COLORS[k]||C.muted })) : []
  const barData = data ? CATEGORIES.map(cat => ({
    cat: cat.charAt(0).toUpperCase() + cat.slice(1),
    spent: data.byCategory[cat] || 0,
    budget: data.budgets?.[cat] || 0
  })).filter(d => d.spent > 0 || d.budget > 0) : []

  return (
    <div>
      <PageHeader
        title="Monthly Expenses"
        subtitle="Track and categorize your spending"
        actions={<>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            style={{ background:C.card, border:`1px solid ${C.border}`, color:C.text, borderRadius:8, padding:'6px 10px', fontSize:12, fontFamily:'inherit', outline:'none' }}
          />
          <Btn onClick={() => setBudgetOpen(true)} variant="secondary" size="sm">Set Budgets</Btn>
          <Btn onClick={() => { setForm({ category:'', amount:'', date:new Date().toISOString().slice(0,10), description:'', type:'other', recurring:false }); setEditExp(null); setAddOpen(true) }} size="sm"><Plus size={13} />Add Expense</Btn>
        </>}
      />

      <div style={{ padding:'20px 28px', display:'flex', flexDirection:'column', gap:16 }}>
        {loading ? <Spinner /> : !data ? null : (<>

          {/* KPI row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
            <StatCard label="Total Spent" value={fmt.format(data.total)} sub={`${data.expenses?.length || 0} transactions`} color={C.red} icon={TrendingDown} />
            <StatCard label="Total Budget" value={fmt.format(Object.values(data.budgets||{}).reduce((s,v)=>s+v,0))} sub="Monthly target" color={C.blue} />
            <StatCard label="Remaining" value={fmt.format(Math.max(0, Object.values(data.budgets||{}).reduce((s,v)=>s+v,0) - data.total))} sub="Budget left" color={C.green} />
            <StatCard label="Over Budget" value={Object.entries(data.byCategory).filter(([k,v])=>(data.budgets?.[k]||0)>0 && v>(data.budgets?.[k]||0)).length + ' categories'} sub="Need attention" color={C.amber} />
          </div>

          {/* Charts row */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:16 }}>
            {/* Pie */}
            <Card style={{ padding:'16px', display:'flex', flexDirection:'column', alignItems:'center' }}>
              <div style={{ fontWeight:600, fontSize:14, marginBottom:12, alignSelf:'flex-start' }}>By Category</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt.format(v)} contentStyle={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, fontSize:12 }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* Budget vs Actual bar */}
            <Card style={{ padding:'16px' }}>
              <div style={{ fontWeight:600, fontSize:14, marginBottom:12 }}>Budget vs. Actual</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} margin={{ left:-10 }}>
                  <XAxis dataKey="cat" tick={{ fontSize:10, fill:C.subtle }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:10, fill:C.subtle }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`} />
                  <Tooltip contentStyle={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, fontSize:12 }} formatter={v=>fmt.format(v)} />
                  <Bar dataKey="budget" name="Budget" fill={C.border2} radius={[3,3,0,0]} />
                  <Bar dataKey="spent" name="Spent" radius={[3,3,0,0]}>
                    {barData.map((d, i) => <Cell key={i} fill={d.spent > d.budget && d.budget > 0 ? C.red : C.green} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Category breakdown */}
          <Card style={{ padding:'0', overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}`, fontWeight:600, fontSize:14 }}>Category Breakdown</div>
            <div style={{ padding:'8px 0' }}>
              {CATEGORIES.map(cat => {
                const spent = data.byCategory[cat] || 0
                const budget = data.budgets?.[cat] || 0
                if (spent === 0 && budget === 0) return null
                const pct = budget ? Math.min(100, spent/budget*100) : 100
                return (
                  <div key={cat} style={{ display:'flex', alignItems:'center', gap:14, padding:'10px 18px', borderBottom:`1px solid ${C.border}` }}>
                    <div style={{ width:10, height:10, borderRadius:2, background:CATEGORY_COLORS[cat]||C.muted, flexShrink:0 }} />
                    <div style={{ width:100, fontSize:13, textTransform:'capitalize', fontWeight:500 }}>{cat}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ height:5, background:C.border2, borderRadius:3 }}>
                        <div style={{ height:'100%', width:`${pct}%`, background: pct >= 100 ? C.red : pct > 75 ? C.amber : CATEGORY_COLORS[cat]||C.green, borderRadius:3 }} />
                      </div>
                    </div>
                    <div style={{ ...mono, fontSize:12, color:C.text, textAlign:'right', minWidth:80 }}>{fmt.format(spent)}</div>
                    <div style={{ ...mono, fontSize:12, color:C.subtle, textAlign:'right', minWidth:70 }}>/ {fmt.format(budget)}</div>
                    <Badge color={pct >= 100 ? 'red' : pct > 75 ? 'amber' : 'green'}>{pct.toFixed(0)}%</Badge>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Transaction list */}
          <Card style={{ padding:'0', overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}`, fontWeight:600, fontSize:14 }}>All Transactions</div>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>
                {['Date','Category','Description','Type','Amount',''].map(h=>(
                  <th key={h} style={{ padding:'8px 16px', textAlign:'left', fontSize:11, color:C.subtle, fontWeight:500 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {(data.expenses || []).sort((a,b) => new Date(b.date) - new Date(a.date)).map(exp => (
                  <tr key={exp.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                    <td style={{ padding:'10px 16px', fontSize:12, color:C.muted, ...mono }}>{exp.date}</td>
                    <td style={{ padding:'10px 16px', fontSize:13, fontWeight:500, textTransform:'capitalize' }}>
                      <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ width:8, height:8, borderRadius:2, background:CATEGORY_COLORS[exp.type]||C.muted, flexShrink:0 }} />
                        {exp.category}
                      </span>
                    </td>
                    <td style={{ padding:'10px 16px', fontSize:13, color:C.muted }}>{exp.description}</td>
                    <td style={{ padding:'10px 16px' }}><Badge color={exp.recurring ? 'blue' : 'amber'}>{exp.recurring ? 'Recurring' : 'One-time'}</Badge></td>
                    <td style={{ padding:'10px 16px', ...mono, fontSize:13, fontWeight:600, color:C.red }}>{fmt.format(exp.amount)}</td>
                    <td style={{ padding:'10px 16px', display:'flex', gap:6 }}>
                      <button onClick={() => openEdit(exp)} style={{ background:'none', border:'none', color:C.muted, cursor:'pointer' }}><Edit3 size={13} /></button>
                      <button onClick={() => deleteExpense(exp.id)} style={{ background:'none', border:'none', color:C.subtle, cursor:'pointer' }}><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>)}
      </div>

      {/* Add/Edit Expense Modal */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); setEditExp(null) }} title={editExp ? 'Edit Expense' : 'Add Expense'}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Input label="Category Name" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} placeholder="Groceries" style={{ gridColumn:'1/-1' }} />
          <Input label="Amount ($)" type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="50.00" />
          <Input label="Date" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
          <Select label="Type" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={{ gridColumn:'1/-1' }}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
          </Select>
          <Input label="Description" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Notes..." style={{ gridColumn:'1/-1' }} />
          <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer', gridColumn:'1/-1' }}>
            <input type="checkbox" checked={form.recurring} onChange={e=>setForm(f=>({...f,recurring:e.target.checked}))} />
            Recurring expense
          </label>
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:20 }}>
          <Btn onClick={() => { setAddOpen(false); setEditExp(null) }} variant="secondary">Cancel</Btn>
          <Btn onClick={saveExpense}>{editExp ? 'Save Changes' : 'Add Expense'}</Btn>
        </div>
      </Modal>

      {/* Budget Modal */}
      <Modal open={budgetOpen} onClose={() => setBudgetOpen(false)} title="Set Monthly Budgets">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {CATEGORIES.map(cat => (
            <Input key={cat} label={`${cat.charAt(0).toUpperCase()+cat.slice(1)} ($)`} type="number" value={String(budgets[cat] || '')} onChange={e => setBudgets(b => ({ ...b, [cat]: parseFloat(e.target.value) || 0 }))} placeholder="0" />
          ))}
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:20 }}>
          <Btn onClick={() => setBudgetOpen(false)} variant="secondary">Cancel</Btn>
          <Btn onClick={saveBudgets}>Save Budgets</Btn>
        </div>
      </Modal>
    </div>
  )
}
