import { calculateLoanBalance } from '../tools/calculateLoanBalance'

export async function runMortgageAgent(){
  const res = await fetch('/data/mockMortgage.json')
  const mortgages = await res.json()
  const results = []
  for(const m of mortgages){
    const principal = m.balance || 0
    const rate = m.rate || 0.04
    const years = m.termYears || 30
    const { payment, balance } = calculateLoanBalance(principal, rate, years, 0)
    results.push({ id: m.id, monthlyPayment: payment, balance, rate, years })
  }
  return results
}

export default runMortgageAgent
