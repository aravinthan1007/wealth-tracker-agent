import React, { useState, useRef, useEffect } from 'react'
import { Activity, Play, Download, CheckCircle, Circle, Loader, ChevronRight, AlertCircle } from 'lucide-react'

const STEPS = [
  { id: 1, key: 'inventory',   label: 'Inventory',     description: 'Discover services & architecture' },
  { id: 2, key: 'dql',         label: 'DQL Queries',   description: 'Generate monitoring queries' },
  { id: 3, key: 'monitors',    label: 'Monitors',       description: 'Configure RED metrics' },
  { id: 4, key: 'dashboards',  label: 'Dashboards',    description: 'Build service dashboards' },
  { id: 5, key: 'alerts',      label: 'Alerts',        description: 'Set alert thresholds' },
  { id: 6, key: 'handover',    label: 'Handover',      description: 'Generate handover document' },
]

const TYPE_COLORS = {
  thought:     { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)', label: '#818cf8' },
  action:      { bg: 'rgba(16,216,124,0.10)', border: 'rgba(16,216,124,0.3)', label: '#10d87c' },
  observation: { bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.3)', label: '#fbbf24' },
  answer:      { bg: 'rgba(16,216,124,0.15)', border: 'rgba(16,216,124,0.5)', label: '#10d87c' },
  error:       { bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.3)',  label: '#f87171' },
}

function StepIcon({ step, currentStep, completedSteps }) {
  const done = completedSteps.has(step.key)
  const active = !done && currentStep === step.key
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      background: done ? 'linear-gradient(135deg, #10d87c, #0ea86a)' : active ? 'rgba(16,216,124,0.15)' : 'rgba(26,37,64,0.8)',
      border: done ? 'none' : active ? '2px solid #10d87c' : '2px solid #1a2540',
      boxShadow: done ? '0 0 12px rgba(16,216,124,0.35)' : active ? '0 0 8px rgba(16,216,124,0.2)' : 'none',
    }}>
      {done ? <CheckCircle size={18} color="#03180d" /> :
       active ? <Loader size={16} color="#10d87c" style={{ animation: 'spin 1s linear infinite' }} /> :
       <span style={{ fontSize: 13, fontWeight: 700, color: '#546080' }}>{step.id}</span>}
    </div>
  )
}

