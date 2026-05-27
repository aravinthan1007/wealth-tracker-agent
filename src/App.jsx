import React from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { LayoutDashboard, TrendingUp, CreditCard, Receipt, Upload, Calendar, Wallet, Menu, X } from 'lucide-react'
import Overview from './pages/Overview'
import Portfolio from './pages/Portfolio'
import CreditCards from './pages/CreditCards'
import Expenses from './pages/Expenses'
import Statements from './pages/Statements'
import CalendarPage from './pages/CalendarPage'
import './styles/global.css'

const NAV = [
  { path: '/overview', label: 'Overview', icon: LayoutDashboard },
  { path: '/portfolio', label: 'Portfolio', icon: TrendingUp },
  { path: '/credit-cards', label: 'Credit Cards', icon: CreditCard },
  { path: '/expenses', label: 'Expenses', icon: Receipt },
  { path: '/statements', label: 'Statements', icon: Upload },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
]

export default function App() {
  const [collapsed, setCollapsed] = React.useState(false)
  return (
    <BrowserRouter>
      <div style={{ display:'flex', minHeight:'100vh', background:'#020617', color:'#f8fafc', fontFamily:"'Fira Sans',system-ui,sans-serif" }}>
        {/* Sidebar */}
        <nav style={{
          width: collapsed ? 60 : 220, flexShrink: 0, background: '#0a0f1a',
          borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column',
          transition: 'width 0.2s', overflow: 'hidden', position: 'sticky', top: 0, height: '100vh'
        }}>
          <div style={{ padding: '18px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #1e293b', minHeight: 60 }}>
            <Wallet size={22} color="#22c55e" style={{ flexShrink: 0 }} />
            {!collapsed && <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>WealthTracker</span>}
          </div>
          <div style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {NAV.map(({ path, label, icon: Icon }) => (
              <NavLink key={path} to={path} style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 500,
                color: isActive ? '#22c55e' : '#94a3b8',
                background: isActive ? 'rgba(34,197,94,0.08)' : 'transparent',
                transition: 'all 0.15s', whiteSpace: 'nowrap'
              })}>
                <Icon size={17} style={{ flexShrink: 0 }} />
                {!collapsed && label}
              </NavLink>
            ))}
          </div>
          <div style={{ padding: '12px 8px', borderTop: '1px solid #1e293b' }}>
            <button onClick={() => setCollapsed(c => !c)} style={{
              display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 8, width: '100%', padding: '8px 10px', border: 'none',
              background: 'transparent', cursor: 'pointer', color: '#64748b', borderRadius: 6, fontSize: 12
            }}>
              {collapsed ? <Menu size={17} /> : <><X size={17} /><span>Collapse</span></>}
            </button>
          </div>
        </nav>

        <div style={{ flex: 1, overflow: 'auto' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/credit-cards" element={<CreditCards />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/statements" element={<Statements />} />
            <Route path="/calendar" element={<CalendarPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

