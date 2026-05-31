import React, { useState, useEffect, useCallback, useRef, Component } from 'react'

// Error boundary — prevents one broken section from crashing the whole page
class SectionErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) return (
      <div style={{ padding: '40px 28px', color: '#f05060', fontSize: 13 }}>
        ⚠ Section failed to load: {this.state.error.message}
      </div>
    )
    return this.props.children
  }
}
import {
  Wallet, Sparkles, LayoutDashboard, TrendingUp, DollarSign,
  Receipt, CreditCard, Calendar, Settings, ChevronUp, Menu, X,
} from 'lucide-react'
import Overview   from './pages/Overview'
import Portfolio  from './pages/Portfolio'
import Income     from './pages/Income'
import Expenses   from './pages/Expenses'
import CreditCards from './pages/CreditCards'
import CalendarPage from './pages/CalendarPage'
import CopilotDrawer    from './components/CopilotDrawer'
import ObservabilityStrip from './components/ObservabilityStrip'
import { C, fmtK, mono } from './components/ui'
import './styles/global.css'

const NAV = [
  { id: 'overview',  label: 'Overview',    icon: LayoutDashboard },
  { id: 'portfolio', label: 'Portfolio',   icon: TrendingUp },
  { id: 'income',    label: 'Income',      icon: DollarSign },
  { id: 'expenses',  label: 'Expenses',    icon: Receipt },
  { id: 'cards',     label: 'Credit Cards',icon: CreditCard },
  { id: 'calendar',  label: 'Calendar',    icon: Calendar },
]

const SECTIONS = [
  { id: 'overview',  Component: Overview },
  { id: 'portfolio', Component: Portfolio },
  { id: 'income',    Component: Income },
  { id: 'expenses',  Component: Expenses },
  { id: 'cards',     Component: CreditCards },
  { id: 'calendar',  Component: CalendarPage },
]

function useNetWorth() {
  const [nw, setNw] = useState(null)
  useEffect(() => {
    const load = () => fetch('/api/agents/networth').then(r => r.json()).then(d => { if (d && typeof d.netWorth === 'number') setNw(d) }).catch(() => {})
    load()
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [])
  return nw
}

function Sidebar({ active, onScrollTo, collapsed, onToggle }) {
  return (
    <nav style={{
      width: collapsed ? 56 : 220, flexShrink: 0,
      background: 'linear-gradient(180deg, #080e1d 0%, #060b17 100%)',
      borderRight: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
      overflow: 'hidden', position: 'sticky', top: 0,
    }}>
      {!collapsed && (
        <div style={{
          padding: '14px 16px 6px', fontSize: 9, fontWeight: 700,
          color: C.subtle, letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>Jump to</div>
      )}
      <div style={{ flex: 1, padding: collapsed ? '10px 6px' : '4px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <button key={id} onClick={() => onScrollTo(id)} title={collapsed ? label : undefined}
              style={{
                display: 'flex', alignItems: 'center',
                gap: collapsed ? 0 : 10,
                padding: collapsed ? '10px 0' : '9px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                width: '100%', borderRadius: 9,
                border: isActive ? `1px solid ${C.green}30` : '1px solid transparent',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(16,216,124,0.12) 0%, rgba(16,216,124,0.04) 100%)'
                  : 'transparent',
                color: isActive ? C.green : C.muted,
                fontSize: 13, fontWeight: isActive ? 600 : 500,
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{label}</span>}
              {!collapsed && isActive && (
                <span style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: C.green }} />
              )}
            </button>
          )
        })}
      </div>
      <div style={{ height: 1, background: C.border, margin: '4px 12px' }} />
      <div style={{ padding: collapsed ? '8px 6px 14px' : '8px 8px 14px' }}>
        <button onClick={onToggle}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', padding: '8px', borderRadius: 8,
            background: 'transparent', border: `1px solid ${C.border}`,
            color: C.subtle, cursor: 'pointer', transition: 'all 0.15s', gap: 6,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.color = C.text }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.subtle }}
        >
          {collapsed ? <Menu size={14} /> : <><X size={14} /><span style={{ fontSize: 12 }}>Collapse</span></>}
        </button>
      </div>
    </nav>
  )
}

