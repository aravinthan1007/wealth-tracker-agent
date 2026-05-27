import React from 'react'

export default function AgentStatusPanel(){
  return (
    <div style={{padding:10, border:'1px solid #eee', borderRadius:6}}>
      <strong>Agents:</strong>
      <ul>
        <li>StocksAgent — idle</li>
        <li>MortgageAgent — idle</li>
        <li>LoanAgent — idle</li>
        <li>SavingsAgent — idle</li>
        <li>NetWorthAgent — idle</li>
      </ul>
    </div>
  )
}
