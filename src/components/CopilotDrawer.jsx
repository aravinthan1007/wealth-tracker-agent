import React, { useEffect, useRef, useCallback } from 'react'
import { X, Brain, Sparkles } from 'lucide-react'
import AgentChat from '../pages/AgentChat'
import { C } from './ui'

// Context-aware suggestion sets per section
const SECTION_SUGGESTIONS = {
  overview:   [
    'Give me a full financial health summary',
    'Am I on track for retirement?',
    'What are my biggest financial risks right now?',
  ],
  portfolio:  [
    'Analyze my portfolio for concentration risk',
    'What stocks should I consider rebalancing?',
    'Compare AAPL vs MSFT fundamentals',
  ],
  income:     [
    'How is my income distributed across sources?',
    'What is my effective savings rate?',
    'How can I increase passive income?',
  ],
  expenses:   [
    'What are my top spending categories this month?',
    'Where can I cut expenses to save more?',
    'Compare my spending to last month',
  ],
  cards:      [
    'Which credit card should I pay off first?',
    'What is my total credit utilization?',
    'How much am I paying in card interest annually?',
  ],
  calendar:   [
    'What bills are due this week?',
    'Summarize my upcoming financial events',
    'Am I at risk of missing any payments?',
  ],
}

export default function CopilotDrawer({ open, onClose, activeSection, initialQuestion }) {
  const agentRef    = useRef(null)
  const drawerRef   = useRef(null)
  const prevOpenRef = useRef(false)

  // Handle Esc key
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // When drawer opens with an initialQuestion, inject it into agent
  useEffect(() => {
    if (open && !prevOpenRef.current && initialQuestion) {
      // Small delay so the drawer animation starts before agent starts streaming
      setTimeout(() => agentRef.current?.sendQuestion(initialQuestion), 150)
    }
    prevOpenRef.current = open
  }, [open, initialQuestion])

  const suggestions = SECTION_SUGGESTIONS[activeSection] || SECTION_SUGGESTIONS.overview

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(6,11,23,0.6)',
          backdropFilter: 'blur(2px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Drawer panel */}
      <aside
        ref={drawerRef}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 440,
          zIndex: 201,
          display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(180deg, #08101f 0%, #060b17 100%)',
          borderLeft: `1px solid ${C.border}`,
          boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Drawer header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px', borderBottom: `1px solid ${C.border}`,
          background: 'linear-gradient(135deg, rgba(16,216,124,0.04) 0%, transparent 60%)',
          flexShrink: 0,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: `linear-gradient(135deg, ${C.green}, ${C.green2})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(16,216,124,0.3)',
          }}>
            <Brain size={14} color="#03180d" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>
              AI Copilot
            </div>
            <div style={{ fontSize: 10, color: C.subtle }}>
              Context: <span style={{ color: C.green, textTransform: 'capitalize' }}>{activeSection}</span>
              {' · '}ReAct reasoning + tool calls
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 7,
              background: 'transparent', border: `1px solid ${C.border}`,
              color: C.subtle, cursor: 'pointer', flexShrink: 0,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.color = C.text }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.subtle }}
            aria-label="Close copilot"
          >
            <X size={14} />
          </button>
        </div>

        {/* Context suggestions (only when agent is idle) */}
        {open && (
          <div style={{
            padding: '10px 14px', borderBottom: `1px solid ${C.border}`,
            background: '#070d1a', flexShrink: 0,
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.subtle, letterSpacing: '0.1em', marginBottom: 7 }}>
              SUGGESTED FOR {activeSection.toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => agentRef.current?.sendQuestion(s)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '6px 10px', borderRadius: 8, textAlign: 'left',
                    background: 'transparent', border: `1px solid ${C.border}`,
                    color: C.muted, fontSize: 11, cursor: 'pointer',
                    transition: 'all 0.15s', lineHeight: 1.4,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${C.green}50`; e.currentTarget.style.color = C.green }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}
                >
                  <Sparkles size={10} style={{ flexShrink: 0, opacity: 0.6 }} />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Agent conversation — fills remaining space */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <AgentChat ref={agentRef} compact />
        </div>
      </aside>
    </>
  )
}
