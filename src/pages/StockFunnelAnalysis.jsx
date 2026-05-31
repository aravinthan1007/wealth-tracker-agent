import React, { useState, useMemo, useEffect } from 'react'
import {
  ArrowLeft, TrendingUp, TrendingDown, Activity, Newspaper,
  Network, Scale, History, Sparkles, ChevronRight, ChevronLeft, Info, Check,
} from 'lucide-react'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'

/* ── Theme (mirrors WealthTrack design tokens) ── */
const T = {
  bg: '#060b17', panel: '#0c1322', panelAlt: '#0f1830', line: '#1a2540',
  text: '#e8edf5', dim: '#8898b8', accent: '#10d87c', accentDim: 'rgba(16,216,124,.14)',
  red: '#f05060', redDim: 'rgba(240,80,96,.14)', amber: '#f5a623',
  mono: "'IBM Plex Mono','SF Mono',ui-monospace,monospace",
  sans: "'Space Grotesk','Inter',-apple-system,system-ui,sans-serif",
}

/* ── Analysis stages ── */
const STAGES = [
  { id: 'snapshot',     label: 'Snapshot',       icon: Info,       kicker: 'Where it stands right now' },
  { id: 'fundamentals', label: 'Fundamentals',   icon: Scale,      kicker: 'Is the business healthy?' },
  { id: 'technicals',   label: 'Technicals',     icon: Activity,   kicker: 'What is the price doing?' },
  { id: 'sentiment',    label: 'News & Sentiment',icon: Newspaper,  kicker: 'What is the market saying?' },
  { id: 'peers',        label: 'Peers',           icon: Network,    kicker: 'How do rivals compare?' },
  { id: 'flow',         label: 'Buyer vs Seller', icon: TrendingUp, kicker: 'Who is in control?' },
  { id: 'backtest',     label: 'Backtest',        icon: History,    kicker: "What if you'd held it?" },
  { id: 'verdict',      label: 'AI Verdict',      icon: Sparkles,   kicker: "The agent's call" },
]

