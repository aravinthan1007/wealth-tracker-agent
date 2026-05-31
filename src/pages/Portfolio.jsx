import React, { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Plus, Trash2, RefreshCw, Newspaper, BarChart2, Globe, ExternalLink, ChevronRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { C, mono, fmt, PageHeader, Card, Btn, Badge, Input, Modal, Spinner, EmptyState, SectionHeader } from '../components/ui'

const SYMBOLS = ['AAPL', 'MSFT', 'TSLA', 'GOOGL', 'AMZN', 'META', 'NVDA', 'JPM']
const DEFAULT_SYM = 'AAPL'

export default function Portfolio() {
  const [quotes, setQuotes] = useState([])
  const [portfolio, setPortfolio] = useState(() => {
    try { return JSON.parse(localStorage.getItem('portfolio') || '[]') } catch { return [] }
  })
  const [symNews, setSymNews] = useState({})          // per-symbol Google news
  const [marketNews, setMarketNews] = useState([])    // general market headlines
  const [history, setHistory] = useState({})
  const [selectedSym, setSelectedSym] = useState(DEFAULT_SYM)
  const [addOpen, setAddOpen] = useState(false)
  const [newStock, setNewStock] = useState({ symbol: '', shares: '', avgCost: '' })
  const [loading, setLoading] = useState(false)
  const [newsLoading, setNewsLoading] = useState(false)
  const [marketNewsLoading, setMarketNewsLoading] = useState(false)

  const syms = [...new Set([...portfolio.map(p => p.symbol), ...SYMBOLS.slice(0, 4)])]

  async function loadQuotes() {
    setLoading(true)
    try {
      const res = await fetch(`/api/stocks/quote?symbols=${syms.join(',')}`)
      const data = await res.json()
      setQuotes(Array.isArray(data) ? data : data.quotes ?? [])
    } catch {}
    setLoading(false)
  }

  // Google News RSS for a specific symbol
  async function loadSymNews(sym) {
    if (symNews[sym]) return
    setNewsLoading(true)
    try {
      const res = await fetch(`/api/stocks/googlenews?symbol=${sym}&count=8`)
      const data = await res.json()
      setSymNews(n => ({ ...n, [sym]: data.news || [] }))
    } catch {}
    setNewsLoading(false)
  }

  // General market headlines from Google News
  async function loadMarketNews() {
    setMarketNewsLoading(true)
    try {
      const res = await fetch('/api/stocks/marketnews?count=12')
      const data = await res.json()
      setMarketNews(data.news || [])
    } catch {}
    setMarketNewsLoading(false)
  }

  async function loadHistory(sym) {
    try {
      const res = await fetch(`/api/stocks/history?symbol=${sym}&period=1mo`)
      const data = await res.json()
      setHistory(h => ({ ...h, [sym]: data.history || [] }))
    } catch {}
  }

  useEffect(() => {
    loadQuotes()
    loadMarketNews()
    // Auto-load news + history for default symbol
    loadSymNews(DEFAULT_SYM)
    loadHistory(DEFAULT_SYM)
  }, [portfolio.length])

  function selectSym(sym) {
    setSelectedSym(sym)
    loadSymNews(sym)
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
  const totalCostBasis = portfolioWithValue.reduce((s, p) => s + p.costBasis, 0)

  const selQuote = selectedSym ? quoteMap[selectedSym] : null
  const selHistory = selectedSym ? (history[selectedSym] || []) : []
  const chartData = selHistory.map(d => ({ date: new Date(d.date).toLocaleDateString('en-US', { month:'short', day:'numeric' }), close: d.close }))
  const currentSymNews = selectedSym ? (symNews[selectedSym] || []) : []

  const timeAgo = iso => {
    if (!iso) return ''
    const diff = Date.now() - new Date(iso).getTime()
    const h = Math.floor(diff / 3600000)
    if (h < 1) return `${Math.floor(diff/60000)}m ago`
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h/24)}d ago`
  }

  return (
    <div>
      <PageHeader
        title="Portfolio & Market Intelligence"
        subtitle="Live quotes · Google Finance news · Personal holdings"
        actions={<>
          <Btn onClick={() => { loadQuotes(); loadMarketNews(); loadSymNews(selectedSym || DEFAULT_SYM) }} variant="secondary" size="sm"><RefreshCw size={12} />Refresh</Btn>
          <Btn onClick={() => setAddOpen(true)} size="sm"><Plus size={12} />Add Stock</Btn>
        </>}
      />

      <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* My Holdings */}
        {portfolio.length > 0 && (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <TrendingUp size={15} color={C.green} />
                <span style={{ fontWeight:600, fontSize:14 }}>My Holdings</span>
              </div>
              <div style={{ display:'flex', gap:20, fontSize:12, color:C.muted }}>
                <span>Total Value: <strong style={{ color:C.text, ...mono }}>{fmt.format(totalValue)}</strong></span>
                <span style={{ color: totalGainLoss >= 0 ? C.green : C.red, fontWeight:600, ...mono }}>
                  {totalGainLoss >= 0 ? '+' : ''}{fmt.format(totalGainLoss)}&nbsp;
                  <span style={{ opacity:0.8 }}>({totalCostBasis ? ((totalGainLoss/totalCostBasis)*100).toFixed(2) : '0.00'}%)</span>
                </span>
              </div>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr style={{ borderBottom:`1px solid ${C.border}`, background:'rgba(255,255,255,0.02)' }}>
                {['Symbol','Company','Shares','Avg Cost','Current','Value','P&L',''].map(h=>(
                  <th key={h} style={{ padding:'9px 16px', textAlign:'left', fontSize:11, color:C.subtle, fontWeight:600, letterSpacing:'0.05em', textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {portfolioWithValue.map(p => (
                  <tr key={p.symbol} onClick={() => selectSym(p.symbol)}
                    style={{ borderBottom:`1px solid ${C.border}`, cursor:'pointer',
                      background: selectedSym===p.symbol ? 'rgba(16,216,124,0.05)' : 'transparent',
                      transition:'background 0.15s' }}>
                    <td style={{ padding:'11px 16px', fontWeight:700, ...mono, fontSize:14, color:C.text }}>{p.symbol}</td>
                    <td style={{ padding:'11px 16px', fontSize:12, color:C.muted, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name || p.symbol}</td>
                    <td style={{ padding:'11px 16px', ...mono, fontSize:13 }}>{p.shares}</td>
                    <td style={{ padding:'11px 16px', ...mono, fontSize:13 }}>{fmt.format(p.avgCost)}</td>
                    <td style={{ padding:'11px 16px', ...mono, fontSize:13, fontWeight:600, color:C.text }}>{p.price ? fmt.format(p.price) : '—'}</td>
                    <td style={{ padding:'11px 16px', ...mono, fontSize:13, fontWeight:600 }}>{fmt.format(p.value)}</td>
                    <td style={{ padding:'11px 16px', color: p.gainLoss >= 0 ? C.green : C.red, ...mono, fontSize:13 }}>
                      {p.gainLoss >= 0 ? '+' : ''}{fmt.format(p.gainLoss)}&nbsp;
                      <span style={{ fontSize:11, opacity:0.8 }}>({p.gainLossPct.toFixed(2)}%)</span>
                    </td>
                    <td style={{ padding:'11px 16px' }}>
                      <button onClick={e=>{e.stopPropagation();removeStock(p.symbol)}} style={{ background:'none', border:'none', color:C.subtle, cursor:'pointer', padding:4, borderRadius:4 }}><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* Live Market Quotes + Chart side by side */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16, alignItems:'start' }}>
          {/* Quotes grid */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:8 }}>
              <BarChart2 size={15} color={C.blue} />
              <span style={{ fontWeight:600, fontSize:14 }}>Live Market Quotes</span>
              <span style={{ marginLeft:'auto', fontSize:11, color:C.subtle }}>Click to explore</span>
            </div>
            {loading ? <Spinner /> : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))' }}>
                {quotes.map(q => (
                  <div key={q.symbol} onClick={() => selectSym(q.symbol)} style={{
                    padding:'16px 16px', borderRight:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`,
                    cursor:'pointer',
                    background: selectedSym===q.symbol ? 'linear-gradient(135deg,rgba(16,216,124,0.08),rgba(16,216,124,0.02))' : 'transparent',
                    borderTop: selectedSym===q.symbol ? `2px solid ${C.green}` : '2px solid transparent',
                    transition:'all 0.15s',
                  }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                      <span style={{ fontWeight:800, fontSize:13, ...mono, color: selectedSym===q.symbol ? C.green : C.text }}>{q.symbol}</span>
                      <Badge color={q.changePercent >= 0 ? 'green' : 'red'} style={{ fontSize:10 }}>
                        {q.changePercent != null ? (q.changePercent >= 0 ? '+' : '') + q.changePercent?.toFixed(2) + '%' : '—'}
                      </Badge>
                    </div>
                    <div style={{ fontSize:11, color:C.muted, marginBottom:10, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{q.name || '—'}</div>
                    <div style={{ fontSize:22, fontWeight:700, ...mono, color:C.text }}>{q.price ? fmt.format(q.price) : '—'}</div>
                    {q.change != null && (
                      <div style={{ fontSize:11, color: q.change >= 0 ? C.green : C.red, marginTop:4, ...mono }}>
                        {q.change >= 0 ? '+' : ''}{q.change?.toFixed(2)} today
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Chart for selected symbol */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <span style={{ fontWeight:700, fontSize:14, ...mono, color:C.green }}>{selectedSym}</span>
                {selQuote && <span style={{ marginLeft:10, fontSize:12, color:C.muted }}>1 Month</span>}
              </div>
              {selQuote && (
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:15, fontWeight:700, ...mono }}>{fmt.format(selQuote.price)}</div>
                  <div style={{ fontSize:11, color: selQuote.changePercent >= 0 ? C.green : C.red, ...mono }}>
                    {selQuote.changePercent >= 0 ? '+' : ''}{selQuote.changePercent?.toFixed(2)}%
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding:'12px 8px 8px' }}>
              {chartData.length === 0 ? <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center' }}><Spinner /></div> : (
                <ResponsiveContainer width="100%" height={165}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.green} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize:9, fill:C.subtle }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize:9, fill:C.subtle }} axisLine={false} tickLine={false} tickFormatter={v => `$${Math.round(v)}`} width={48} />
                    <Tooltip contentStyle={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, fontSize:11 }} formatter={v => [fmt.format(v), 'Close']} />
                    <Area type="monotone" dataKey="close" stroke={C.green} fill="url(#cg)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            {selQuote && (
              <div style={{ padding:'0 12px 12px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                {[['High', selQuote.high && fmt.format(selQuote.high)], ['Low', selQuote.low && fmt.format(selQuote.low)]].map(([l,v]) => (
                  <div key={l} style={{ background:C.card2, borderRadius:7, padding:'7px 10px' }}>
                    <div style={{ fontSize:10, color:C.subtle, marginBottom:3 }}>{l}</div>
                    <div style={{ fontSize:13, fontWeight:600, ...mono }}>{v || '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* News section: symbol news + market headlines side by side */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

          {/* Google Finance News for selected symbol */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:8 }}>
              <Globe size={14} color={C.green} />
              <span style={{ fontWeight:600, fontSize:14 }}>{selectedSym} — Google Finance News</span>
              {newsLoading && <Spinner style={{ marginLeft:'auto' }} />}
            </div>
            <div style={{ maxHeight:360, overflow:'auto' }}>
              {!newsLoading && currentSymNews.length === 0 ? (
                <EmptyState icon={<Newspaper size={28} />} message="Loading news from Google Finance…" />
              ) : currentSymNews.map((n, i) => (
                <a key={i} href={n.link} target="_blank" rel="noopener noreferrer"
                  style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'13px 20px', borderBottom:`1px solid ${C.border}`, textDecoration:'none', color:'inherit', transition:'background 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:C.text, lineHeight:1.45, marginBottom:5 }}>{n.title}</div>
                    <div style={{ fontSize:11, color:C.subtle }}>
                      {n.publisher && <span style={{ color:C.muted, fontWeight:500 }}>{n.publisher}</span>}
                      {n.publisher && n.pubDate && ' · '}
                      {n.pubDate && timeAgo(n.pubDate)}
                    </div>
                  </div>
                  <ExternalLink size={12} style={{ color:C.subtle, flexShrink:0, marginTop:3 }} />
                </a>
              ))}
            </div>
          </Card>

          {/* Market Headlines from Google News */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:8 }}>
              <Newspaper size={14} color={C.amber} />
              <span style={{ fontWeight:600, fontSize:14 }}>Market Headlines</span>
              <span style={{ marginLeft:'auto', fontSize:10, color:C.subtle, background:'rgba(245,166,35,0.1)', border:'1px solid rgba(245,166,35,0.2)', borderRadius:4, padding:'2px 7px' }}>Google News</span>
            </div>
            <div style={{ maxHeight:360, overflow:'auto' }}>
              {marketNewsLoading ? <Spinner /> : marketNews.length === 0 ? (
                <EmptyState icon={<Globe size={28} />} message="Loading market headlines…" />
              ) : marketNews.map((n, i) => (
                <a key={i} href={n.link} target="_blank" rel="noopener noreferrer"
                  style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'13px 20px', borderBottom:`1px solid ${C.border}`, textDecoration:'none', color:'inherit', transition:'background 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:C.text, lineHeight:1.45, marginBottom:5 }}>{n.title}</div>
                    <div style={{ fontSize:11, color:C.subtle }}>
                      {n.publisher && <span style={{ color:C.muted, fontWeight:500 }}>{n.publisher}</span>}
                      {n.publisher && n.pubDate && ' · '}
                      {n.pubDate && timeAgo(n.pubDate)}
                    </div>
                  </div>
                  <ExternalLink size={12} style={{ color:C.subtle, flexShrink:0, marginTop:3 }} />
                </a>
              ))}
            </div>
          </Card>
        </div>
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
