export async function runSavingsAgent(){
  const res = await fetch('/data/mockSavings.json')
  const savings = await res.json()
  const results = savings.map(s=>({ id: s.id, balance: s.balance || 0, rate: s.rate || 0.01 }))
  return results
}

export default runSavingsAgent
