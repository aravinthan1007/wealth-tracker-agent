import React from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { LayoutDashboard, TrendingUp, CreditCard, Receipt, Upload, Calendar, Wallet, Menu, X, DollarSign, Brain, Cpu, Activity } from 'lucide-react'
import Overview from './pages/Overview'
import Portfolio from './pages/Portfolio'
import CreditCards from './pages/CreditCards'
import Expenses from './pages/Expenses'
import Statements from './pages/Statements'
import CalendarPage from './pages/CalendarPage'
import Income from './pages/Income'
import Research from './pages/Research'
import Agent from './pages/Agent'
import OnboardingAgent from './pages/OnboardingAgent'
import Onboarding from './components/Onboarding'
import './styles/global.css'

const NAV = [
  { path: '/overview', label: 'Overview', icon: LayoutDashboard },
  { path: '/portfolio', label: 'Portfolio', icon: TrendingUp },
  { path: '/income', label: 'Income', icon: DollarSign },
  { path: '/agent', label: 'ReAct Agent', icon: Cpu },
  { path: '/research', label: 'AI Research', icon: Brain },
  { path: '/credit-cards', label: 'Credit Cards', icon: CreditCard },
  { path: '/expenses', label: 'Expenses', icon: Receipt },
  { path: '/statements', label: 'Statements', icon: Upload },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
  { path: '/onboarding', label: 'DT Onboarding', icon: Activity },
]

export default function App() {
  const [collapsed, setCollapsed] = React.useState(false)
  const [onboarded, setOnboarded] = React.useState(() => !!localStorage.getItem('wt_onboarded'))
  return (
    <BrowserRouter>
      <div style={{ display:'flex', minHeight:'100vh', background:'#060b17', color:'#e8edf5', fontFamily:"'Inter',system-ui,sans-serif" }}>
        {/* Sidebar */}
        <nav style={{
          width: collapsed ? 64 : 240, flexShrink: 0,
          background: 'linear-gradient(180deg, #080e1d 0%, #060b17 100%)',
          borderRight: '1px solid #1a2540',
          display: 'flex', flexDirection: 'column',
          transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden', position: 'sticky', top: 0, height: '100vh',
          boxShadow: '2px 0 20px rgba(0,0,0,0.3)',
        }}>
          {/* Logo */}
          <div style={{ padding: collapsed ? '18px 0' : '18px 16px', display: 'flex', alignItems: 'center', gap: 11, borderBottom: '1px solid #1a2540', minHeight: 64, justifyContent: collapsed ? 'center' : 'flex-start' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #10d87c 0%, #0ea86a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 12px rgba(16,216,124,0.35)' }}>
              <Wallet size={17} color="#03180d" />
            </div>
            {!collapsed && (
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.03em', color: '#e8edf5' }}>WealthTrack</div>
                <div style={{ fontSize: 10, color: '#10d87c', fontWeight: 600, letterSpacing: '0.08em' }}>AGENT</div>
              </div>
            )}
          </div>

          {/* Nav label */}
          {!collapsed && (
            <div style={{ padding: '14px 16px 6px', fontSize: 10, fontWeight: 700, color: '#546080', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Navigation
            </div>
          )}

          {/* Nav links */}
          <div style={{ flex: 1, padding: collapsed ? '10px 8px' : '4px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV.map(({ path, label, icon: Icon }) => (
              <NavLink key={path} to={path} style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 11,
                padding: collapsed ? '10px 0' : '9px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 10, textDecoration: 'none', fontSize: 13, fontWeight: 500,
                color: isActive ? '#10d87c' : '#8898b8',
                background: isActive ? 'linear-gradient(135deg, rgba(16,216,124,0.12) 0%, rgba(16,216,124,0.04) 100%)' : 'transparent',
                border: isActive ? '1px solid rgba(16,216,124,0.2)' : '1px solid transparent',
                transition: 'all 0.15s ease', whiteSpace: 'nowrap',
                position: 'relative',
              })}>
                <Icon size={17} style={{ flexShrink: 0 }} />
                {!collapsed && <span style={{ fontSize: 13 }}>{label}</span>}
              </NavLink>
            ))}
          </div>

          {/* Footer */}
          <div style={{ padding: collapsed ? '10px 8px' : '10px 10px 16px', borderTop: '1px solid #1a2540' }}>
            {!collapsed && (
              <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(16,216,124,0.05)', border: '1px solid rgba(16,216,124,0.1)', marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: '#10d87c', fontWeight: 600, marginBottom: 2 }}>● LIVE</div>
                <div style={{ fontSize: 11, color: '#546080' }}>All agents active</div>
              </div>
            )}
            <button onClick={() => setCollapsed(c => !c)} style={{
              display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 8, width: '100%', padding: '8px 12px', border: '1px solid #1a2540',
              background: '#0d1528', cursor: 'pointer', color: '#546080', borderRadius: 9, fontSize: 12,
              transition: 'all 0.15s',
            }}>
              {collapsed ? <Menu size={16} /> : <><X size={16} /><span>Collapse</span></>}
            </button>
          </div>
        </nav>

        <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/income" element={<Income />} />
            <Route path="/research" element={<Research />} />
            <Route path="/agent" element={<Agent />} />
            <Route path="/credit-cards" element={<CreditCards />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/statements" element={<Statements />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/onboarding" element={<OnboardingAgent />} />
          </Routes>
        </div>
      </div>
      {!onboarded && <Onboarding onComplete={() => setOnboarded(true)} />}
    </BrowserRouter>
  )
}

