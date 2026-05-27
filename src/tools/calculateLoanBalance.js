// Simple amortization helper
export function calculateLoanBalance(principal, annualRate, years, paymentsMade=0, paymentsPerYear=12){
  const r = annualRate / paymentsPerYear
  const n = years * paymentsPerYear
  if(r === 0){
    const payment = principal / n
    const balance = Math.max(0, principal - payment * paymentsMade)
    return { payment, balance }
  }
  const payment = principal * (r / (1 - Math.pow(1 + r, -n)))
  // remaining balance after k payments
  const k = paymentsMade
  const balance = principal * Math.pow(1 + r, k) - payment * ( (Math.pow(1 + r, k) - 1) / r )
  return { payment, balance: Math.max(0, balance) }
}

export default calculateLoanBalance