export default function App() {
  const [activeSection, setActiveSection]   = useState('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [copilotOpen, setCopilotOpen]       = useState(false)
  const [copilotQuestion, setCopilotQuestion] = useState(null)
  const [showScrollTop, setShowScrollTop]   = useState(false)
  const mainRef = useRef(null)
  const nw = useNetWorth()

  // IntersectionObserver — update active nav item as user scrolls
  useEffect(() => {
    const main = mainRef.current
    if (!main) return
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveSection(entry.target.dataset.section)
        })
      },
      { root: main, rootMargin: '-40% 0px -55% 0px', threshold: 0 }
    )
    SECTIONS.forEach(({ id }) => {
      const el = main.querySelector(`[data-section="${id}"]`)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  // Show scroll-to-top button after scrolling down
  useEffect(() => {
    const main = mainRef.current
    if (!main) return
    const onScroll = () => setShowScrollTop(main.scrollTop > 400)
    main.addEventListener('scroll', onScroll)
    return () => main.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = useCallback((id) => {
    const main = mainRef.current
    const el = main?.querySelector(`[data-section="${id}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const openCopilot = useCallback((question) => {
    setCopilotQuestion(question ?? null)
    setCopilotOpen(true)
  }, [])

  const nwColor = nw ? (nw.netWorth >= 0 ? C.green : C.red) : C.muted

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden',
      background: C.bg, color: C.text, fontFamily: "'Inter',system-ui,sans-serif",
    }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '0 18px', height: 52, flexShrink: 0,
        borderBottom: `1px solid ${C.border}`,
        background: 'linear-gradient(90deg, #080e1d 0%, #060b17 100%)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.04)',
        zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 27, height: 27, borderRadius: 7,
            background: 'linear-gradient(135deg, #10d87c, #0ea86a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(16,216,124,0.3)',
          }}>
            <Wallet size={13} color="#03180d" />
          </div>
          <div style={{ lineHeight: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.03em' }}>WealthTrack</div>
            <div style={{ fontSize: 9, color: C.green, fontWeight: 600, letterSpacing: '0.08em' }}>AGENT</div>
          </div>
        </div>

        <div style={{ width: 1, height: 20, background: C.border }} />

        {nw && (
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 6,
            padding: '4px 10px', borderRadius: 8,
            background: `${nwColor}10`, border: `1px solid ${nwColor}30`,
          }}>
            <span style={{ fontSize: 10, color: C.subtle, fontWeight: 500 }}>Net Worth</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: nwColor, letterSpacing: '-0.03em', ...mono }}>
              {fmtK(nw.netWorth)}
            </span>
          </div>
        )}

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: C.green,
            boxShadow: '0 0 5px rgba(16,216,124,0.5)',
            animation: 'pulse 2s ease infinite',
          }} />
          <span style={{ fontSize: 10, color: C.subtle, fontWeight: 500 }}>LIVE</span>
        </div>

        <button title="Settings" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 30, height: 30, borderRadius: 7,
          background: 'transparent', border: `1px solid ${C.border}`,
          color: C.subtle, cursor: 'pointer', transition: 'all 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.color = C.text }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.subtle }}
        >
          <Settings size={14} />
        </button>

        <button onClick={() => openCopilot()} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '7px 14px', borderRadius: 9,
          background: copilotOpen
            ? 'linear-gradient(135deg, #10d87c, #0ea86a)'
            : `linear-gradient(135deg, ${C.green}18, ${C.green}08)`,
          border: `1px solid ${C.green}${copilotOpen ? '' : '40'}`,
          color: copilotOpen ? '#03180d' : C.green,
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
          boxShadow: copilotOpen ? '0 2px 12px rgba(16,216,124,0.3)' : 'none',
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => { if (!copilotOpen) { e.currentTarget.style.background = `linear-gradient(135deg,${C.green}28,${C.green}14)`; e.currentTarget.style.borderColor = `${C.green}70` } }}
          onMouseLeave={e => { if (!copilotOpen) { e.currentTarget.style.background = `linear-gradient(135deg,${C.green}18,${C.green}08)`; e.currentTarget.style.borderColor = `${C.green}40` } }}
        >
          <Sparkles size={13} />
          Ask AI
        </button>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <Sidebar
          active={activeSection}
          onScrollTo={scrollTo}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(c => !c)}
        />

        {/* Single scrolling page — all sections stacked */}
        <main ref={mainRef} style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden', minWidth: 0,
          transition: 'filter 0.25s ease',
          filter: copilotOpen ? 'brightness(0.82)' : 'none',
        }}>
          {SECTIONS.map(({ id, Component }, i) => (
            <SectionErrorBoundary key={id}>
            <div data-section={id} style={{
              borderBottom: i < SECTIONS.length - 1 ? `1px solid ${C.border}` : 'none',
            }}>
              {/* Section divider label (not for overview) */}
              {i > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '16px 24px 0',
                }}>
                  <div style={{ height: 1, flex: 1, background: C.border }} />
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: C.subtle,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}>
                    {NAV.find(n => n.id === id)?.label}
                  </span>
                  <div style={{ height: 1, flex: 1, background: C.border }} />
                </div>
              )}
              <Component />
            </div>
            </SectionErrorBoundary>
          ))}
        </main>
      </div>

      <ObservabilityStrip />

      <CopilotDrawer
        open={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        activeSection={activeSection}
        initialQuestion={copilotQuestion}
      />

      {/* Scroll-to-top button */}
      {showScrollTop && !copilotOpen && (
        <button
          onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          title="Back to top"
          style={{
            position: 'fixed', bottom: 70, right: 24, zIndex: 150,
            width: 38, height: 38, borderRadius: '50%',
            background: C.card2, border: `1px solid ${C.border2}`,
            color: C.muted, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = C.green }}
          onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border2 }}
        >
          <ChevronUp size={16} />
        </button>
      )}

      {/* Floating Ask AI FAB */}
      {!copilotOpen && (
        <button onClick={() => openCopilot()} style={{
          position: 'fixed', bottom: 56, right: 72, zIndex: 150,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 24,
          background: 'linear-gradient(135deg, #10d87c, #0ea86a)',
          border: 'none', color: '#03180d',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(16,216,124,0.4), 0 2px 8px rgba(0,0,0,0.4)',
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(16,216,124,0.5),0 2px 8px rgba(0,0,0,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(16,216,124,0.4),0 2px 8px rgba(0,0,0,0.4)' }}
        >
          <Sparkles size={15} />
          Ask AI
        </button>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )
}
