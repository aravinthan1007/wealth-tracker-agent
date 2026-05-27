const { computeNetWorth } = require('../../src/tools/computeNetWorth.cjs')

test('compute net worth simple', ()=>{
  const assets = [{value:100},{value:50}]
  const liabilities = [{balance:20}]
  expect(computeNetWorth(assets, liabilities)).toBe(130)
})
