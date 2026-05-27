// Shared design tokens and helpers used across all pages

export const C = {
  bg: '#020617', surface: '#0a0f1a', card: '#0f172a', card2: '#1e293b',
  border: '#1e293b', border2: '#334155', text: '#f8fafc', muted: '#94a3b8',
  subtle: '#64748b', green: '#22c55e', greenBg: 'rgba(34,197,94,0.08)',
  greenBorder: 'rgba(34,197,94,0.2)', red: '#ef4444', redBg: 'rgba(239,68,68,0.08)',
  blue: '#0ea5e9', blueBg: 'rgba(14,165,233,0.08)', amber: '#f59e0b',
  amberBg: 'rgba(245,158,11,0.08)', purple: '#a855f7', purpleBg: 'rgba(168,85,247,0.08)'
}

export const mono = { fontFamily: "'Fira Code', monospace" }
export const sans = { fontFamily: "'Fira Sans', system-ui, sans-serif" }

export const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
export const fmtN = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{ padding: '24px 28px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>{title}</h1>
        {subtitle && <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}
    </div>
  )
}

export function Card({ children, style }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, ...style }}>
      {children}
    </div>
  )
}

export function Btn({ children, onClick, variant = 'primary', size = 'md', style, disabled }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none',
    borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
    fontWeight: 500, transition: 'all 0.15s', opacity: disabled ? 0.5 : 1
  }
  const sizes = { sm: { padding: '6px 12px', fontSize: 12 }, md: { padding: '8px 16px', fontSize: 13 }, lg: { padding: '10px 20px', fontSize: 14 } }
  const variants = {
    primary: { background: C.green, color: '#000' },
    secondary: { background: C.card2, color: C.muted, border: `1px solid ${C.border2}` },
    danger: { background: C.redBg, color: C.red, border: `1px solid rgba(239,68,68,0.3)` },
    ghost: { background: 'transparent', color: C.muted }
  }
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...sizes[size], ...variants[variant], ...style }}>{children}</button>
}

export function Badge({ children, color = 'green' }) {
  const map = { green: { bg: C.greenBg, color: C.green, border: C.greenBorder }, red: { bg: C.redBg, color: C.red, border: 'rgba(239,68,68,0.2)' }, amber: { bg: C.amberBg, color: C.amber, border: 'rgba(245,158,11,0.2)' }, blue: { bg: C.blueBg, color: C.blue, border: 'rgba(14,165,233,0.2)' } }
  const t = map[color] || map.green
  return <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: t.bg, color: t.color, border: `1px solid ${t.border}`, ...mono }}>{children}</span>
}

export function Input({ label, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{label}</label>}
      <input {...props} style={{
        background: C.card2, border: `1px solid ${C.border2}`, borderRadius: 8,
        padding: '8px 12px', color: C.text, fontSize: 13, fontFamily: 'inherit',
        outline: 'none', ...props.style
      }} />
    </div>
  )
}

export function Select({ label, children, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{label}</label>}
      <select {...props} style={{
        background: C.card2, border: `1px solid ${C.border2}`, borderRadius: 8,
        padding: '8px 12px', color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', ...props.style
      }}>
        {children}
      </select>
    </div>
  )
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }} onClick={onClose}>
      <div style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 16, padding: 28, minWidth: 380, maxWidth: 520, width: '100%', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function StatCard({ label, value, sub, color = C.green, icon: Icon }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {Icon && <Icon size={15} color={C.muted} />}
        <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color, ...mono, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.subtle }}>{sub}</div>}
    </div>
  )
}

export function Spinner() {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: C.muted, fontSize: 13 }}>Loading…</div>
}

export function EmptyState({ message }) {
  return <div style={{ textAlign: 'center', padding: '40px 20px', color: C.subtle, fontSize: 13 }}>{message}</div>
}