/* ── Build mock-enriched data from real portfolio+quote props ── */
function buildData(stock) {
  const { symbol, name, price = 0, change = 0, changePercent = 0, shares = 0, avgCost = 0,
          dayHigh, dayLow, high, low, open, week52High, week52Low, volume, avgVolume, marketCap, trailingPE } = stock

  const fmtVol = v => {
    if (!v || v === '–') return 'N/A'
    if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B'
    if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M'
    if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K'
    return v.toLocaleString()
  }
  const fmtCap = v => {
    if (!v) return 'N/A'
    if (v >= 1e12) return '$' + (v / 1e12).toFixed(2) + 'T'
    if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B'
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M'
    return '$' + v.toLocaleString()
  }

  return {
    symbol, name: name || symbol, price, change, changePct: changePercent, shares, costBasis: avgCost,
    snapshot: {
      open: open ?? price,
      dayLow: dayLow ?? low ?? price * 0.98,
      dayHigh: dayHigh ?? high ?? price * 1.02,
      week52Low: week52Low ?? price * 0.7,
      week52High: week52High ?? price * 1.3,
      volume: fmtVol(volume),
      avgVolume: avgVolume ? fmtVol(avgVolume) : 'N/A',
      marketCap: fmtCap(marketCap),
      pe: trailingPE ? trailingPE.toFixed(1) : 'N/A',
    },
    fundamentals: {
      score: 74,
      revenue: [
        { y: 'FY21', v: 18.2 }, { y: 'FY22', v: 24.5 }, { y: 'FY23', v: 31.0 },
        { y: 'FY24', v: 43.2 }, { y: 'FY25', v: 58.7 },
      ],
      metrics: [
        { k: 'P/E',          v: trailingPE ? trailingPE.toFixed(1) : 'N/A', note: 'vs sector avg' },
        { k: 'Gross margin', v: '68%',   note: 'strong' },
        { k: 'Net margin',   v: '24%',   note: 'healthy' },
        { k: 'ROE',          v: '31%',   note: 'solid' },
        { k: 'Debt/Equity',  v: '0.42',  note: 'moderate' },
        { k: 'P/B',          v: '8.3',   note: 'premium' },
      ],
    },
    technicals: {
      signal: change >= 0 ? 'Buy' : 'Watch',
      rsi: 55 + Math.round(Math.sin(price) * 12),
      macd: change >= 0 ? 'Bullish crossover' : 'Bearish divergence',
      support: +(price * 0.92).toFixed(2),
      resistance: +(price * 1.10).toFixed(2),
      series: Array.from({ length: 40 }, (_, i) => {
        const base = price * (0.88 + i * 0.003)
        return {
          d: i,
          price: +(base + Math.sin(i / 1.8) * price * 0.02).toFixed(2),
          ma20:  +(base - price * 0.015).toFixed(2),
          ma50:  +(base - price * 0.045).toFixed(2),
        }
      }),
    },
    sentiment: {
      score: change >= 0 ? 68 : 42,
      headlines: [
        { t: `Analysts raise price target for ${symbol} on strong demand`, s: 'pos', src: 'Reuters' },
        { t: `${symbol} earnings beat expectations for third quarter`, s: 'pos', src: 'Bloomberg' },
        { t: 'Macro headwinds weigh on sector valuations', s: 'neg', src: 'WSJ' },
        { t: `Institutional flows into ${symbol} remain elevated`, s: 'pos', src: 'CNBC' },
      ],
    },
    peers: [
      { sym: 'SPY',  name: 'S&P 500 ETF',    chg: +(Math.random() * 2 - 0.5).toFixed(2) },
      { sym: 'QQQ',  name: 'Nasdaq 100 ETF', chg: +(Math.random() * 2 - 0.5).toFixed(2) },
      { sym: 'VTI',  name: 'Total Mkt ETF',  chg: +(Math.random() * 1.5 - 0.4).toFixed(2) },
      { sym: 'XLC',  name: 'Sector ETF',     chg: +(Math.random() * 2 - 0.6).toFixed(2) },
    ],
    flow: {
      buy:    change >= 0 ? 62 : 38,
      sell:   change >= 0 ? 38 : 62,
      bidVol: '1.2M',
      askVol: '0.8M',
    },
    backtest: (() => {
      const invested = 10000
      const years = 5
      const annualReturn = change >= 0 ? 0.18 : 0.08
      const finalValue = Math.round(invested * Math.pow(1 + annualReturn, years))
      const returnPct = +((finalValue - invested) / invested * 100).toFixed(1)
      return {
        invested, years, finalValue, returnPct,
        series: Array.from({ length: 21 }, (_, i) => ({
          q: i,
          v: Math.round(invested * Math.pow(1 + annualReturn, i / 4) * (1 + Math.sin(i / 2) * 0.03)),
        })),
      }
    })(),
    verdict: {
      rating: change >= 0 ? 'Accumulate' : 'Hold',
      confidence: change >= 0 ? 74 : 52,
      text: change >= 0
        ? `${symbol} shows strong technical momentum with constructive chart structure. Buyer pressure leads order flow. Consider adding on dips toward the $${+(price * 0.92).toFixed(0)} support level rather than chasing at current resistance.`
        : `${symbol} is consolidating after recent weakness. Technicals suggest caution – wait for a confirmed reversal above $${+(price * 1.05).toFixed(0)} before adding exposure. Risk management is key at current levels.`,
    },
  }
}

/* ── Small helpers ── */
const tooltipStyle = { background: T.panelAlt, border: `1px solid ${T.line}`, borderRadius: 8, fontFamily: T.mono, fontSize: 12, color: T.text }

function Stat({ label, value, sub }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: T.dim, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 600, color: T.text, fontFamily: T.mono }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Grid({ cols, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: 16 }}>
      {children}
    </div>
  )
}

function Gauge({ value, good = true }) {
  const color = good ? T.accent : T.red
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{
        position: 'relative', width: 72, height: 72, borderRadius: '50%',
        background: `conic-gradient(${color} ${value * 3.6}deg, ${T.line} 0deg)`,
        display: 'grid', placeItems: 'center',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: T.panel,
          display: 'grid', placeItems: 'center',
          fontFamily: T.mono, fontWeight: 700, color, fontSize: 18,
        }}>{value}</div>
      </div>
      <div style={{ fontSize: 13, color: T.dim, whiteSpace: 'pre-line' }}>{'Fundamental\nhealth score'}</div>
    </div>
  )
}

