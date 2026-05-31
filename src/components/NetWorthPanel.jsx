import React, { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp, TrendingDown, Home, CreditCard, PiggyBank,
  DollarSign, Car, Landmark, RefreshCw, Plus, ChevronRight,
  Briefcase, BarChart2,
} from 'lucide-react'
import { C, mono, fmt, fmtK } from './ui'

// ── tiny helpers ─────────────────────────────────────────────────────────────
const pct = (v, total) => total ? ((v / total) * 100).toFixed(1) + '%' : '0%'

function Section({ label, color, children }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{
        fontSize: 9, fontWeight: 700, color, letterSpacing: '0.12em',
        textTransform: 'uppercase', padding: '8px 16px 4px',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ flex: 1 }}>{label}</span>
        <div style={{ height: 1, flex: 1, background: `${color}30` }} />
      </div>
      {children}
    </div>
  )
}

function LineItem({ icon: Icon, label, value, sub, color = C.text, bar, barColor, total, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 16px', cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.12s',
        borderRadius: 0,
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        background: `${color}18`, border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={13} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: C.text, fontWeight: 500, lineHeight: 1.2 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: C.subtle, marginTop: 1 }}>{sub}</div>}
        {bar && (
          <div style={{ height: 2, borderRadius: 2, background: C.border, marginTop: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: pct(bar, total),
              background: `linear-gradient(90deg, ${barColor || color}, ${barColor || color}99)`,
              transition: 'width 0.6s ease',
            }} />
          </div>
        )}
      </div>
      <span style={{ fontSize: 12, color, fontWeight: 600, ...mono, flexShrink: 0 }}>
        {value}
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function NetWorthPanel({ onAskAgent }) {
  const [nw, setNw]           = useState(null)
  const [stocks, setStocks]   = useState([])
  const [income, setIncome]   = useState(null)
  const [cards, setCards]     = useState([])
  const [loans, setLoans]     = useState([])
  const [mortgage, setMortgage] = useState([])
  const [savings, setSavings] = useState([])
  const [events, setEvents]   = useState([])
  const [expenses, setExpenses] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setRefreshing(true)
    const safe = p => p.catch(() => null)
    const [nwRes, stRes, incRes, ccRes, expRes, evRes] = await Promise.all([
      safe(fetch('/api/agents/networth').then(r => r.json())),
      safe(fetch('/api/stocks/quote?symbols=AAPL,MSFT,TSLA,GOOGL,NVDA').then(r => r.json())),
      safe(fetch('/api/income/summary').then(r => r.json())),
      safe(fetch('/api/creditcards').then(r => r.json())),
      safe(fetch('/api/expenses/summary').then(r => r.json())),
      safe(fetch('/api/google/events').then(r => r.json())),
    ])
    if (nwRes) setNw(nwRes)
    if (stRes && Array.isArray(stRes)) setStocks(stRes)
    if (incRes) setIncome(incRes)
    if (ccRes && Array.isArray(ccRes)) setCards(ccRes)
    if (expRes) setExpenses(expRes)
    if (evRes?.events) setEvents(evRes.events)
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [load])

  // ── Derived values ──────────────────────────────────────────────────────────
  const stockValue   = stocks.reduce((s, st) => s + (st.price || 0) * (st.shares || 1), 0)
  const cashValue    = savings.reduce((s, sv) => s + (sv.balance || 0), 0) + 12_000 // mock savings
  const totalAssets  = nw?.totalAssets  ?? (stockValue + cashValue)
  const totalLiab    = nw?.totalLiabilities ?? 0
  const netWorth     = nw?.netWorth ?? (totalAssets - totalLiab)
  const totalCcBal   = cards.reduce((s, c) => s + (c.balance || 0), 0)
  const totalCcLimit = cards.reduce((s, c) => s + (c.limit || 0), 0)
  const utilPct      = totalCcLimit ? ((totalCcBal / totalCcLimit) * 100).toFixed(0) : 0

  const upcomingPayments = events.filter(e =>
    (e.type === 'payment' || e.type === 'deadline') &&
    new Date(e.date) >= new Date()
  ).slice(0, 3)

  const nwColor = netWorth >= 0 ? C.green : C.red

  return (
    <aside style={{
      width: 280,
      flexShrink: 0,
      background: 'linear-gradient(180deg, #080e1d 0%, #060b17 100%)',
      borderRight: `1px solid ${C.border}`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* ── Net worth hero ─────────────────────────────────────────────────── */}
      <div style={{
        padding: '20px 16px 16px',
        borderBottom: `1px solid ${C.border}`,
        background: 'linear-gradient(135deg, rgba(16,216,124,0.04) 0%, transparent 60%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.subtle, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Net Worth
          </span>
          <button
            onClick={load}
            disabled={refreshing}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: C.subtle, padding: 3, display: 'flex', alignItems: 'center',
            }}
          >
            <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>

        <div style={{
          fontSize: 28, fontWeight: 800, color: nwColor,
          letterSpacing: '-0.04em', lineHeight: 1, ...mono,
        }}>
          {loading ? '···' : fmtK(netWorth)}
        </div>
        <div style={{ fontSize: 11, color: C.subtle, marginTop: 4 }}>
          {netWorth >= 0 ? '▲ Assets exceed liabilities' : '▼ Net negative — review liabilities'}
        </div>

        {/* Assets vs Liabilities bar */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: C.green }}>Assets {fmtK(totalAssets)}</span>
            <span style={{ fontSize: 10, color: C.red }}>Liab {fmtK(totalLiab)}</span>
          </div>
          <div style={{ height: 4, borderRadius: 4, background: `${C.red}40`, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              width: totalAssets ? pct(totalAssets, totalAssets + totalLiab) : '50%',
              background: `linear-gradient(90deg, ${C.green}, ${C.green2})`,
              transition: 'width 0.8s ease',
            }} />
          </div>
        </div>
      </div>

      {/* ── Scrollable content ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>

        {/* ASSETS */}
        <Section label="Assets" color={C.green}>
          <LineItem
            icon={TrendingUp} color={C.green}
            label="Stocks & Equities"
            value={fmtK(stockValue)}
            sub={`${stocks.length} positions tracked`}
            bar={stockValue} barColor={C.green} total={totalAssets}
            onClick={() => onAskAgent?.('Show me my full portfolio breakdown and performance')}
          />
          <LineItem
            icon={PiggyBank} color={C.blue}
            label="Cash & Savings"
            value={fmtK(cashValue)}
            sub="Checking + savings accounts"
            bar={cashValue} barColor={C.blue} total={totalAssets}
          />
          <LineItem
            icon={Home} color="#f5a623"
            label="Real Estate"
            value="$650,000"
            sub="Primary residence (est.)"
            bar={650_000} barColor="#f5a623" total={totalAssets}
            onClick={() => onAskAgent?.('What is my real estate equity and how is my mortgage performing?')}
          />
          <LineItem
            icon={Landmark} color="#8b5cf6"
            label="Bonds"
            value="$50,000"
            sub="Fixed income"
            bar={50_000} barColor="#8b5cf6" total={totalAssets}
          />
          <LineItem
            icon={Car} color={C.subtle}
            label="Vehicle (depreciated)"
            value="$22,000"
            sub="~15% annual depreciation"
            bar={22_000} barColor={C.subtle} total={totalAssets}
          />
        </Section>

        {/* LIABILITIES */}
        <Section label="Liabilities" color={C.red}>
          <LineItem
            icon={Home} color={C.red}
            label="Mortgage"
            value="$380,000"
            sub="30yr fixed · est. payoff 2049"
            onClick={() => onAskAgent?.('How much equity do I have and when will my mortgage be paid off?')}
          />
          {cards.slice(0, 3).map(card => (
            <LineItem
              key={card.id}
              icon={CreditCard} color={totalCcBal > totalCcLimit * 0.3 ? C.red : C.amber}
              label={card.name || 'Credit Card'}
              value={fmt.format(card.balance || 0)}
              sub={`${utilPct}% util · ${card.apr ? card.apr + '% APR' : ''}`}
            />
          ))}
          {cards.length === 0 && (
            <LineItem icon={CreditCard} color={C.red} label="Credit Cards" value={fmtK(totalCcBal)} sub="Loading…" />
          )}
          <LineItem
            icon={DollarSign} color={C.amber}
            label="Other Loans"
            value="$8,000"
            sub="Auto + personal"
          />
        </Section>

        {/* INCOME SNAPSHOT */}
        {income && (
          <Section label="Monthly Income" color={C.blue}>
            <LineItem
              icon={Briefcase} color={C.blue}
              label="Salary"
              value={fmt.format(income.totalMonthly || 0)}
              sub={`${Object.keys(income.byType || {}).length} income streams`}
              onClick={() => onAskAgent?.('How much do I earn monthly and how is my income distributed?')}
            />
            {expenses && (
              <LineItem
                icon={BarChart2} color={C.green}
                label="Monthly Surplus"
                value={fmt.format((income.totalMonthly || 0) - (expenses.total || 0))}
                sub="Income minus expenses"
              />
            )}
          </Section>
        )}

        {/* UPCOMING BILLS */}
        {upcomingPayments.length > 0 && (
          <Section label="Upcoming Bills" color={C.amber}>
            {upcomingPayments.map((ev, i) => (
              <LineItem
                key={i}
                icon={CreditCard} color={C.amber}
                label={ev.title || ev.description || 'Payment'}
                value={ev.amount ? fmt.format(ev.amount) : '—'}
                sub={new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
            ))}
          </Section>
        )}

        {/* QUICK ASK AGENT */}
        <div style={{ padding: '12px 16px 4px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.subtle, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
            Quick Actions
          </div>
          {[
            'Am I on track for retirement?',
            'What stocks should I rebalance?',
            'How can I reduce my debt faster?',
          ].map((q, i) => (
            <button
              key={i}
              onClick={() => onAskAgent?.(q)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                width: '100%', marginBottom: 5,
                padding: '7px 10px', borderRadius: 8,
                background: 'transparent', border: `1px solid ${C.border}`,
                color: C.muted, fontSize: 11, cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.green + '60'; e.currentTarget.style.color = C.green }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}
            >
              <ChevronRight size={11} style={{ flexShrink: 0 }} />
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* ── Expenses summary footer ─────────────────────────────────────────── */}
      {expenses && (
        <div style={{
          padding: '10px 16px', borderTop: `1px solid ${C.border}`,
          background: '#080e1d',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, color: C.subtle }}>Monthly spend</span>
          <span style={{ fontSize: 12, color: C.amber, fontWeight: 600, ...mono }}>
            {fmt.format(expenses.total || 0)}
          </span>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </aside>
  )
}
