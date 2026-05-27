export async function fetchStockPrice(symbol){
  try{
    const res = await fetch('/data/mockStocks.json')
    const stocks = await res.json()
    const item = stocks.find(s=>s.symbol===symbol)
    return item ? item.price : null
  }catch(e){
    return null
  }
}

export default fetchStockPrice
