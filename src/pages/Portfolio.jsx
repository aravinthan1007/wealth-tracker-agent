import React, { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Plus, Trash2, RefreshCw, Newspaper, BarChart2 } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { C, mono, fmt, PageHeader, Card, Btn, Badge, Input, Modal, Spinner, EmptyState } from '../components/ui'

const SYMBOLS = ['AAPL', 'MSFT', 'TSLA', 'GOOGL', 'AMZN', 'META', 'NVDA', 'JPM']

export default function Portfolio() {
  const [quotes, setQuotes] = useState([])
  const [portfolio, setPortfolio] = useState(() => {
    try { return JSON.parse(localStorage.getItem('portfolio') || '[]') } catch { return [] }
  })
  const [news, setNews] = useState({})
  const [history, setHistory] = useState({})
  const [selectedSym, setSelectedSym] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [newStock, setNewStock] = useState({ symbol: '', shares: '', avgCost: '' })
  const [loading, setLoading] = useState(false)
  const [newsLoading, setNewsLoading] = useState(false)

  const syms = [...new Set([...portfolio.map(p => p.symbol), ...SYMBOLS.slice(0, 4)])]

  async function loadQuotes() {
    setLoading(true)
    try {
      const res = await fetch(`/api/stocks/quote?symbols=${syms.join(',')}`)
      const data = await res.json()
      setQuotes(data)
    } catch {}
    setLoading(false)
  }

  async function loadNews(sym) {
    setNewsLoading(true)
    try {
      const res = await fetch(`/api/stocks/news?symbol=${sym}&count=6`)
      const data = await res.json()
      setNews(n => ({ ...n, [sym]: data.news || [] }))
    } catch {}
    setNewsLoading(false)
  }

  async function loadHistory(sym) {
    try {
      const res = await fetch(`/api/stocks/history?symbol=${sym}&period=1mo`)
      const data = await res.json()
      setHistory(h => ({ ...h, [sym]: data.history || [] }))
    } catch {}
  }

  useEffect(() => { loadQuotes() }, [portfolio.length])

  function selectSym(sym) {
    setSelectedSym(sym)
    if (!news[sym]) loadNews(sym)
    if (!history[sym]) loadHistory(sym)
  }

  function addStock() {
    const sym = newStock.symbol.toUpperCase().trim()
    if (!sym) return
    const updated = [...portfolio.filter(p => p.symbol !== sym), { symbol: sym, shares: parseFloat(newStock.shares) || 0, avgCost: parseFloat(newStock.avgCost) || 0 }]
    setPortfolio(updated)
    localStorage.setItem('portfolio', JSON.stringify(updated))
    setNewStock({ symbol: '', shares: '', avgCost: '' })
    setAddOpen(false)
  }

  function removeStock(sym) {
    const updated = portfolio.filter(p => p.symbol !== sym)
    setPortfolio(updated)
    localStorage.setItem('portfolio', JSON.stringify(updated))
  }

  const quoteMap = Object.fromEntries(quotes.map(q => [q.symbol, q]))

  const portfolioWithValue = portfolio.map(p => {
    const q = quoteMap[p.symbol]
    const currentPrice = q?.price || 0
    const value = currentPrice * p.shares
    const costBasis = p.avgCost * p.shares
    const gainLoss = value - costBasis
    return { ...p, ...q, value, costBasis, gainLoss, gainLossPct: costBasis ? gainLoss/costBasis*100 : 0 }
  })

  const totalValue = portfolioWithValue.reduce((s, p) => s + p.value, 0)
  const totalGainLoss = portfolioWithValue.reduce((s, p) => s + p.gainLoss, 0)

  const selQuote = selectedSym ? quoteMap[selectedSym] : null
  const selHistory = selectedSym ? (history[selectedSym] || []) : []
  const chartData = selHistory.map(d => ({ date: new Date(d.date).toLocaleDateString('en-US', { month:'short', day:'numeric' }), close: d.close }))

  return (
    <div>
      <PageHeader
        title="Portfolio & Stock News"
        subtitle="Live quotes, news, and personal holdings"
        actions={<>
          <Btn onClick={loadQuotes} variant="secondary" size="sm"><RefreshCw size={12} />Refresh</Btn>
          <Btn onClick={() => setAddOpen(true)} size="sm"><Plus size={12} />Add Stock</Btn>
        </>}
      />

      <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* My Holdings */}
        {portfolio.length > 0 && (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontWeight:600, fontSize:14 }}>My Holdings</span>
              <div style={{ display:'flex', gap:16, fontSize:12, color:C.muted }}>
                <span>Total Value: <strong style={{ color:C.text, ...mono }}>{fmt.format(totalValue)}</strong></span>
                <span style={{ color: totalGainLoss >= 0 ? C.green : C.red }}>
                  {totalGainLoss >= 0 ? '+' : ''}{fmt.format(totalGainLoss)} ({totalGainLoss/Math.max(portfolioWithValue.reduce((s,p)=>s+p.costBasis,0),1)*100 > 0 ? '+' : ''}{(totalGainLoss/Math.max(portfolioWithValue.reduce((s,p)=>s+p.costBasis,0),1)*100).toFixed(2)}%)
                </span>
              </div>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>
                {['Symbol','Shares','Avg Cost','Current','Value','P&L',''].map(h=>(
                  <th key={h} style={{ padding:'8px 16px', textAlign:'left', fontSize:11, color:C.subtle, fontWeight:500 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {portfolioWithValue.map(p => (
                  <tr key={p.symbol} onClick={() => selectSym(p.symbol)} style={{ borderBottom:`1px solid ${C.border}`, cursor:'pointer', background: selectedSym===p.symbol ? C.blueBg : 'transparent' }}>
                    <td style={{ padding:'10px 16px', fontWeight:700, ...mono, fontSize:14 }}>{p.symbol}</td>
                    <td style={{ padding:'10px 16px', ...mono, fontSize:13 }}>{p.shares}</td>
                    <td style={{ padding:'10px 16px', ...mono, fontSize:13 }}>{fmt.format(p.avgCost)}</td>
                    <td style={{ padding:'10px 16px', ...mono, fontSize:13 }}>{p.price ? fmt.format(p.price) : '—'}</td>
                    <td style={{ padding:'10px 16px', ...mono, fontSize:13, fontWeight:600 }}>{fmt.format(p.value)}</td>
                    <td style={{ padding:'10px 16px', color: p.gainLoss >= 0 ? C.green : C.red, ...mono, fontSize:13 }}>
                      {p.gainLoss >= 0 ? '+' : ''}{fmt.format(p.gainLoss)}<br />
                      <span style={{ fontSize:11 }}>{p.gainLoss >= 0 ? '+' : ''}{p.gainLossPct.toFixed(2)}%</span>
                    </td>
                    <td style={{ padding:'10px 16px' }}>
                      <button onClick={e=>{e.stopPropagation();removeStock(p.symbol)}} style={{ background:'none', border:'none', color:C.subtle, cursor:'pointer' }}><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* Live Market Quotes */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:8 }}>
            <BarChart2 size={15} color={C.blue} />
            <span style={{ fontWeight:600, fontSize:14 }}>Market Quotes</span>
          </div>
          {loading ? <Spinner /> : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))' }}>
              {quotes.map(q => (
                <div key={q.symbol} onClick={() => selectSym(q.symbol)} style={{
                  padding:'14px 16px', borderRight:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`,
                  cursor:'pointer', background: selectedSym===q.symbol ? C.blueBg : 'transparent', transition:'background 0.15s'
                }}>
                  <div style={{ fontWeight:700, fontSize:14, ...mono, marginBottom:4 }}>{q.symbol}</div>
                  <div style={{ fontSize:12, color:C.muted, marginBottom:8, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{q.name || '—'}</div>
                  <div style={{ fontSize:20, fontWeight:700, ...mono, marginBottom:4 }}>{q.price ? fmt.format(q.price) : '—'}</div>
                  <Badge color={q.changePercent >= 0 ? 'green' : 'red'}>
                    {q.changePercent != null ? (q.changePercent >= 0 ? '+' : '') + q.changePercent?.toFixed(2) + '%' : '—'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Selected symbol detail: chart + news */}
        {selectedSym && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {/* Chart */}
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontWeight:600, fontSize:14 }}>{selectedSym} — 1 Month</span>
                {selQuote && <span style={{ marginLeft:12, fontSize:12, color:C.muted }}>{fmt.format(selQuote.price)}</span>}
              </div>
              <div style={{ padding:'16px 12px 8px' }}>
                {chartData.length === 0 ? <Spinner /> : (
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={C.green} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize:10, fill:C.subtle }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize:10, fill:C.subtle }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                      <Tooltip contentStyle={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, fontSize:12 }} formatter={v => [fmt.format(v), 'Close']} />
                      <Area type="monotone" dataKey="close" stroke={C.green} fill="url(#cg)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            {/* News */}
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:8 }}>
                <Newspaper size={14} color={C.amber} />
                <span style={{ fontWeight:600, fontSize:14 }}>{selectedSym} News</span>
              </div>
              <div style={{ padding:'4px 0', maxHeight:280, overflow:'auto' }}>
                {newsLoading ? <Spinner /> : (news[selectedSym] || []).length === 0 ? <EmptyState message="No news available" /> : (
                  (news[selectedSym] || []).map((n, i) => (
                    <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" style={{ display:'block', padding:'12px 18px', borderBottom:`1px solid ${C.border}`, textDecoration:'none', color:'inherit' }}>
                      <div style={{ fontSize:13, fontWeight:500, marginBottom:4, color:C.text, lineHeight:1.4 }}>{n.title}</div>
                      <div style={{ fontSize:11, color:C.subtle }}>
                        {n.publisher} · {n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toLocaleDateString() : ''}
                      </div>
                    </a>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Add Stock Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Stock to Portfolio">
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Input label="Symbol (e.g. AAPL)" value={newStock.symbol} onChange={e => setNewStock(s => ({ ...s, symbol: e.target.value.toUpperCase() }))} placeholder="AAPL" />
          <Input label="Shares" type="number" value={newStock.shares} onChange={e => setNewStock(s => ({ ...s, shares: e.target.value }))} placeholder="10" />
          <Input label="Average Cost per Share ($)" type="number" value={newStock.avgCost} onChange={e => setNewStock(s => ({ ...s, avgCost: e.target.value }))} placeholder="150.00" />
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:8 }}>
            <Btn onClick={() => setAddOpen(false)} variant="secondary">Cancel</Btn>
            <Btn onClick={addStock}>Add Stock</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
