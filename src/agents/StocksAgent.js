// Frontend StocksAgent — calls backend proxy, falls back to mock data
export async function runStocksAgent(symbol){
  try{
    const res = await fetch(`/api/agents/stocks?symbol=${encodeURIComponent(symbol)}`)
    if(res.ok) return res.json()
  }catch(e){}
  try{
    const data = await fetch('/data/mockStocks.json').then(r=>r.json())
    return data.find(s=>s.symbol===symbol) || null
  }catch(e){
    return null
  }
}

export async function runAllStocks(){
  try{
    return await fetch('/data/mockStocks.json').then(r=>r.json())
  }catch(e){ return [] }
}

export default runStocksAgent
