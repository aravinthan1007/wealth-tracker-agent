import React, { useState, useEffect, useRef } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, Trash2, DollarSign } from 'lucide-react'
import { C, mono, fmt, PageHeader, Card, Btn, Badge, Spinner } from '../components/ui'

export default function Statements() {
  const [files, setFiles] = useState([])
  const [result, setResult] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef()

  async function loadFiles() {
    try {
      const res = await fetch('/api/upload/statements')
      setFiles(await res.json())
    } catch {}
  }

  useEffect(() => { loadFiles() }, [])

  async function uploadFile(file) {
    if (!file || file.type !== 'application/pdf') {
      setError('Please upload a PDF file'); return
    }
    setUploading(true); setError(null); setResult(null)
    const fd = new FormData()
    fd.append('statement', file)
    try {
      const res = await fetch('/api/upload/statement', { method:'POST', body: fd })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
      loadFiles()
    } catch(e) {
      setError(e.message)
    }
    setUploading(false)
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  return (
    <div>
      <PageHeader
        title="Credit Statement Upload"
        subtitle="Upload PDF credit card statements to auto-extract transactions and balances"
      />
      <div style={{ padding:'20px 28px', display:'flex', flexDirection:'column', gap:16 }}>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? C.green : C.border2}`, borderRadius:16,
            padding:'48px 32px', textAlign:'center', cursor:'pointer',
            background: dragOver ? C.greenBg : C.card,
            transition:'all 0.2s'
          }}
        >
          <input ref={inputRef} type="file" accept="application/pdf" style={{ display:'none' }} onChange={e => uploadFile(e.target.files[0])} />
          <Upload size={36} color={dragOver ? C.green : C.subtle} style={{ marginBottom:16 }} />
          <div style={{ fontSize:16, fontWeight:600, marginBottom:8 }}>
            {uploading ? 'Uploading & Parsing…' : 'Drop PDF statement here or click to browse'}
          </div>
          <div style={{ fontSize:13, color:C.subtle }}>Supports all major bank PDF statements · Max 10MB</div>
          {!uploading && <Btn style={{ marginTop:16 }} onClick={e => { e.stopPropagation(); inputRef.current?.click() }}><Upload size={13} />Select PDF</Btn>}
          {uploading && <div style={{ marginTop:16 }}><Spinner /></div>}
        </div>

        {error && (
          <div style={{ display:'flex', gap:8, padding:'12px 16px', background:C.redBg, borderRadius:10, color:C.red, fontSize:13 }}>
            <AlertCircle size={15} style={{ flexShrink:0 }} />{error}
          </div>
        )}

        {/* Parse result */}
        {result && (
          <Card style={{ padding:0, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:8 }}>
              <CheckCircle size={15} color={C.green} />
              <span style={{ fontWeight:600, fontSize:14 }}>Parsed: {result.filename}</span>
              <Badge color="green">{result.pages} pages</Badge>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:0 }}>
              {[
                { label:'Statement Balance', value: result.parsed?.totalBalance != null ? fmt.format(result.parsed.totalBalance) : 'Not detected' },
                { label:'Minimum Payment', value: result.parsed?.minPayment != null ? fmt.format(result.parsed.minPayment) : 'Not detected' },
                { label:'Payment Due', value: result.parsed?.dueDate || 'Not detected' },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding:'16px 18px', borderRight:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:11, color:C.subtle, marginBottom:6 }}>{label}</div>
                  <div style={{ fontSize:18, fontWeight:700, ...mono }}>{value}</div>
                </div>
              ))}
            </div>

            {result.parsed?.transactions?.length > 0 && (
              <div>
                <div style={{ padding:'12px 18px', borderTop:`1px solid ${C.border}`, fontWeight:600, fontSize:14, display:'flex', alignItems:'center', gap:8 }}>
                  <DollarSign size={14} color={C.blue} />
                  Extracted Transactions ({result.parsed.transactionCount})
                </div>
                <div style={{ maxHeight:340, overflow:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>
                      {['Date','Description','Amount'].map(h=>(
                        <th key={h} style={{ padding:'8px 16px', textAlign:'left', fontSize:11, color:C.subtle, fontWeight:500 }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {result.parsed.transactions.map((tx, i) => (
                        <tr key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
                          <td style={{ padding:'8px 16px', fontSize:12, color:C.muted, ...mono }}>{tx.date}</td>
                          <td style={{ padding:'8px 16px', fontSize:13 }}>{tx.description}</td>
                          <td style={{ padding:'8px 16px', fontSize:13, fontWeight:600, ...mono, color:C.red }}>{fmt.format(tx.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Previously uploaded files */}
        {files.length > 0 && (
          <Card style={{ padding:0, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}`, fontWeight:600, fontSize:14 }}>
              Previously Uploaded ({files.length})
            </div>
            {files.map(f => (
              <div key={f.filename} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 18px', borderBottom:`1px solid ${C.border}` }}>
                <FileText size={16} color={C.blue} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>{f.filename}</div>
                  <div style={{ fontSize:11, color:C.subtle }}>{(f.size/1024).toFixed(1)} KB · {new Date(f.uploaded).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </Card>
        )}

        {/* Tips */}
        <Card style={{ padding:'18px 20px', background:C.blueBg, border:`1px solid rgba(14,165,233,0.2)` }}>
          <div style={{ fontWeight:600, fontSize:13, color:C.blue, marginBottom:10 }}>Tips for best results</div>
          <ul style={{ margin:0, padding:'0 0 0 16px', fontSize:12, color:C.muted, lineHeight:1.8 }}>
            <li>Use the original PDF downloaded from your bank (not scanned images)</li>
            <li>Statements with text-based PDFs parse best — scanned PDFs extract text only</li>
            <li>Chase, Citi, Amex, BofA, Wells Fargo formats are well-supported</li>
            <li>After parsing, you can manually add transactions to your Expenses tracker</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
