import React, { useState } from 'react'
import { User, DollarSign, TrendingUp, CheckCircle, ChevronRight, X } from 'lucide-react'
import { C, mono, fmt, Btn, Input } from './ui'

const STEPS = [
  { id: 'profile',  icon: User,        title: 'Your Profile',       desc: 'Tell us about yourself' },
  { id: 'salary',   icon: DollarSign,  title: 'Primary Income',     desc: 'Your main salary or income' },
  { id: 'holdings', icon: TrendingUp,  title: 'Investments',        desc: 'Add your first stock holding' },
  { id: 'done',     icon: CheckCircle, title: "You're all set!",    desc: 'WealthTrack is ready' },
]

const FREQ_OPTIONS = [
  { value: 'monthly',  label: 'Monthly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'annual',   label: 'Annual' },
]

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState({ name: '', currency: 'USD' })
  const [salary, setSalary] = useState({ label: '', amount: '', frequency: 'monthly', taxable: true })
  const [holding, setHolding] = useState({ symbol: '', shares: '', avgCost: '' })
  const [saving, setSaving] = useState(false)
  const [skipHolding, setSkipHolding] = useState(false)

  async function finish() {
    setSaving(true)
    try {
      // Save profile
      await fetch('/api/income/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, onboarded: true, onboardedAt: new Date().toISOString() }),
      })

      // Save salary as income source if filled
      if (salary.amount && parseFloat(salary.amount) > 0) {
        await fetch('/api/income', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'salary',
            label: salary.label || `${profile.name || 'My'} Salary`,
            amount: parseFloat(salary.amount),
            frequency: salary.frequency,
            taxable: salary.taxable,
            active: true,
          }),
        })
      }

      // Save stock holding to localStorage (Portfolio uses localStorage)
      if (!skipHolding && holding.symbol && holding.shares) {
        const sym = holding.symbol.toUpperCase().trim()
        const existing = JSON.parse(localStorage.getItem('portfolio') || '[]')
        const updated = [...existing.filter(p => p.symbol !== sym), {
          symbol: sym,
          shares: parseFloat(holding.shares) || 0,
          avgCost: parseFloat(holding.avgCost) || 0,
        }]
        localStorage.setItem('portfolio', JSON.stringify(updated))
      }

      // Mark onboarded in localStorage
      localStorage.setItem('wt_onboarded', '1')
    } catch(e) {}
    setSaving(false)
    onComplete()
  }

  function next() {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else finish()
  }

  const canNext = () => {
    if (step === 0) return profile.name.trim().length > 0
    if (step === 1) return true // salary is optional but shown
    if (step === 2) return true // holdings optional
    return true
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(6,11,23,0.92)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 540, maxWidth: '95vw', background: C.card,
        border: `1px solid ${C.border2}`, borderRadius: 20,
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 0', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#10d87c,#0ea86a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 18 }}>💰</span>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Welcome to WealthTrack</div>
              <div style={{ fontSize: 12, color: C.muted }}>Let's set up your financial profile</div>
            </div>
            <button onClick={() => { localStorage.setItem('wt_onboarded','1'); onComplete() }}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.subtle, cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>

          {/* Step indicators */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 0 }}>
            {STEPS.map((s, i) => {
              const done = i < step
              const active = i === step
              return (
                <div key={s.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center', gap: 4, marginBottom: 6 }}>
                    {i > 0 && <div style={{ flex: 1, height: 1, background: done || active ? C.green : C.border }} />}
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      background: done ? C.green : active ? 'rgba(16,216,124,0.15)' : C.card2,
                      border: `2px solid ${done || active ? C.green : C.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: done ? '#03180d' : active ? C.green : C.subtle,
                    }}>
                      {done ? '✓' : i + 1}
                    </div>
                    {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: done ? C.green : C.border }} />}
                  </div>
                  <div style={{ fontSize: 10, color: active ? C.green : done ? C.muted : C.subtle, textAlign: 'center', fontWeight: active ? 600 : 400 }}>{s.title}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px' }}>
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>What should we call you? This personalizes your dashboard.</div>
              <Input label="Your Name" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Alex Kumar" autoFocus />
              <div>
                <div style={{ fontSize: 11, color: C.subtle, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Currency</div>
                <select value={profile.currency} onChange={e => setProfile(p => ({ ...p, currency: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', background: '#0a1424', border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13 }}>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="INR">INR — Indian Rupee</option>
                  <option value="CAD">CAD — Canadian Dollar</option>
                </select>
              </div>
            </div>
          )}

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>
                Your salary is the foundation of wealth tracking. We use it to compute savings rate, net worth trajectory, and tax estimates.
              </div>
              <Input label="Employer / Income Label" value={salary.label} onChange={e => setSalary(s => ({ ...s, label: e.target.value }))} placeholder="Google — L5 Software Engineer" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Input label="Gross Amount ($)" type="number" value={salary.amount} onChange={e => setSalary(s => ({ ...s, amount: e.target.value }))} placeholder="10000" />
                <div>
                  <div style={{ fontSize: 11, color: C.subtle, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pay Frequency</div>
                  <select value={salary.frequency} onChange={e => setSalary(s => ({ ...s, frequency: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', background: '#0a1424', border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13 }}>
                    {FREQ_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
              </div>
              {salary.amount && (
                <div style={{ padding: '12px 16px', background: 'rgba(16,216,124,0.06)', border: `1px solid rgba(16,216,124,0.15)`, borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: C.subtle }}>Monthly: </span>
                  <span style={{ fontSize: 14, fontWeight: 700, ...mono, color: C.green }}>
                    {fmt.format(salary.frequency === 'annual' ? parseFloat(salary.amount)/12 : salary.frequency === 'biweekly' ? parseFloat(salary.amount)*2.17 : parseFloat(salary.amount))}
                  </span>
                  <span style={{ fontSize: 12, color: C.subtle, marginLeft: 12 }}>Est. take-home (75%): </span>
                  <span style={{ fontSize: 14, fontWeight: 700, ...mono, color: C.text }}>
                    {fmt.format((salary.frequency === 'annual' ? parseFloat(salary.amount)/12 : salary.frequency === 'biweekly' ? parseFloat(salary.amount)*2.17 : parseFloat(salary.amount)) * 0.75)}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="ob_taxable" checked={salary.taxable} onChange={e => setSalary(s => ({ ...s, taxable: e.target.checked }))} style={{ accentColor: C.green }} />
                <label htmlFor="ob_taxable" style={{ fontSize: 13, color: C.muted, cursor: 'pointer' }}>This is taxable income</label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>
                Add your first stock holding to track portfolio value. You can add more on the Portfolio page anytime.
              </div>
              {!skipHolding ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <Input label="Ticker Symbol" value={holding.symbol} onChange={e => setHolding(h => ({ ...h, symbol: e.target.value.toUpperCase() }))} placeholder="AAPL" />
                    <Input label="Shares" type="number" value={holding.shares} onChange={e => setHolding(h => ({ ...h, shares: e.target.value }))} placeholder="10" />
                    <Input label="Avg Cost ($)" type="number" value={holding.avgCost} onChange={e => setHolding(h => ({ ...h, avgCost: e.target.value }))} placeholder="150" />
                  </div>
                  <button onClick={() => setSkipHolding(true)}
                    style={{ background: 'none', border: 'none', color: C.subtle, cursor: 'pointer', fontSize: 12, textAlign: 'left', padding: 0 }}>
                    Skip for now →
                  </button>
                </>
              ) : (
                <div style={{ padding: 20, textAlign: 'center', background: C.card2, borderRadius: 10, border: `1px solid ${C.border}` }}>
                  <div style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>Skipping stock setup — you can add holdings from the Portfolio page anytime.</div>
                  <button onClick={() => setSkipHolding(false)} style={{ background: 'none', border: 'none', color: C.green, cursor: 'pointer', fontSize: 13 }}>Add a holding →</button>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,216,124,0.15)', border: `2px solid ${C.green}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle size={28} color={C.green} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                Welcome{profile.name ? `, ${profile.name}` : ''}! 🎉
              </div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 16 }}>
                Your financial profile is set up. WealthTrack will now track your:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left', background: C.card2, borderRadius: 10, padding: '14px 18px', border: `1px solid ${C.border}` }}>
                {['Income & salary tracking', 'Stock portfolio & live quotes', 'Credit card utilization', 'Expense budgets & categories', 'PDF statement parsing with AI', 'Google Finance news feed'].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: C.muted }}>
                    <span style={{ color: C.green }}>✓</span> {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '0 28px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: C.subtle }}>Step {step + 1} of {STEPS.length}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && step < 3 && (
              <Btn onClick={() => setStep(s => s - 1)} variant="secondary">Back</Btn>
            )}
            <Btn onClick={next} disabled={!canNext() || saving} style={{ minWidth: 120 }}>
              {saving ? 'Saving…' : step === STEPS.length - 1 ? 'Open Dashboard' : <>Next <ChevronRight size={14} /></>}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  )
}
