import { calculateLoanBalance } from '../tools/calculateLoanBalance'

export async function runLoanAgent(){
  const res = await fetch('/data/mockLoans.json')
  const loans = await res.json()
  const results = []
  for(const l of loans){
    const principal = l.balance || 0
    const rate = l.rate || 0.06
    const years = l.termYears || 2
    const { payment, balance } = calculateLoanBalance(principal, rate, years, 0)
    results.push({ id: l.id, monthlyPayment: payment, balance, rate, years })
  }
  return results
}

export default runLoanAgent