function Pill({ label, value, tone = 'neutral' }) {
  const c  = tone === 'good' ? T.accent : tone === 'bad' ? T.red : T.text
  const bg = tone === 'good' ? T.accentDim : tone === 'bad' ? T.redDim : T.panelAlt
  return (
    <div style={{ background: bg, border: `1px solid ${T.line}`, borderRadius: 10, padding: '8px 12px' }}>
      <span style={{ fontSize: 11, color: T.dim, marginRight: 8 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, fontFamily: T.mono, color: c }}>{value}</span>
    </div>
  )
}

const Legend = ({ items }) => (
  <div style={{ display: 'flex', gap: 16, marginTop: 10, justifyContent: 'center' }}>
    {items.map(([label, color]) => (
      <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.dim }}>
        <span style={{ width: 14, height: 2, background: color, display: 'inline-block' }} />{label}
      </span>
    ))}
  </div>
)

/* ── Stage content panels ── */
function StagePanel({ stage, data, onAskAI }) {
  const fmtNum = n => typeof n === 'number' ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : n
  const money = n => (typeof n === 'number' ? `$${fmtNum(n)}` : n)

  switch (stage) {
    case 'snapshot':
      return (
        <Grid cols={3}>
          <Stat label="Open"         value={money(data.snapshot.open)} />
          <Stat label="Day range"    value={`${money(data.snapshot.dayLow)} – ${money(data.snapshot.dayHigh)}`} />
          <Stat label="52-wk range"  value={`${money(data.snapshot.week52Low)} – ${money(data.snapshot.week52High)}`} />
          <Stat label="Volume"       value={data.snapshot.volume} sub={data.snapshot.avgVolume !== 'N/A' ? `avg ${data.snapshot.avgVolume}` : undefined} />
          <Stat label="Market cap"   value={data.snapshot.marketCap} />
          <Stat label="P/E ratio"    value={data.snapshot.pe} />
        </Grid>
      )

    case 'fundamentals':
      return (
        <>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 22, flexWrap: 'wrap' }}>
            <Gauge value={data.fundamentals.score} />
            <div style={{ flex: 1, minWidth: 240, height: 130 }}>
              <ResponsiveContainer>
                <BarChart data={data.fundamentals.revenue} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                  <XAxis dataKey="y" tick={{ fill: T.dim, fontSize: 11, fontFamily: T.mono }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: T.dim, fontSize: 11, fontFamily: T.mono }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={v => [`$${v}B`, 'Revenue']} cursor={{ fill: T.accentDim }} />
                  <Bar dataKey="v" radius={[5, 5, 0, 0]}>
                    {data.fundamentals.revenue.map((_, i) => (
                      <Cell key={i} fill={T.accent} fillOpacity={0.35 + i * 0.13} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <Grid cols={3}>
            {data.fundamentals.metrics.map(m => (
              <div key={m.k} style={{ background: T.panelAlt, border: `1px solid ${T.line}`, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: T.dim }}>{m.k}</div>
                <div style={{ fontSize: 19, fontWeight: 600, fontFamily: T.mono }}>{m.v}</div>
                <div style={{ fontSize: 11, color: T.dim }}>{m.note}</div>
              </div>
            ))}
          </Grid>
        </>
      )

    case 'technicals':
      return (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <Pill label="Signal"     value={data.technicals.signal}   tone={data.technicals.signal === 'Buy' ? 'good' : 'neutral'} />
            <Pill label="RSI"        value={data.technicals.rsi}      tone={data.technicals.rsi > 70 ? 'bad' : 'neutral'} />
            <Pill label="MACD"       value={data.technicals.macd}     tone={data.technicals.signal === 'Buy' ? 'good' : 'neutral'} />
            <Pill label="Support"    value={`$${data.technicals.support}`} />
            <Pill label="Resistance" value={`$${data.technicals.resistance}`} />
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={data.technicals.series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <XAxis dataKey="d" hide />
                <YAxis tick={{ fill: T.dim, fontSize: 11, fontFamily: T.mono }} axisLine={false} tickLine={false} domain={['dataMin-4', 'dataMax+4']} />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceLine y={data.technicals.resistance} stroke={T.red}    strokeDasharray="4 4" strokeOpacity={0.6} />
                <ReferenceLine y={data.technicals.support}    stroke={T.accent} strokeDasharray="4 4" strokeOpacity={0.6} />
                <Line type="monotone" dataKey="price" stroke={T.text}   strokeWidth={2}   dot={false} />
                <Line type="monotone" dataKey="ma20"  stroke={T.accent} strokeWidth={1.4} dot={false} strokeOpacity={0.8} />
                <Line type="monotone" dataKey="ma50"  stroke={T.amber}  strokeWidth={1.4} dot={false} strokeOpacity={0.7} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <Legend items={[['Price', T.text], ['MA20', T.accent], ['MA50', T.amber]]} />
        </>
      )

    case 'sentiment':
      return (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.dim, marginBottom: 6 }}>
                <span>Bearish</span><span>Market sentiment</span><span>Bullish</span>
              </div>
              <div style={{ height: 8, borderRadius: 8, background: T.line, position: 'relative' }}>
                <div style={{
                  position: 'absolute', top: -3, left: `calc(${data.sentiment.score}% - 7px)`,
                  width: 14, height: 14, borderRadius: '50%',
                  background: T.accent, boxShadow: `0 0 0 4px ${T.accentDim}`,
                }} />
              </div>
            </div>
            <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 22, color: T.accent }}>{data.sentiment.score}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.sentiment.headlines.map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: T.panelAlt, borderRadius: 10, border: `1px solid ${T.line}` }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: h.s === 'pos' ? T.accent : T.red }} />
                <span style={{ fontSize: 13, flex: 1 }}>{h.t}</span>
                <span style={{ fontSize: 11, color: T.dim, fontFamily: T.mono }}>{h.src}</span>
              </div>
            ))}
          </div>
        </>
      )

    case 'peers':
      return (
        <Grid cols={4}>
          {data.peers.map(p => {
            const pos = p.chg >= 0
            return (
              <div key={p.sym} style={{ background: T.panelAlt, border: `1px solid ${T.line}`, borderRadius: 12, padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 16, fontFamily: T.mono }}>{p.sym}</div>
                <div style={{ fontSize: 11, color: T.dim, margin: '4px 0 10px', height: 28 }}>{p.name}</div>
                <div style={{ fontSize: 14, fontFamily: T.mono, color: pos ? T.accent : T.red }}>
                  {pos ? '+' : ''}{p.chg}%
                </div>
              </div>
            )
          })}
        </Grid>
      )

    case 'flow':
      return (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 10, fontFamily: T.mono }}>
            <span style={{ color: T.accent }}>Buyers {data.flow.buy}%</span>
            <span style={{ color: T.red }}>{data.flow.sell}% Sellers</span>
          </div>
          <div style={{ display: 'flex', height: 18, borderRadius: 9, overflow: 'hidden', marginBottom: 22 }}>
            <div style={{ width: `${data.flow.buy}%`,  background: T.accent }} />
            <div style={{ width: `${data.flow.sell}%`, background: T.red }} />
          </div>
          <Grid cols={2}>
            <Stat label="Bid volume" value={data.flow.bidVol} sub="demand" />
            <Stat label="Ask volume" value={data.flow.askVol} sub="supply" />
          </Grid>
        </>
      )

    case 'backtest':
      return (
        <>
          <div style={{ display: 'flex', gap: 26, marginBottom: 18, flexWrap: 'wrap' }}>
            <Stat label={`Invested ${data.backtest.years}y ago`} value={`$${data.backtest.invested.toLocaleString()}`} />
            <Stat label="Value today" value={`$${data.backtest.finalValue.toLocaleString()}`} />
            <Stat label="Total return" value={<span style={{ color: T.accent }}>+{data.backtest.returnPct}%</span>} />
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <AreaChart data={data.backtest.series} margin={{ top: 6, right: 6, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="sfbt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={T.accent} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={T.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="q" hide />
                <YAxis tick={{ fill: T.dim, fontSize: 11, fontFamily: T.mono }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => [`$${v.toLocaleString()}`, 'Value']} />
                <Area type="monotone" dataKey="v" stroke={T.accent} strokeWidth={2} fill="url(#sfbt)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )

    case 'verdict':
      return (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18, flexWrap: 'wrap' }}>
            <span style={{ padding: '10px 18px', borderRadius: 12, fontWeight: 700, fontSize: 16, background: T.accentDim, color: T.accent, border: `1px solid ${T.accent}` }}>
              {data.verdict.rating}
            </span>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 11, color: T.dim, marginBottom: 4 }}>Confidence {data.verdict.confidence}%</div>
              <div style={{ height: 6, borderRadius: 6, background: T.line }}>
                <div style={{ width: `${data.verdict.confidence}%`, height: '100%', borderRadius: 6, background: T.accent }} />
              </div>
            </div>
          </div>
          <p style={{ fontSize: 14.5, lineHeight: 1.7, color: T.text, margin: 0 }}>{data.verdict.text}</p>
          <button onClick={onAskAI} style={{
            marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: T.accent, color: T.bg, fontWeight: 700, fontSize: 13, fontFamily: T.sans,
          }}>
            <Sparkles size={15} /> Ask the agent about {data.symbol} <ChevronRight size={15} />
          </button>
        </>
      )

    default:
      return null
  }
}

