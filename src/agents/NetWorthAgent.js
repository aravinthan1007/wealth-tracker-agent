import { computeNetWorth } from '../tools/computeNetWorth'

export async function runNetWorthAgent(){
  // Basic implementation: read mock data endpoint and compute
  const [stocksRes, mortgagesRes, loansRes, savingsRes] = await Promise.all([
    fetch('/data/mockStocks.json').then(r=>r.json()).catch(()=>[]),
    fetch('/data/mockMortgage.json').then(r=>r.json()).catch(()=>[]),
    fetch('/data/mockLoans.json').then(r=>r.json()).catch(()=>[]),
    fetch('/data/mockSavings.json').then(r=>r.json()).catch(()=>[]),
  ])

  const assets = []
  // stocks as assets
  for(const s of stocksRes){ assets.push({type:'stock', value: s.price * (s.shares||1)}) }
  // savings
  for(const s of savingsRes){ assets.push({type:'savings', value: s.balance || 0}) }

  const liabilities = []
  for(const m of mortgagesRes){ liabilities.push({type:'mortgage', balance: m.balance || 0}) }
  for(const l of loansRes){ liabilities.push({type:'loan', balance: l.balance || 0}) }

  const netWorth = computeNetWorth(assets, liabilities)
  return { netWorth, assets, liabilities }
}

export default runNetWorthAgent
