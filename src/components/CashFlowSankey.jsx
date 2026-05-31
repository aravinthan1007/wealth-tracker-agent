import React, { useState, useEffect, useMemo } from 'react'
import { Sankey, Tooltip, ResponsiveContainer, Layer, Rectangle } from 'recharts'

/* ── Theme ── */
const T = {
  bg: '#060b17', panel: '#0c1322', panelAlt: '#0f1830', line: '#1a2540',
  text: '#e8edf5', dim: '#8898b8', accent: '#10d87c',
  mono: "'IBM Plex Mono','SF Mono',ui-monospace,monospace",
  sans: "'Space Grotesk','Inter',-apple-system,system-ui,sans-serif",
}

/* Income type → color palette */
const INCOME_COLORS = {
  salary:    '#10d87c',
  dividend:  '#3d8ef0',
  options:   '#a78bfa',
  rental:    '#f5a623',
  freelance: '#f472b6',
  interest:  '#38bdf8',
  other:     '#8898b8',
}

/* Expense category → color */
const EXPENSE_COLORS = [
  '#f05060', '#f5a623', '#ff8f6b', '#ffd166',
  '#9b8cff', '#5ad1c4', '#ff6b9d', '#c4b5fd',
]

const fmt = n => '$' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })

/* ── Build Sankey nodes + links from API data ── */
function buildSankeyData(incomeByType, expenseByCategory, totalIncome) {
  const incomeEntries = Object.entries(incomeByType || {}).filter(([, v]) => v > 0)
  const expenseEntries = Object.entries(expenseByCategory || {}).filter(([, v]) => v > 0)

  if (incomeEntries.length === 0) return { nodes: [], links: [] }

  const nodes = []
  const links = []

  // Left nodes: income sources
  incomeEntries.forEach(([type, _]) => {
    nodes.push({ name: type.charAt(0).toUpperCase() + type.slice(1), color: INCOME_COLORS[type] || '#8898b8', side: 'left' })
  })

  // Hub node: Total Income
  const hubIdx = nodes.length
  nodes.push({ name: 'Total Income', color: T.text, side: 'hub' })

  // Right nodes: expenses + savings bucket
  const totalExpenses = expenseEntries.reduce((s, [, v]) => s + v, 0)
  const savings = Math.max(0, totalIncome - totalExpenses)

  expenseEntries.forEach(([cat, _], i) => {
    nodes.push({ name: cat, color: EXPENSE_COLORS[i % EXPENSE_COLORS.length], side: 'right' })
  })

  if (savings > 0) {
    nodes.push({ name: 'Savings / Investments', color: '#10d87c', side: 'right' })
  }

  // Income → Hub links
  incomeEntries.forEach(([, v], i) => {
    links.push({ source: i, target: hubIdx, value: Math.round(v) })
  })

  // Hub → Expense links
  expenseEntries.forEach(([, v], i) => {
    links.push({ source: hubIdx, target: hubIdx + 1 + i, value: Math.round(v) })
  })

  // Hub → Savings
  if (savings > 0) {
    links.push({ source: hubIdx, target: hubIdx + 1 + expenseEntries.length, value: Math.round(savings) })
  }

  return { nodes, links }
}

/* ── Custom Sankey node ── */
function SankeyNode({ x, y, width, height, index, payload, nodes }) {
  const meta = nodes[index] || {}
  const isLeft = meta.side === 'left'
  const isHub  = meta.side === 'hub'
  const labelX = isLeft ? x - 8 : x + width + 8
  const anchor = isLeft ? 'end' : 'start'
  return (
    <Layer key={`node-${index}`}>
      <Rectangle x={x} y={y} width={width} height={height} radius={[3, 3, 3, 3]}
        fill={meta.color || T.accent} fillOpacity={0.95} />
      <text x={labelX} y={y + height / 2 - 5} textAnchor={anchor} dominantBaseline="middle"
        fontFamily={T.sans} fontSize={isHub ? 13 : 11.5} fontWeight={isHub ? 700 : 600} fill={T.text}>
        {meta.name}
      </text>
      <text x={labelX} y={y + height / 2 + 10} textAnchor={anchor} dominantBaseline="middle"
        fontFamily={T.mono} fontSize={10.5} fill={T.dim}>
        {fmt(payload.value)}
      </text>
    </Layer>
  )
}