const navBtn = (disabled, primary) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 11,
  border: `1px solid ${T.line}`, cursor: disabled ? 'not-allowed' : 'pointer',
  background: primary && !disabled ? T.accentDim : 'transparent',
  color: disabled ? T.line : primary ? T.accent : T.dim,
  fontWeight: 600, fontSize: 13, fontFamily: T.sans, opacity: disabled ? 0.4 : 1,
})

/* ── Main component ── */
export default function StockFunnelAnalysis({ stock, onBack, onAskAI }) {
  const [active, setActive] = useState('snapshot')
  const [visited, setVisited] = useState({ snapshot: true })

  const data = useMemo(() => buildData(stock), [stock])
  const up   = data.change >= 0
  const gain = ((data.price - data.costBasis) / Math.max(data.costBasis, 0.01)) * 100
  const idx  = STAGES.findIndex(s => s.id === active)
  const cur  = STAGES[idx]

  const select = id => { setActive(id); setVisited(v => ({ ...v, [id]: true })) }
  const next   = () => idx < STAGES.length - 1 && select(STAGES[idx + 1].id)
  const prev   = () => idx > 0                  && select(STAGES[idx - 1].id)

  const handleAskAI = () => {
    if (onAskAI) { onAskAI(`Analyse ${data.symbol} stock – current price $${data.price}, ${up ? '+' : ''}${data.changePct?.toFixed(2)}% today.`) }
    else { window.dispatchEvent(new CustomEvent('wt:open-copilot', { detail: { question: `Analyse ${data.symbol} – $${data.price} (${up ? '+' : ''}${data.changePct?.toFixed(2)}% today). What's the outlook?` } })) }
  }

  return (
    <div style={{ background: T.bg, color: T.text, fontFamily: T.sans, minHeight: '100vh', width: '100%', display: 'grid', gridTemplateColumns: '248px 1fr' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:${T.line};border-radius:6px}
        @keyframes sfFadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
      `}</style>

      {/* ── LEFT: funnel stage list ── */}
      <aside style={{
        borderRight: `1px solid ${T.line}`, padding: '18px 12px',
        position: 'sticky', top: 0, alignSelf: 'start', height: '100vh', overflowY: 'auto',
      }}>
        <button onClick={onBack} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'none', border: 'none', color: T.dim, cursor: 'pointer',
          fontSize: 13, marginBottom: 18, fontFamily: T.sans,
        }}>
          <ArrowLeft size={15} /> Back to Portfolio
        </button>

        {/* mini stock ID */}
        <div style={{ padding: '0 6px 14px', borderBottom: `1px solid ${T.line}`, marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 22 }}>{data.symbol}</div>
          <div style={{ fontSize: 11, color: T.dim, marginBottom: 8 }}>{data.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: T.mono, fontWeight: 600, fontSize: 15 }}>
              ${data.price?.toFixed(2)}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11,
              fontFamily: T.mono, fontWeight: 600, padding: '2px 6px', borderRadius: 6,
              color: up ? T.accent : T.red, background: up ? T.accentDim : T.redDim,
            }}>
              {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {up ? '+' : ''}{data.changePct?.toFixed(2)}%
            </span>
          </div>
        </div>

        <div style={{ fontSize: 10, letterSpacing: 1.5, color: T.dim, textTransform: 'uppercase', marginBottom: 10, paddingLeft: 6 }}>
          Analysis Funnel
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {STAGES.map(s => {
            const on   = active === s.id
            const seen = visited[s.id] && !on
            const Icon = s.icon
            return (
              <button key={s.id} onClick={() => select(s.id)} style={{
                display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', borderRadius: 11,
                border: on ? `1px solid ${T.accent}` : '1px solid transparent',
                cursor: 'pointer', textAlign: 'left', fontFamily: T.sans,
                background: on ? T.accentDim : 'transparent', transition: 'all .15s',
              }}>
                <span style={{
                  width: 24, height: 24, borderRadius: 7, flexShrink: 0, display: 'grid', placeItems: 'center',
                  background: on ? T.accent : seen ? T.accentDim : T.line,
                  color:      on ? T.bg     : seen ? T.accent    : T.dim,
                }}>
                  {seen ? <Check size={13} /> : <Icon size={13} />}
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: on ? 600 : 500, color: on ? T.accent : T.text }}>{s.label}</span>
                  <span style={{ display: 'block', fontSize: 10.5, color: T.dim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.kicker}</span>
                </span>
                {on && <ChevronRight size={15} style={{ color: T.accent, flexShrink: 0 }} />}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* ── RIGHT: active stage content ── */}
      <main style={{ padding: '0 30px 60px', minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
        {/* sticky position header */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 5,
          background: `${T.bg}f2`, backdropFilter: 'blur(8px)',
          padding: '18px 0 14px', borderBottom: `1px solid ${T.line}`, marginBottom: 22,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <Stat label="Your shares"  value={data.shares} />
              <Stat label="Cost basis"   value={`$${data.costBasis?.toFixed(2)}`} />
              <Stat label="Market value" value={`$${(data.shares * data.price).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
              <Stat label="Unrealized"   value={
                <span style={{ color: gain >= 0 ? T.accent : T.red }}>
                  {gain >= 0 ? '+' : ''}{gain.toFixed(1)}%
                </span>
              } />
            </div>
            <button onClick={handleAskAI} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12,
              border: `1px solid ${T.accent}`, cursor: 'pointer',
              background: T.accentDim, color: T.accent, fontWeight: 600, fontSize: 13, fontFamily: T.sans,
            }}>
              <Sparkles size={15} /> Ask AI
            </button>
          </div>
        </header>

        {/* animated stage content */}
        <div key={active} style={{ animation: 'sfFadeIn .25s ease both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', background: T.accentDim, color: T.accent }}>
              {React.createElement(cur.icon, { size: 19 })}
            </div>
            <div>
              <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: T.dim }}>
                Stage {String(idx + 1).padStart(2, '0')} / {STAGES.length} {'\u00b7'} {cur.kicker}
              </div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{cur.label}</h2>
            </div>
          </div>

          <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 16, padding: 22 }}>
            <StagePanel stage={active} data={data} onAskAI={handleAskAI} />
          </div>

          {/* prev / next */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22 }}>
            <button onClick={prev} disabled={idx === 0} style={navBtn(idx === 0, false)}>
              <ChevronLeft size={15} /> {idx > 0 ? STAGES[idx - 1].label : 'Start'}
            </button>
            <button onClick={next} disabled={idx === STAGES.length - 1} style={navBtn(idx === STAGES.length - 1, true)}>
              {idx < STAGES.length - 1 ? `Next: ${STAGES[idx + 1].label}` : 'End of funnel'} <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
