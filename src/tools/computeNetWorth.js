export function computeNetWorth(assets = [], liabilities = []){
  const totalAssets = assets.reduce((s,a)=>s + (a.value || 0), 0)
  const totalLiabilities = liabilities.reduce((s,l)=>s + (l.balance || 0), 0)
  return totalAssets - totalLiabilities
}

export default computeNetWorth
