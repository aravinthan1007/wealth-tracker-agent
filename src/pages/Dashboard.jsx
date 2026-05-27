import React, { useEffect, useState, useRef } from 'react'
import {
  TrendingUp, TrendingDown, Home, CreditCard, PiggyBank,
  Activity, Circle, Zap, RefreshCw
} from 'lucide-react'
import { formatCurrency } from '../utils/formatCurrency'

/* â”€â”€ Design tokens (uipro: Dark Mode OLED + Fira Code/Sans) â”€â”€ */
const C = {
  bg: '#020617', surface: '#0f172a', card: '#1e293b', border: '#334155',
  text: '#f8fafc', muted: '#94a3b8', subtle: '#64748b',
  green: '#22c55e', red: '#ef4444', blue: '#0ea5e9',
  greenBg: '#14532d', redBg: '#450a0a',
}

const mono = { fontFamily: "'Fira Code', monospace" }
const sans = { fontFamily: "'Fira Sans', system-ui, sans-serif" }

const S = {
  root:    { minHeight: '100vh', background: C.bg, color: C.text, ...sans },
  header:  { background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo:    { fontSize: 18, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '-0.01em' },
  badge:   { fontSize: 11, background: C.blue, color: '#fff', borderRadius: 20, padding: '2px 10px', fontWeight: 600, letterSpacing: 1, ...mono },
  main:    { maxWidth: 1200, margin: '0 auto', padding: '28px 24px' },
  grid3:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16, marginBottom: 20 },
  grid2:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 16, marginBottom: 20 },
  card:    { background: C.card, borderRadius: 12, padding: '20px 24px', border: `1px solid ${C.border}`, transition: 'border-color 200ms, box-shadow 200ms' },
  label:   { fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, ...sans },
  secTitle:{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 },
  table:   { width: '100%', borderCollapse: 'collapse' },
  th:      { textAlign: 'left', color: C.subtle, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, padding: '0 0 10px', borderBottom: `1px solid ${C.border}`, ...sans },
  td:      { padding: '10px 0', borderBottom: `1px solid ${C.surface}`, color: C.text, verticalAlign: 'middle' },
  chip:    (pos) => ({ fontSize: 11, borderRadius: 6, padding: '3px 8px', fontWeight: 700, background: pos ? C.greenBg : C.redBg, color: pos ? C.green : C.red, ...mono }),
  agentRow:{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${C.surface}`, fontSize: 13, transition: 'background 150ms' },
  track:   { background: C.border, borderRadius: 99, height: 6, marginTop: 6, overflow: 'hidden' },
}

const AGENTS = [
  { name: 'StocksAgent', icon: TrendingUp },
  { name: 'MortgageAgent', icon: Home },
  { name: 'LoanAgent', icon: CreditCard },
  { name: 'SavingsAgent', icon: PiggyBank },
  { name: 'NetWorthAgent', icon: Activity },
  { name: 'OrchestratorAgent', icon: Zap },
]

/* â”€â”€ Sub-components â”€â”€ */

function LiveDot({ live }) {
  return (
    <span style={{
      width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
      background: live ? C.green : C.red,
      boxShadow: live ? `0 0 8px ${C.green}` : 'none',
      transition: 'background 300ms, box-shadow 300ms',
    }} />
  )
}

function StatCard({ label, value, sub, positive, icon: Icon }) {
  const isPos = positive !== undefined ? positive : (value != null && value >= 0)
  const color = isPos ? C.green : C.red
  return (
    <div style={{ ...S.card, ':hover': {} }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 0 20px ${color}22` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={S.label}>
        {Icon && <Icon size={13} />}
        {label}
      </div>
      <div style={{
        fontSize: 28, fontWeight: 800, color,
        textShadow: `0 0 12px ${color}44`,
        letterSpacing: '-0.02em', lineHeight: 1.1, ...mono
      }}>
        {value == null ? 'â€”' : formatCurrency(value)}
      </div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

function AgentStatusPanel({ live }) {
  return (
    <div style={S.card}>
      <div style={S.secTitle}><Activity size={15} color={C.blue} /> Agent Status</div>
      {AGENTS.map(({ name, icon: Icon }) => (
        <div key={name} style={S.agentRow}
          onMouseEnter={e => { e.currentTarget.style.background = C.surface }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <Icon size={13} color={live ? C.green : C.subtle} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, color: C.muted, ...mono, fontSize: 12 }}>{name}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: live ? C.green : C.subtle,
            textShadow: live ? `0 0 8px ${C.green}66` : 'none' }}>
            {live ? 'Active' : 'Idle'}
          </span>
        </div>
      ))}
    </div>
  )
}

