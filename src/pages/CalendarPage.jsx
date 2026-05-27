import React, { useState, useEffect } from 'react'
import { Calendar, Mail, Link2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { C, mono, fmt, PageHeader, Card, Btn, Badge, Spinner } from '../components/ui'

export default function CalendarPage() {
  const [status, setStatus] = useState(null)
  const [events, setEvents] = useState([])
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const [st, ev, em] = await Promise.all([
        fetch('/api/google/status').then(r=>r.json()),
        fetch('/api/google/events').then(r=>r.json()),
        fetch('/api/google/emails').then(r=>r.json()),
      ])
      setStatus(st)
      setEvents(ev.events || [])
      setEmails(em.emails || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const now = new Date()
  const upcoming = events.filter(e => new Date(e.date) >= new Date(now.toDateString()))
  const past = events.filter(e => new Date(e.date) < new Date(now.toDateString()))

  const TYPE_COLORS = { payment: C.red, income: C.green, deadline: C.amber, other: C.blue }
  const TYPE_BADGE = { payment: 'red', income: 'green', deadline: 'amber', other: 'blue' }

  return (
    <div>
      <PageHeader
        title="Calendar & Gmail"
        subtitle="Financial events, payment due dates, and email summaries"
        actions={
          !status?.connected && (
            <Btn onClick={() => fetch('/api/google/connect').then(r=>r.json()).then(d => alert(d.instructions.join('\n')))} variant="secondary" size="sm">
              <Link2 size={12} />Connect Google
            </Btn>
          )
        }
      />

      <div style={{ padding:'20px 28px', display:'flex', flexDirection:'column', gap:16 }}>

        {/* Connection status */}
        <Card style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:12,
          background: status?.connected ? C.greenBg : C.amberBg,
          border: `1px solid ${status?.connected ? C.greenBorder : 'rgba(245,158,11,0.2)'}` }}>
          {status?.connected
            ? <CheckCircle size={18} color={C.green} />
            : <AlertCircle size={18} color={C.amber} />}
          <div>
            <div style={{ fontWeight:600, fontSize:13, color: status?.connected ? C.green : C.amber }}>
              {status?.connected ? 'Google Account Connected' : 'Google Account Not Connected'}
            </div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
              {status?.connected ? 'Live calendar and Gmail data active' : 'Showing demo data — connect Google to see real events'}
            </div>
          </div>
          {!status?.connected && (
            <div style={{ marginLeft:'auto' }}>
              <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer"
                style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:C.amber, textDecoration:'none' }}>
                Setup Guide <ExternalLink size={11} />
              </a>
            </div>
          )}
        </Card>

        {loading ? <Spinner /> : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

            {/* Upcoming events */}
            <Card style={{ padding:0, overflow:'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:8 }}>
                <Calendar size={15} color={C.blue} />
                <span style={{ fontWeight:600, fontSize:14 }}>Upcoming Financial Events</span>
                {!status?.connected && <Badge color="amber">DEMO</Badge>}
              </div>
              {upcoming.length === 0 ? (
                <div style={{ padding:24, textAlign:'center', color:C.subtle, fontSize:13 }}>No upcoming events</div>
              ) : (
                upcoming.sort((a,b) => new Date(a.date)-new Date(b.date)).map(ev => {
                  const d = new Date(ev.date)
                  const diff = Math.ceil((d - now)/(1000*60*60*24))
                  return (
                    <div key={ev.id} style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}`, display:'flex', gap:14, alignItems:'flex-start' }}>
                      <div style={{ textAlign:'center', minWidth:40, padding:'6px 8px', background:TYPE_COLORS[ev.type]+'22', borderRadius:8 }}>
                        <div style={{ fontSize:18, fontWeight:700, color:TYPE_COLORS[ev.type], ...mono }}>
                          {d.getDate()}
                        </div>
                        <div style={{ fontSize:9, color:C.muted, textTransform:'uppercase' }}>
                          {d.toLocaleDateString('en-US',{month:'short'})}
                        </div>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600, marginBottom:3 }}>{ev.title}</div>
                        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                          <Badge color={TYPE_BADGE[ev.type] || 'blue'}>{ev.type}</Badge>
                          <span style={{ fontSize:11, color:C.subtle }}>in {diff} day{diff!==1?'s':''}</span>
                          {ev.amount && <span style={{ fontSize:12, ...mono, color: ev.type==='income' ? C.green : C.red }}>{fmt.format(ev.amount)}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </Card>

            {/* Gmail summary */}
            <Card style={{ padding:0, overflow:'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:8 }}>
                <Mail size={15} color={C.amber} />
                <span style={{ fontWeight:600, fontSize:14 }}>Financial Email Summary</span>
                {!status?.connected && <Badge color="amber">DEMO</Badge>}
              </div>
              {emails.length === 0 ? (
                <div style={{ padding:24, textAlign:'center', color:C.subtle, fontSize:13 }}>No emails</div>
              ) : (
                emails.map(em => {
                  const typeColor = { statement: C.blue, payment: C.green, charge: C.amber, income: C.green }[em.type] || C.muted
                  return (
                    <div key={em.id} style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}` }}>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:500, marginBottom:4, lineHeight:1.4 }}>{em.subject}</div>
                          <div style={{ fontSize:11, color:C.subtle }}>{em.from}</div>
                          <div style={{ fontSize:11, color:C.subtle, marginTop:2 }}>{new Date(em.date).toLocaleDateString()}</div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <Badge color={TYPE_BADGE[em.type] || 'blue'}>{em.type}</Badge>
                          {em.amount && <div style={{ fontSize:14, fontWeight:700, ...mono, color:typeColor, marginTop:4 }}>{fmt.format(em.amount)}</div>}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </Card>
          </div>
        )}

        {/* Setup instructions for Google */}
        {!status?.connected && (
          <Card style={{ padding:'18px 20px' }}>
            <div style={{ fontWeight:600, fontSize:14, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
              <Link2 size={14} color={C.blue} />
              How to Connect Google Account
            </div>
            <ol style={{ margin:0, padding:'0 0 0 20px', display:'flex', flexDirection:'column', gap:10 }}>
              {[
                'Go to console.cloud.google.com and create a new project',
                'Enable Gmail API and Google Calendar API in "APIs & Services"',
                'Create OAuth 2.0 credentials — type: Web Application',
                'Add http://localhost:3000/api/google/callback as redirect URI',
                'Copy Client ID and Secret to backend/.env as GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET',
                'Restart the backend server and click "Connect Google" above',
              ].map((step, i) => (
                <li key={i} style={{ fontSize:13, color:C.muted, lineHeight:1.5 }}>
                  <span style={{ color:C.text }}>{step}</span>
                </li>
              ))}
            </ol>
          </Card>
        )}
      </div>
    </div>
  )
}