/* ── Custom Sankey link ── */
function SankeyLink({ sourceX, sourceY, sourceControlX, targetX, targetY, targetControlX, linkWidth, index, links, nodes }) {
  const srcIdx = links[index]?.source ?? 0
  const color  = nodes[srcIdx]?.color || T.dim
  return (
    <path
      d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      fill="none" stroke={color} strokeWidth={Math.max(1, linkWidth)} strokeOpacity={0.2}
      style={{ transition: 'stroke-opacity .18s ease', cursor: 'default' }}
      onMouseEnter={e => { e.currentTarget.style.strokeOpacity = '0.48' }}
      onMouseLeave={e => { e.currentTarget.style.strokeOpacity = '0.2' }}
    />
  )
}

function Metric({ label, value, accent }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 11, color: T.dim, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: T.mono, color: accent ? T.accent : T.text }}>{value}</div>
    </div>
  )
}

/* ── Main component ── */
export default function CashFlowSankey() {
  const [income, setIncome]   = useState({ byType: {}, totalMonthly: 0 })
  const [expenses, setExpenses] = useState({ byCategory: {}, total: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [incRes, expRes] = await Promise.all([
          fetch('/api/income').then(r => r.json()),
          fetch('/api/expenses/summary').then(r => r.json()),
        ])
        if (incRes && !incRes.error) setIncome(incRes)
        if (expRes && !expRes.error) setExpenses(expRes)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const totalIncome   = income.totalMonthly || 0
  const totalExpenses = expenses.total || 0
  const saved         = Math.max(0, totalIncome - totalExpenses)
  const savingsRate   = totalIncome > 0 ? Math.round((saved / totalIncome) * 100) : 0

  const { nodes, links } = useMemo(
    () => buildSankeyData(income.byType, expenses.byCategory, totalIncome),
    [income, expenses, totalIncome]
  )

  const hasData = nodes.length > 0 && links.length > 0

  return (
    <div style={{
      background: T.panel, border: `1px solid ${T.line}`, borderRadius: 18,
      padding: 22, fontFamily: T.sans, color: T.text,
    }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: T.dim }}>Cash flow this month</div>
          <h2 style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 700 }}>Money Flow</h2>
        </div>
        <div style={{ display: 'flex', gap: 26 }}>
          <Metric label="Total income"     value={fmt(totalIncome)} />
          <Metric label="Total expenses"   value={fmt(totalExpenses)} />
          <Metric label="Saved / invested" value={fmt(saved)}          accent />
          <Metric label="Savings rate"     value={`${savingsRate}%`}   accent />
        </div>
      </div>

      {/* diagram */}
      {loading ? (
        <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.dim, fontSize: 13 }}>
          Loading cash flow data…
        </div>
      ) : !hasData ? (
        <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.dim, fontSize: 13 }}>
          Add income sources and expenses to see your money flow
        </div>
      ) : (
        <div style={{ height: 460, marginTop: 8 }}>
          <ResponsiveContainer>
            <Sankey
              data={{ nodes, links }}
              node={<SankeyNode nodes={nodes} />}
              link={<SankeyLink nodes={nodes} links={links} />}
              nodePadding={22}
              nodeWidth={12}
              margin={{ top: 16, right: 160, bottom: 16, left: 110 }}
            >
              <Tooltip
                contentStyle={{ background: T.panelAlt, border: `1px solid ${T.line}`, borderRadius: 8, fontFamily: T.mono, fontSize: 12, color: T.text }}
                formatter={v => [fmt(v), '']}
              />
            </Sankey>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ fontSize: 11, color: T.dim, marginTop: 6, textAlign: 'center' }}>
        Hover any ribbon to trace a flow · width = dollar amount
      </div>
    </div>
  )
}