function StocksPanel({ stocks }) {
  return (
    <div style={S.card}>
      <div style={S.secTitle}><TrendingUp size={15} color={C.green} /> Stocks</div>
      {(!stocks || !stocks.length)
        ? <div style={{ color: C.subtle, fontSize: 13 }}>No data</div>
        : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Symbol</th>
                <th style={S.th}>Price</th>
                <th style={S.th}>Shares</th>
                <th style={S.th}>Value</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map(s => (
                <tr key={s.symbol}
                  onMouseEnter={e => { e.currentTarget.style.background = C.surface }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  style={{ cursor: 'default', transition: 'background 150ms' }}
                >
                  <td style={S.td}><strong style={{ color: C.text, ...mono }}>{s.symbol}</strong></td>
                  <td style={{ ...S.td, ...mono, color: C.muted }}>{formatCurrency(s.price)}</td>
                  <td style={{ ...S.td, color: C.muted }}>{s.shares ?? 1}</td>
                  <td style={S.td}><span style={S.chip(true)}>{formatCurrency(s.price * (s.shares ?? 1))}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }
    </div>
  )
}

function LiabilitiesPanel({ title, icon: Icon, items, rateField }) {
  return (
    <div style={S.card}>
      <div style={S.secTitle}><Icon size={15} color={C.red} /> {title}</div>
      {(!items || !items.length)
        ? <div style={{ color: C.subtle, fontSize: 13 }}>No data</div>
        : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>ID</th>
                <th style={S.th}>Balance</th>
                {rateField && <th style={S.th}>Rate</th>}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}
                  onMouseEnter={e => { e.currentTarget.style.background = C.surface }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  style={{ transition: 'background 150ms' }}
                >
                  <td style={S.td}><strong style={{ color: C.text, ...mono }}>{item.id}</strong></td>
                  <td style={S.td}><span style={S.chip(false)}>{formatCurrency(item.balance)}</span></td>
                  {rateField && <td style={{ ...S.td, color: C.muted }}>{item[rateField] ? `${(item[rateField] * 100).toFixed(1)}%` : 'â€”'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )
      }
    </div>
  )
}

function SavingsPanel({ savings }) {
  const total = (savings || []).reduce((s, a) => s + (a.balance || 0), 0)
  const goal = 20000
  const pct = Math.min(100, Math.round((total / goal) * 100))

  return (
    <div style={S.card}>
      <div style={S.secTitle}><PiggyBank size={15} color={C.green} /> Savings</div>
      {(!savings || !savings.length)
        ? <div style={{ color: C.subtle, fontSize: 13 }}>No data</div>
        : (
          <>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Account</th>
                  <th style={S.th}>Balance</th>
                  <th style={S.th}>Rate</th>
                </tr>
              </thead>
              <tbody>
                {savings.map(s => (
                  <tr key={s.id}
                    onMouseEnter={e => { e.currentTarget.style.background = C.surface }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    style={{ transition: 'background 150ms' }}
                  >
                    <td style={S.td}><strong style={{ color: C.text, ...mono }}>{s.id}</strong></td>
                    <td style={S.td}><span style={S.chip(true)}>{formatCurrency(s.balance)}</span></td>
                    <td style={{ ...S.td, color: C.muted }}>{s.rate ? `${(s.rate * 100).toFixed(1)}%` : 'â€”'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginBottom: 6 }}>
                <span>Goal progress</span>
                <span style={{ ...mono, color: C.green }}>{pct}%</span>
              </div>
              <div style={S.track}>
                <div style={{ height: '100%', borderRadius: 99, background: C.green, width: `${pct}%`,
                  boxShadow: `0 0 8px ${C.green}66`, transition: 'width 600ms ease' }} />
              </div>
              <div style={{ fontSize: 11, color: C.subtle, marginTop: 6, ...mono }}>
                {formatCurrency(total)} of {formatCurrency(goal)}
              </div>
            </div>
          </>
        )
      }
    </div>
  )
}

/* â”€â”€ Main Dashboard â”€â”€ */
export default function Dashboard() {
  const [data, setData]           = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [live, setLive]           = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = () => {
    setRefreshing(true)
    Promise.all([
      fetch('/api/agents/networth').then(r => r.json()).catch(() => ({})),
      fetch('/data/mockStocks.json').then(r => r.json()).catch(() => []),
      fetch('/data/mockMortgage.json').then(r => r.json()).catch(() => []),
      fetch('/data/mockLoans.json').then(r => r.json()).catch(() => []),
      fetch('/data/mockSavings.json').then(r => r.json()).catch(() => []),
    ]).then(([nw, stocks, mortgages, loans, savings]) => {
      setData({ ...nw, stocks, mortgages, loans, savings })
      setLastUpdate(new Date().toISOString())
    }).finally(() => setRefreshing(false))
  }

  useEffect(() => {
    load()
    setLive(true)
    // Poll every 5s for live updates (SSE has cross-origin/proxy issues in dev)
    const poll = setInterval(() => {
      fetch('/api/agents/networth')
        .then(r => r.json())
        .then(nw => {
          setData(prev => ({ ...(prev || {}), ...nw }))
          setLastUpdate(new Date().toISOString())
          setLive(true)
        })
        .catch(() => setLive(false))
    }, 5000)
    return () => clearInterval(poll)
  }, [])

  const nw    = data?.netWorth ?? null
  const assets = data?.totalAssets ?? null
  const liabs  = data?.totalLiabilities ?? null

  return (
    <div style={S.root}>
      {/* Header */}
      <header style={S.header}>
        <div style={S.logo}>
          <LiveDot live={live} />
          Wealth Tracker
          <span style={{ fontSize: 12, color: C.subtle, fontWeight: 400, ...mono }}>Agent</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={S.badge}>LIVE</span>
          {lastUpdate && (
            <span style={{ fontSize: 11, color: C.subtle, ...mono }}>
              {new Date(lastUpdate).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={load}
            title="Refresh"
            style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted,
              cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4,
              transition: 'border-color 150ms, color 150ms' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.color = C.blue }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}
          >
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </header>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <main style={S.main}>
        {/* Summary stat cards */}
        <div style={S.grid3}>
          <StatCard label="Net Worth" value={nw} sub={nw != null ? (nw >= 0 ? 'Positive balance' : 'Liabilities exceed assets') : 'Loading...'} />
          <StatCard label="Total Assets" value={assets} positive={true} sub="Stocks + Savings" icon={TrendingUp} />
          <StatCard label="Total Liabilities" value={liabs} positive={false} sub="Mortgage + Loans" icon={TrendingDown} />
        </div>

        {/* Stocks + Agent status */}
        <div style={S.grid2}>
          <StocksPanel stocks={data?.stocks} />
          <AgentStatusPanel live={live} />
        </div>

        {/* Bottom row: Mortgage, Loans, Savings */}
        <div style={S.grid3}>
          <LiabilitiesPanel title="Mortgage" icon={Home} items={data?.mortgages} rateField="rate" />
          <LiabilitiesPanel title="Loans" icon={CreditCard} items={data?.loans} rateField="rate" />
          <SavingsPanel savings={data?.savings} />
        </div>
      </main>
    </div>
  )
}
