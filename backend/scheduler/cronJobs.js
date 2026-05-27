// Minimal scheduler: triggers daily pipeline and demo interval
const fetch = require('node-fetch')

function scheduleJobs(){
  // Trigger daily run at startup and then every 24h
  const runDaily = async ()=>{
    try{
      await fetch('http://localhost:3000/api/agents/run/daily')
    }catch(e){ console.log('Daily run failed', e.message) }
  }
  // Run once immediately
  runDaily()
  // Schedule every 24 hours
  setInterval(runDaily, 24 * 60 * 60 * 1000)
  console.log('Scheduler: daily job scheduled')
}

module.exports = { scheduleJobs }
