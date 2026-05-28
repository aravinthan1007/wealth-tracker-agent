import React, { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Home, CreditCard, PiggyBank, Activity, Zap, RefreshCw, ArrowUpRight, ArrowDownRight, DollarSign, Wallet, AlertCircle } from 'lucide-react'
import { C, mono, fmt, PageHeader, StatCard, Card, Badge, Spinner } from '../components/ui'

const AGENTS = [
  { name: 'StocksAgent', icon: TrendingUp },
  { name: 'MortgageAgent', icon: Home },
  { name: 'LoanAgent', icon: CreditCard },
  { name: 'SavingsAgent', icon: PiggyBank },
  { name: 'NetWorthAgent', icon: Activity },
  { name: 'OrchestratorAgent', icon: Zap },
]

export default function Overview() {
  const [nw, setNw] = useState(null)
  const [cards, setCards] = useState([])
  const [expenses, setExpenses] = useState(null)
  const [live, setLive] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [spinning, setSpinning] = useState(false)
  const [stocks, setStocks] = useState([])

  async function load() {
    setSpinning(true)
    try {
      const safe = p => p.catch(() => null)
      const [nwRes, ccRes, expRes, stRes] = await Promise.all([
        safe(fetch('/api/agents/networth').then(r => r.json())),
        safe(fetch('/api/creditcards').then(r => r.json())),
        safe(fetch('/api/expenses/summary').then(r => r.json())),
        safe(fetch('/api/stocks/quote?symbols=AAPL,MSFT,TSLA,GOOGL').then(r => r.json())),
      ])
      if (nwRes) setNw(nwRes)
      if (ccRes) setCards(Array.isArray(ccRes) ? ccRes : [])
      if (expRes) setExpenses(expRes)
      if (stRes) setStocks(Array.isArray(stRes) ? stRes : [])
      setLive(!!(nwRes || ccRes))
      setLastUpdate(new Date().toISOString())
    } catch { setLive(false) }
    setSpinning(false)
  }

  useEffect(() => {
    load()
    setLive(true)
    const poll = setInterval(() => {
      fetch('/api/agents/networth').then(r => r.json()).then(d => {
        setNw(d); setLive(true); setLastUpdate(new Date().toISOString())
      }).catch(() => setLive(false))
    }, 10000)
    return () => clearInterval(poll)
  }, [])

  const totalCcBalance = cards.reduce((s, c) => s + (c.balance || 0), 0)
  const creditUtil = cards.length
    ? (totalCcBalance / cards.reduce((s, c) => s + (c.limit || 0), 1) * 100).toFixed(1)
    : 0

  return (
    <div style={{ padding: 0 }}>
      <PageHeader
        title="Financial Overview"
        subtitle={lastUpdate ? `Updated ${new Date(lastUpdate).toLocaleTimeString()}` : 'Loading…'}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color: live ? C.green : C.red, ...mono }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background: live ? C.green : C.red, display:'inline-block' }} />
              {live ? 'LIVE' : 'OFFLINE'}
            </span>
            <button onClick={load} style={{ display:'flex', alignItems:'center', gap:5, background: C.card, border:`1px solid ${C.border}`, color: C.muted, borderRadius:8, padding:'6px 12px', fontSize:12, cursor:'pointer' }}>
              <RefreshCw size={13} style={{ animation: spinning ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
          </div>
        }
      />

      <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Top KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <StatCard
            label="Net Worth"
            value={nw ? fmt.format(nw.netWorth) : '—'}
            sub={nw?.netWorth >= 0 ? 'Assets exceed liabilities' : 'Liabilities exceed assets'}
            color={nw?.netWorth >= 0 ? C.green : C.red}
            icon={Wallet}
          />
          <StatCard label="Total Assets" value={nw ? fmt.format(nw.totalAssets) : '—'} sub="Stocks + Savings" color={C.green} icon={TrendingUp} />
          <StatCard label="Total Liabilities" value={nw ? fmt.format(nw.totalLiabilities) : '—'} sub="Mortgage + Loans" color={C.red} icon={TrendingDown} />
          <StatCard label="Monthly Spend" value={expenses ? fmt.format(expenses.total) : '—'} sub={`${Object.keys(expenses?.byCategory || {}).length} categories`} color={C.amber} icon={Receipt2} />
        </div>

        {/* Second row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <StatCard label="Credit Card Balance" value={fmt.format(totalCcBalance)} sub={`${creditUtil}% utilization · ${cards.length} cards`} color={creditUtil > 30 ? C.red : C.green} icon={CreditCard} />
          <StatCard label="Credit Available" value={fmt.format(cards.reduce((s,c) => s + (c.limit||0), 0) - totalCcBalance)} sub="Total credit remaining" color={C.blue} icon={DollarSign} />
        </div>

        {/* Stocks + Agents row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Live Stocks */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display:'flex', alignItems:'center', gap:8 }}>
              <TrendingUp size={15} color={C.green} />
              <span style={{ fontWeight:600, fontSize:14 }}>Live Stocks</span>
            </div>
            {stocks.length === 0 ? <Spinner /> : (
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                    {['Symbol','Price','Change','%'].map(h => (
                      <th key={h} style={{ padding:'8px 16px', textAlign:'left', fontSize:11, color:C.subtle, fontWeight:500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stocks.map(s => (
                    <tr key={s.symbol} style={{ borderBottom:`1px solid ${C.border}` }}>
                      <td style={{ padding:'10px 16px', fontWeight:600, fontSize:13, ...mono }}>{s.symbol}</td>
                      <td style={{ padding:'10px 16px', ...mono, fontSize:13 }}>{s.price ? fmt.format(s.price) : '—'}</td>
                      <td style={{ padding:'10px 16px', color: s.change >= 0 ? C.green : C.red, fontSize:13, ...mono }}>
                        {s.change != null ? (s.change >= 0 ? '+' : '') + s.change?.toFixed(2) : '—'}
                      </td>
                      <td style={{ padding:'10px 16px' }}>
                        {s.changePercent != null && (
                          <Badge color={s.changePercent >= 0 ? 'green' : 'red'}>
                            {(s.changePercent >= 0 ? '+' : '') + s.changePercent?.toFixed(2) + '%'}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {/* Agent Status */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display:'flex', alignItems:'center', gap:8 }}>
              <Activity size={15} color={C.blue} />
              <span style={{ fontWeight:600, fontSize:14 }}>Agent Status</span>
              <Badge color="green">ALL ACTIVE</Badge>
            </div>
            <div style={{ padding: '8px 0' }}>
              {AGENTS.map(({ name, icon: Icon }) => (
                <div key={name} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 18px', borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ background: C.greenBg, border:`1px solid ${C.greenBorder}`, borderRadius:8, padding:7, display:'flex' }}>
                    <Icon size={14} color={C.green} />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{name}</div>
                  </div>
                  <Badge color="green">Active</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Credit Cards summary */}
        {cards.length > 0 && (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:8 }}>
              <CreditCard size={15} color={C.amber} />
              <span style={{ fontWeight:600, fontSize:14 }}>Credit Card Summary</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px,1fr))', gap:0 }}>
              {cards.map(c => (
                <div key={c.id} style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}`, borderRight:`1px solid ${C.border}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <div style={{ width:10, height:10, borderRadius:2, background:c.color || C.blue }} />
                    <span style={{ fontWeight:600, fontSize:13 }}>{c.name}</span>
                    <span style={{ fontSize:11, color:C.muted }}>···{c.last4}</span>
                  </div>
                  <div style={{ fontSize:20, fontWeight:700, ...mono, color: C.text, marginBottom:4 }}>{fmt.format(c.balance)}</div>
                  <div style={{ fontSize:11, color:C.muted }}>of {fmt.format(c.limit)} · Due {c.dueDate}</div>
                  <div style={{ marginTop:8, height:3, background:C.border2, borderRadius:2, overflow:'hidden' }}>
                    <div style={{ height:'100%', background: c.balance/c.limit > 0.3 ? C.amber : C.green, width:`${Math.min(100, c.balance/c.limit*100).toFixed(1)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Alerts */}
        <Card style={{ padding: '14px 18px', display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <AlertCircle size={15} color={C.amber} />
            <span style={{ fontWeight:600, fontSize:14 }}>Smart Alerts</span>
          </div>
          {cards.filter(c => c.balance/c.limit > 0.3).map(c => (
            <div key={c.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:C.amberBg, borderRadius:8, border:`1px solid rgba(245,158,11,0.2)` }}>
              <AlertCircle size={13} color={C.amber} />
              <span style={{ fontSize:12, color:C.amber }}>{c.name}: {(c.balance/c.limit*100).toFixed(0)}% utilization — consider paying down</span>
            </div>
          ))}
          {cards.filter(c => { const due = new Date(c.dueDate); const diff = (due - new Date())/(1000*60*60*24); return diff >= 0 && diff <= 7 }).map(c => (
            <div key={`due-${c.id}`} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:C.redBg, borderRadius:8, border:`1px solid rgba(239,68,68,0.2)` }}>
              <AlertCircle size={13} color={C.red} />
              <span style={{ fontSize:12, color:C.red }}>{c.name}: Payment of {fmt.format(c.minPayment)} due {c.dueDate}</span>
            </div>
          ))}
        </Card>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function Receipt2({ size, color }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8H8"/><path d="M16 12H8"/><path d="M12 16H8"/></svg>
}