function ReasoningEntry({ entry }) {
  const c = TYPE_COLORS[entry.type] || TYPE_COLORS.thought
  const labels = { thought: 'Thought', action: 'Action', observation: 'Observation', answer: 'Answer', error: 'Error' }
  return (
    <div style={{ borderRadius: 10, padding: '10px 14px', marginBottom: 8, background: c.bg, border: `1px solid ${c.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
          color: c.label, textTransform: 'uppercase',
          background: `${c.label}20`, padding: '2px 8px', borderRadius: 20,
        }}>{labels[entry.type] || entry.type}</span>
        {entry.step && <span style={{ fontSize: 10, color: '#546080' }}>step {entry.step}</span>}
        {entry.tool && <span style={{ fontSize: 10, color: '#10d87c', fontFamily: 'monospace' }}>{entry.tool}</span>}
      </div>
      <pre style={{
        margin: 0, fontSize: 12, lineHeight: 1.6, color: '#c0cce0',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        fontFamily: entry.type === 'observation' ? 'monospace' : 'inherit',
        maxHeight: entry.type === 'observation' ? 300 : 'none', overflowY: 'auto',
      }}>
        {entry.type === 'action' ? `${entry.tool || ''}(${entry.args || ''})` : entry.content}
      </pre>
    </div>
  )
}

export default function OnboardingAgent() {
  const [running, setRunning]           = useState(false)
  const [entries, setEntries]           = useState([])
  const [currentStep, setCurrentStep]   = useState(null)
  const [completedSteps, setCompleted]  = useState(new Set())
  const [answer, setAnswer]             = useState(null)
  const [error, setError]               = useState(null)
  const [sessionId, setSessionId]       = useState(null)
  const [handoverData, setHandoverData] = useState(null)
  const streamRef = useRef(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [entries])

  // Map tool calls to steps
  const TOOL_STEP_MAP = {
    read_kb_article: 'inventory', analyze_app_structure: 'inventory',
    generate_dynatrace_config: null, // determined by args
    call_dynatrace_mcp: 'monitors',
    log_onboarding_step: null,
    generate_handover_doc: 'handover',
  }

  function resolveStep(tool, args) {
    if (tool === 'generate_dynatrace_config') {
      if (!args) return 'monitors'
      if (args.includes('dql')) return 'dql'
      if (args.includes('dashboard')) return 'dashboards'
      if (args.includes('alert')) return 'alerts'
      return 'monitors'
    }
    return TOOL_STEP_MAP[tool] || null
  }

  function startOnboarding() {
    if (running) return
    setRunning(true)
    setEntries([])
    setAnswer(null)
    setError(null)
    setCompleted(new Set())
    setCurrentStep('inventory')
    setHandoverData(null)

    const evtSource = new EventSource(`/api/onboarding/stream?q=${encodeURIComponent('Onboard WealthTrack Agent into Dynatrace monitoring with full configuration')}`)
    streamRef.current = evtSource

    evtSource.onmessage = (evt) => {
      let data
      try { data = JSON.parse(evt.data) } catch { return }

      switch (data.type) {
        case 'start':
          setSessionId(data.sessionId)
          break

        case 'thought':
          setEntries(e => [...e, { type: 'thought', content: data.content, step: data.step }])
          break

        case 'action': {
          const step = resolveStep(data.tool, data.args)
          if (step) setCurrentStep(step)
          setEntries(e => [...e, { type: 'action', tool: data.tool, args: data.args, content: '', step: data.step }])
          break
        }

        case 'observation': {
          // Mark completed steps based on last tool action
          const last = entries.findLast?.(e => e.type === 'action')
          if (last) {
            const s = resolveStep(last.tool, last.args)
            if (s) setCompleted(prev => new Set([...prev, s]))
          }
          // Extract handover doc if present
          try {
            const obs = JSON.parse(data.content)
            if (obs?.document?.title?.includes('Handover')) setHandoverData(obs.document)
          } catch { /* not JSON */ }
          setEntries(e => [...e, { type: 'observation', content: data.content, step: data.step }])
          break
        }

        case 'answer':
          setAnswer(data.content)
          setCompleted(new Set(STEPS.map(s => s.key)))
          setCurrentStep(null)
          setRunning(false)
          evtSource.close()
          break

        case 'error':
          setError(data.message)
          setRunning(false)
          evtSource.close()
          break

        case 'done':
          setRunning(false)
          evtSource.close()
          break

        default: break
      }
    }

    evtSource.onerror = () => {
      setError('Connection lost. Please try again.')
      setRunning(false)
      evtSource.close()
    }
  }

  function stop() {
    if (streamRef.current) { streamRef.current.close(); streamRef.current = null }
    setRunning(false)
  }

  function downloadJSON(data, filename) {
    const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click()
  }

  function downloadMarkdown(data) {
    const md = [
      `# ${data.title}`,
      `**Generated:** ${data.generatedAt}`,
      `**Generated By:** ${data.generatedBy}`,
      '',
      `## Summary`,
      data.sections.summary,
      '',
      `## Services Onboarded`,
      ...data.sections.servicesOnboarded.map(s => `- ${s}`),
      '',
      `## Monitoring Configured`,
      ...data.sections.monitoringConfigured.map(s => `- ${s}`),
      '',
      `## SLOs`,
      ...data.sections.slos.map(s => `- **${s.name}**: ${s.target} (${s.metric})`),
      '',
      `## Next Steps`,
      ...data.sections.nextSteps.map((s, i) => `${i + 1}. ${s}`),
      '',
      `## Metadata`,
      `- DT Environment: ${data.metadata.dtEnvironment}`,
      `- Onboarding Duration: ${data.metadata.onboardingDuration}`,
      `- Compared to Manual: ${data.metadata.comparedToManual}`,
    ].join('\n')
    const blob = new Blob([md], { type: 'text/markdown' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'handover.md'; a.click()
  }

  return (
    <div style={{ padding: '28px 32px', minHeight: '100vh', background: '#060b17' }}>
      {/* CSS for spin animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #0055ff 0%, #0099ff 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(0,85,255,0.35)',
            }}>
              <Activity size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#e8edf5', letterSpacing: '-0.03em' }}>
                Dynatrace Onboarding Agent
              </h1>
              <div style={{ fontSize: 12, color: '#546080', marginTop: 2 }}>
                Automated monitoring setup · dynatrace-for-ai skills · WealthTrack Agent
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {handoverData && (
            <button onClick={() => downloadMarkdown(handoverData)} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px',
              background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)',
              borderRadius: 10, color: '#818cf8', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}>
              <Download size={15} /> handover.md
            </button>
          )}
          <button
            onClick={running ? stop : startOnboarding}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px',
              background: running ? 'rgba(239,68,68,0.15)' : 'linear-gradient(135deg, #10d87c 0%, #0ea86a 100%)',
              border: running ? '1px solid rgba(239,68,68,0.4)' : 'none',
              borderRadius: 10, color: running ? '#f87171' : '#03180d', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              boxShadow: running ? 'none' : '0 0 20px rgba(16,216,124,0.35)',
            }}
          >
            {running
              ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Stop</>
              : <><Play size={16} /> {answer ? 'Re-run Onboarding' : 'Start Onboarding'}</>}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        {/* Left: Step stepper */}
        <div style={{
          background: 'linear-gradient(135deg, #080e1d 0%, #060b17 100%)',
          border: '1px solid #1a2540', borderRadius: 16, padding: 20,
          height: 'fit-content', position: 'sticky', top: 20,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#546080', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
            Onboarding Steps
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {STEPS.map((step, i) => {
              const done   = completedSteps.has(step.key)
              const active = !done && currentStep === step.key
              return (
                <div key={step.key} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <StepIcon step={step} currentStep={currentStep} completedSteps={completedSteps} />
                    {i < STEPS.length - 1 && (
                      <div style={{
                        width: 2, height: 28, background: done ? '#10d87c' : '#1a2540',
                        margin: '4px 0', transition: 'background 0.5s',
                      }} />
                    )}
                  </div>
                  <div style={{ paddingTop: 8, paddingBottom: i < STEPS.length - 1 ? 0 : 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: done ? '#10d87c' : active ? '#e8edf5' : '#546080' }}>
                      {step.label}
                    </div>
                    <div style={{ fontSize: 11, color: '#546080', marginTop: 2, marginBottom: 10 }}>
                      {step.description}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {sessionId && (
            <div style={{ marginTop: 16, padding: '10px 12px', background: 'rgba(16,216,124,0.06)', border: '1px solid rgba(16,216,124,0.15)', borderRadius: 10 }}>
              <div style={{ fontSize: 10, color: '#10d87c', fontWeight: 600, marginBottom: 4 }}>Session</div>
              <div style={{ fontSize: 10, color: '#546080', fontFamily: 'monospace', wordBreak: 'break-all' }}>{sessionId}</div>
            </div>
          )}

          <div style={{ marginTop: 16, padding: '10px 12px', background: 'rgba(0,85,255,0.06)', border: '1px solid rgba(0,85,255,0.15)', borderRadius: 10 }}>
            <div style={{ fontSize: 10, color: '#818cf8', fontWeight: 600, marginBottom: 6 }}>Skills Loaded</div>
            {['dql-essentials', 'obs-services', 'obs-logs', 'obs-problems', 'app-dashboards'].map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                <CheckCircle size={10} color="#10d87c" />
                <span style={{ fontSize: 10, color: '#546080', fontFamily: 'monospace' }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Reasoning panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Empty state */}
          {entries.length === 0 && !answer && !error && (
            <div style={{
              background: 'linear-gradient(135deg, #080e1d 0%, #060b17 100%)',
              border: '1px solid #1a2540', borderRadius: 16, padding: 40,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              minHeight: 400, textAlign: 'center', gap: 16,
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: 20, border: '2px dashed #1a2540',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Activity size={32} color="#1a2540" />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#546080', marginBottom: 8 }}>
                  Ready to onboard WealthTrack into Dynatrace
                </div>
                <div style={{ fontSize: 13, color: '#3a4a66', maxWidth: 400 }}>
                  Click "Start Onboarding" — the agent will read the KB article, analyze your services, generate DQL queries, dashboards, and alert rules automatically.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
                {['dynatrace-for-ai skills', 'Live DT MCP calls', 'Auto-generated configs', 'Handover document'].map(tag => (
                  <div key={tag} style={{
                    padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8',
                  }}>{tag}</div>
                ))}
              </div>
            </div>
          )}

          {/* Reasoning stream */}
          {entries.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #080e1d 0%, #060b17 100%)',
              border: '1px solid #1a2540', borderRadius: 16, padding: 20,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#546080', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
                Agent Reasoning
              </div>
              <div ref={scrollRef} style={{ maxHeight: 600, overflowY: 'auto', paddingRight: 4 }}>
                {entries.map((entry, i) => <ReasoningEntry key={i} entry={entry} />)}
                {running && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    background: 'rgba(16,216,124,0.06)', border: '1px solid rgba(16,216,124,0.15)', borderRadius: 10,
                  }}>
                    <Loader size={14} color="#10d87c" style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 12, color: '#10d87c' }}>Agent is reasoning…</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Answer / Summary */}
          {answer && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(16,216,124,0.08) 0%, rgba(16,216,124,0.02) 100%)',
              border: '1px solid rgba(16,216,124,0.3)', borderRadius: 16, padding: 24,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <CheckCircle size={20} color="#10d87c" />
                <span style={{ fontSize: 15, fontWeight: 700, color: '#10d87c' }}>Onboarding Complete</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  {handoverData && (
                    <button onClick={() => downloadMarkdown(handoverData)} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                      background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                      borderRadius: 8, color: '#818cf8', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}>
                      <Download size={13} /> handover.md
                    </button>
                  )}
                </div>
              </div>
              <pre style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: '#c0cce0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {answer}
              </pre>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <AlertCircle size={20} color="#f87171" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f87171', marginBottom: 4 }}>Error</div>
                <div style={{ fontSize: 12, color: '#c0cce0' }}>{error}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
