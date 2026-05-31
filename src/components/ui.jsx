// Shared design tokens and helpers used across all pages

export const C = {
  bg: '#060b17',
  surface: '#0b1120',
  card: '#0d1528',
  card2: '#111d35',
  border: '#1a2540',
  border2: '#223058',
  text: '#e8edf5',
  muted: '#8898b8',
  subtle: '#546080',
  green: '#10d87c',
  green2: '#0ea86a',
  greenBg: 'rgba(16,216,124,0.08)',
  greenBorder: 'rgba(16,216,124,0.2)',
  red: '#f05060',
  redBg: 'rgba(240,80,96,0.08)',
  blue: '#3d8ef0',
  blueBg: 'rgba(61,142,240,0.08)',
  amber: '#f5a623',
  amberBg: 'rgba(245,166,35,0.08)',
  purple: '#8b5cf6',
  purpleBg: 'rgba(139,92,246,0.08)',
}

export const mono = { fontFamily: "'JetBrains Mono','Fira Code',monospace" }
export const sans = { fontFamily: "'Inter',system-ui,sans-serif" }

export const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
export const fmtN = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
export const fmtK = (n) => {
  if (!n && n !== 0) return '—'
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  return fmt.format(n)
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{
      padding: '22px 28px 18px',
      borderBottom: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 12,
      background: `linear-gradient(135deg, rgba(16,216,124,0.02) 0%, transparent 60%)`,
    }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>{title}</h1>
        {subtitle && <p style={{ margin: '3px 0 0', fontSize: 13, color: C.muted }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  )
}

export function Card({ children, style, hover }) {
  return (
    <div
      className={hover ? 'card-hover' : undefined}
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        transition: 'all 0.2s ease',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function Btn({ children, onClick, variant = 'primary', size = 'md', style, disabled }) {
  const sizes = {
    sm: { padding: '5px 12px', fontSize: 12, borderRadius: 7 },
    md: { padding: '8px 16px', fontSize: 13, borderRadius: 9 },
    lg: { padding: '11px 22px', fontSize: 14, borderRadius: 10 },
  }
  const variants = {
    primary: {
      background: `linear-gradient(135deg, ${C.green} 0%, ${C.green2} 100%)`,
      color: '#03180d',
      fontWeight: 600,
      boxShadow: '0 2px 12px rgba(16,216,124,0.25)',
      border: 'none',
    },
    secondary: {
      background: C.card2,
      color: C.muted,
      border: `1px solid ${C.border2}`,
      fontWeight: 500,
    },
    danger: {
      background: C.redBg,
      color: C.red,
      border: `1px solid rgba(240,80,96,0.3)`,
      fontWeight: 500,
    },
    ghost: {
      background: 'transparent',
      color: C.muted,
      border: '1px solid transparent',
      fontWeight: 500,
    },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: "'Inter',sans-serif",
        transition: 'all 0.15s ease',
        opacity: disabled ? 0.45 : 1,
        whiteSpace: 'nowrap',
        letterSpacing: '-0.01em',
        ...sizes[size],
        ...variants[variant],
        ...style,
      }}
    >
      {children}
    </button>
  )
}

export function Badge({ children, color = 'green' }) {
  const map = {
    green: { bg: C.greenBg, color: C.green, border: C.greenBorder },
    red: { bg: C.redBg, color: C.red, border: 'rgba(240,80,96,0.25)' },
    amber: { bg: C.amberBg, color: C.amber, border: 'rgba(245,166,35,0.25)' },
    blue: { bg: C.blueBg, color: C.blue, border: 'rgba(61,142,240,0.25)' },
    purple: { bg: C.purpleBg, color: C.purple, border: 'rgba(139,92,246,0.25)' },
  }
  const t = map[color] || map.green
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 99,
      background: t.bg, color: t.color, border: `1px solid ${t.border}`,
      ...mono, letterSpacing: '0.02em',
    }}>
      {children}
    </span>
  )
}

export function Input({ label, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <label style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </label>
      )}
      <input
        {...props}
        style={{
          background: C.card2,
          border: `1px solid ${C.border2}`,
          borderRadius: 9,
          padding: '9px 13px',
          color: C.text,
          fontSize: 13,
          fontFamily: "'Inter',sans-serif",
          outline: 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          ...props.style,
        }}
      />
    </div>
  )
}

export function Select({ label, children, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <label style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </label>
      )}
      <select
        {...props}
        style={{
          background: C.card2,
          border: `1px solid ${C.border2}`,
          borderRadius: 9,
          padding: '9px 13px',
          color: C.text,
          fontSize: 13,
          fontFamily: "'Inter',sans-serif",
          outline: 'none',
          cursor: 'pointer',
          ...props.style,
        }}
      >
        {children}
      </select>
    </div>
  )
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(6,11,23,0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: 20,
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.card,
          border: `1px solid ${C.border2}`,
          borderRadius: 18,
          padding: 28,
          minWidth: 400,
          maxWidth: 540,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          animation: 'slideIn 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: C.card2, border: `1px solid ${C.border}`,
              borderRadius: 8, color: C.muted, cursor: 'pointer',
              width: 30, height: 30, fontSize: 16, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function StatCard({ label, value, sub, color, icon: Icon, trend }) {
  const col = color || C.green
  // icon can be a component function/forwardRef OR a pre-rendered JSX element
  const isIconElement = Icon != null && typeof Icon === 'object' && 'props' in Icon
  // trend can be a number (shown as %) or a string (shown as label)
  const trendIsNum = typeof trend === 'number'
  return (
    <div
      className="card-hover"
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: '20px 22px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        cursor: 'default',
      }}
    >
      {/* Subtle top accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${col} 0%, transparent 70%)`,
        opacity: 0.6,
      }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {Icon && (
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: `${col}14`,
              border: `1px solid ${col}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isIconElement ? Icon : <Icon size={14} color={col} />}
            </div>
          )}
          <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        </div>
        {trend !== undefined && (
          trendIsNum
            ? <Badge color={trend >= 0 ? 'green' : 'red'}>{trend >= 0 ? '+' : ''}{trend.toFixed(1)}%</Badge>
            : <span style={{ fontSize: 11, color: col, fontWeight: 500 }}>{trend}</span>
        )}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: col, ...mono, letterSpacing: '-0.03em', marginBottom: 5, animation: 'countUp 0.4s ease' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: C.subtle }}>{sub}</div>}
    </div>
  )
}

export function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8, color: C.muted, fontSize: 13 }}>
      <div style={{ width: 16, height: 16, border: `2px solid ${C.border2}`, borderTopColor: C.green, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      Loading…
    </div>
  )
}

export function EmptyState({ message, icon }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: C.subtle, fontSize: 13 }}>
      {icon && <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>{icon}</div>}
      {message}
    </div>
  )
}

export function SectionHeader({ title, subtitle, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: C.subtle, marginTop: 1 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  )
}

export function ProgressBar({ value, max, color }) {
  const pct = max ? Math.min((value / max) * 100, 100) : 0
  const col = color || (pct > 80 ? C.red : pct > 60 ? C.amber : C.green)
  return (
    <div style={{ height: 4, background: C.border, borderRadius: 99, overflow: 'hidden' }}>
      <div style={{
        width: `${pct}%`, height: '100%', borderRadius: 99,
        background: `linear-gradient(90deg, ${col} 0%, ${col}bb 100%)`,
        transition: 'width 0.6s ease',
        boxShadow: `0 0 8px ${col}60`,
      }} />
    </div>
  )
}

