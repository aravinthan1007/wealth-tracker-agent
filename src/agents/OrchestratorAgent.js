// Frontend Orchestrator — calls backend REST APIs only (no Node-only imports)
export async function runOrchestrator(){
  const [nwRes, stocks, mortgages, loans, savings] = await Promise.all([
    fetch('/api/agents/networth').then(r=>r.json()).catch(()=>({})),
    fetch('/data/mockStocks.json').then(r=>r.json()).catch(()=>[]),
    fetch('/data/mockMortgage.json').then(r=>r.json()).catch(()=>[]),
    fetch('/data/mockLoans.json').then(r=>r.json()).catch(()=>[]),
    fetch('/data/mockSavings.json').then(r=>r.json()).catch(()=>[])
  ])
  return {
    netWorth: nwRes.netWorth ?? null,
    totalAssets: nwRes.totalAssets ?? null,
    totalLiabilities: nwRes.totalLiabilities ?? null,
    stocks, mortgages, loans, savings
  }
}

export default runOrchestrator
