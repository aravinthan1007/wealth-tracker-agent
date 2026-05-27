export async function getMockStocks(){
  const res = await fetch('/data/mockStocks.json')
  return res.json()
}

export default { getMockStocks }
