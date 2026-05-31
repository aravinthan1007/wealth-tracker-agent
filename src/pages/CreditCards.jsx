import React, { useState, useEffect } from 'react'
import { CreditCard, Plus, Trash2, Edit3, AlertCircle, CheckCircle } from 'lucide-react'
import { C, mono, fmt, PageHeader, Card, Btn, Badge, Input, Select, Modal, Spinner, StatCard } from '../components/ui'

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4']

export default function CreditCards() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editCard, setEditCard] = useState(null)
  const [form, setForm] = useState({ name:'', bank:'', last4:'', limit:'', balance:'', minPayment:'', dueDate:'', apr:'', rewards:'', color:COLORS[0] })

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/creditcards')
      const d = await res.json()
      setCards(Array.isArray(d) ? d : d.cards ?? [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function saveCard() {
    const payload = {
      ...form,
      limit: parseFloat(form.limit) || 0,
      balance: parseFloat(form.balance) || 0,
      minPayment: parseFloat(form.minPayment) || 0,
      apr: parseFloat(form.apr) || 0,
    }
    if (editCard) {
      await fetch(`/api/creditcards/${editCard.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) })
    } else {
      await fetch('/api/creditcards', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) })
    }
    setAddOpen(false); setEditCard(null)
    resetForm(); load()
  }

  async function deleteCard(id) {
    if (!confirm('Delete this card?')) return
    await fetch(`/api/creditcards/${id}`, { method:'DELETE' })
    load()
  }

  function openEdit(card) {
    setForm({ ...card, limit: String(card.limit), balance: String(card.balance), minPayment: String(card.minPayment), apr: String(card.apr) })
    setEditCard(card); setAddOpen(true)
  }

  function resetForm() { setForm({ name:'', bank:'', last4:'', limit:'', balance:'', minPayment:'', dueDate:'', apr:'', rewards:'', color:COLORS[0] }) }

  const totalBalance = cards.reduce((s, c) => s + (c.balance || 0), 0)
  const totalLimit = cards.reduce((s, c) => s + (c.limit || 0), 0)
  const totalMin = cards.reduce((s, c) => s + (c.minPayment || 0), 0)
  const utilPct = totalLimit ? (totalBalance / totalLimit * 100) : 0

  const daysUntilDue = (date) => {
    const d = new Date(date)
    const diff = Math.ceil((d - new Date()) / (1000*60*60*24))
    return diff
  }

  return (
    <div>
      <PageHeader
        title="Credit Cards"
        subtitle="Manage all your credit cards, balances and due dates"
        actions={<Btn onClick={() => { resetForm(); setEditCard(null); setAddOpen(true) }}><Plus size={13} />Add Card</Btn>}
      />

      <div style={{ padding:'20px 28px', display:'flex', flexDirection:'column', gap:16 }}>

        {/* Summary KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
          <StatCard label="Total Balance" value={fmt.format(totalBalance)} sub={`${utilPct.toFixed(1)}% utilization`} color={utilPct > 30 ? C.red : C.green} icon={CreditCard} />
          <StatCard label="Total Credit Limit" value={fmt.format(totalLimit)} sub={`${cards.length} cards`} color={C.blue} icon={CreditCard} />
          <StatCard label="Available Credit" value={fmt.format(totalLimit - totalBalance)} sub="Total remaining" color={C.green} />
          <StatCard label="Total Min. Payment" value={fmt.format(totalMin)} sub="Due this cycle" color={C.amber} />
        </div>

        {/* Utilization bar */}
        <Card style={{ padding:'16px 20px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontSize:13, fontWeight:500 }}>Overall Credit Utilization</span>
            <span style={{ fontSize:13, ...mono, color: utilPct > 30 ? C.red : utilPct > 10 ? C.amber : C.green }}>{utilPct.toFixed(1)}%</span>
          </div>
          <div style={{ height:8, background:C.border2, borderRadius:4, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${Math.min(100, utilPct)}%`, background: utilPct > 30 ? C.red : utilPct > 10 ? C.amber : C.green, borderRadius:4, transition:'width 0.5s' }} />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:11, color:C.subtle }}>
            <span>Excellent &lt;10%</span><span>Good &lt;30%</span><span>High &gt;30%</span>
          </div>
        </Card>

        {/* Cards grid */}
        {loading ? <Spinner /> : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px,1fr))', gap:14 }}>
            {cards.map(c => {
              const due = daysUntilDue(c.dueDate)
              const util = c.limit ? (c.balance / c.limit * 100) : 0
              return (
                <Card key={c.id} style={{ overflow:'hidden', position:'relative' }}>
                  {/* Card header with color strip */}
                  <div style={{ height:4, background:c.color || C.blue }} />
                  <div style={{ padding:'16px 18px' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:15, marginBottom:2 }}>{c.name}</div>
                        <div style={{ fontSize:12, color:C.muted }}>{c.bank} · ···· {c.last4}</div>
                      </div>
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => openEdit(c)} style={{ background:'none', border:'none', color:C.muted, cursor:'pointer', padding:4 }}><Edit3 size={14} /></button>
                        <button onClick={() => deleteCard(c.id)} style={{ background:'none', border:'none', color:C.subtle, cursor:'pointer', padding:4 }}><Trash2 size={14} /></button>
                      </div>
                    </div>

                    {/* Balance */}
                    <div style={{ marginBottom:14 }}>
                      <div style={{ fontSize:11, color:C.subtle, marginBottom:4 }}>Current Balance</div>
                      <div style={{ fontSize:26, fontWeight:700, ...mono }}>{fmt.format(c.balance)}</div>
                      <div style={{ fontSize:12, color:C.muted }}>of {fmt.format(c.limit)} limit</div>
                    </div>

                    {/* Utilization bar */}
                    <div style={{ marginBottom:14 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:C.muted, marginBottom:5 }}>
                        <span>Utilization</span><span>{util.toFixed(1)}%</span>
                      </div>
                      <div style={{ height:5, background:C.border2, borderRadius:3 }}>
                        <div style={{ height:'100%', width:`${Math.min(100,util)}%`, background: util > 30 ? C.red : util > 10 ? C.amber : C.green, borderRadius:3 }} />
                      </div>
                    </div>

                    {/* Details grid */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                      <div style={{ padding:'8px 10px', background:C.card2, borderRadius:8 }}>
                        <div style={{ fontSize:10, color:C.subtle }}>Min. Payment</div>
                        <div style={{ fontSize:14, fontWeight:600, ...mono }}>{fmt.format(c.minPayment)}</div>
                      </div>
                      <div style={{ padding:'8px 10px', background: due <= 3 ? C.redBg : due <= 7 ? C.amberBg : C.card2, borderRadius:8 }}>
                        <div style={{ fontSize:10, color:C.subtle }}>Due Date</div>
                        <div style={{ fontSize:13, fontWeight:600, color: due <= 3 ? C.red : due <= 7 ? C.amber : C.text }}>
                          {c.dueDate} {due >= 0 ? `(${due}d)` : '(past)'}
                        </div>
                      </div>
                      <div style={{ padding:'8px 10px', background:C.card2, borderRadius:8 }}>
                        <div style={{ fontSize:10, color:C.subtle }}>APR</div>
                        <div style={{ fontSize:14, fontWeight:600, ...mono }}>{c.apr > 0 ? `${c.apr}%` : 'N/A'}</div>
                      </div>
                      <div style={{ padding:'8px 10px', background:C.card2, borderRadius:8 }}>
                        <div style={{ fontSize:10, color:C.subtle }}>Rewards</div>
                        <div style={{ fontSize:12, fontWeight:500, color:C.amber }}>{c.rewards || '—'}</div>
                      </div>
                    </div>

                    {/* Alerts */}
                    {due >= 0 && due <= 7 && (
                      <div style={{ display:'flex', gap:6, padding:'8px 10px', background:C.amberBg, borderRadius:8, fontSize:12, color:C.amber }}>
                        <AlertCircle size={13} style={{ flexShrink:0, marginTop:1 }} />
                        Payment due in {due} day{due !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); setEditCard(null) }} title={editCard ? 'Edit Card' : 'Add Credit Card'}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Input label="Card Name" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Chase Sapphire" style={{ gridColumn:'1/-1' }} />
          <Input label="Bank" value={form.bank} onChange={e => setForm(f=>({...f,bank:e.target.value}))} placeholder="Chase" />
          <Input label="Last 4 Digits" value={form.last4} onChange={e => setForm(f=>({...f,last4:e.target.value}))} placeholder="4242" maxLength={4} />
          <Input label="Credit Limit ($)" type="number" value={form.limit} onChange={e => setForm(f=>({...f,limit:e.target.value}))} placeholder="10000" />
          <Input label="Current Balance ($)" type="number" value={form.balance} onChange={e => setForm(f=>({...f,balance:e.target.value}))} placeholder="2340" />
          <Input label="Min. Payment ($)" type="number" value={form.minPayment} onChange={e => setForm(f=>({...f,minPayment:e.target.value}))} placeholder="35" />
          <Input label="Due Date" type="date" value={form.dueDate} onChange={e => setForm(f=>({...f,dueDate:e.target.value}))} />
          <Input label="APR (%)" type="number" value={form.apr} onChange={e => setForm(f=>({...f,apr:e.target.value}))} placeholder="22.99" />
          <Input label="Rewards" value={form.rewards} onChange={e => setForm(f=>({...f,rewards:e.target.value}))} placeholder="2% Cash Back" style={{ gridColumn:'1/-1' }} />
          <div style={{ gridColumn:'1/-1' }}>
            <label style={{ fontSize:12, color:C.muted, fontWeight:500, display:'block', marginBottom:8 }}>Card Color</label>
            <div style={{ display:'flex', gap:8 }}>
              {COLORS.map(col => (
                <button key={col} onClick={() => setForm(f=>({...f,color:col}))} style={{ width:24, height:24, borderRadius:'50%', background:col, border: form.color===col ? `3px solid ${C.text}` : 'none', cursor:'pointer' }} />
              ))}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:20 }}>
          <Btn onClick={() => { setAddOpen(false); setEditCard(null) }} variant="secondary">Cancel</Btn>
          <Btn onClick={saveCard}>{editCard ? 'Save Changes' : 'Add Card'}</Btn>
        </div>
      </Modal>
    </div>
  )
}
