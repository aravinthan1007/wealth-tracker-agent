export function summarizePortfolio(assets = [], liabilities = []){
  const totalAssets = assets.reduce((s,a)=>s + (a.value||0),0)
  const totalLiabilities = liabilities.reduce((s,l)=>s + (l.balance||0),0)
  const net = totalAssets - totalLiabilities
  return `Assets: ${totalAssets.toFixed(2)}, Liabilities: ${totalLiabilities.toFixed(2)}, Net Worth: ${net.toFixed(2)}`
}

export default summarizePortfolio
