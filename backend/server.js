const express = require('express')
const path = require('path')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

// serve static frontend and data files
app.use(express.static(path.join(__dirname, '..', 'public')))
app.use('/data', express.static(path.join(__dirname, '..', 'data')))

// agent API
app.use('/api/agents', require('./api/agentRoutes'))
app.use('/api/stocks', require('./api/stocksRoutes'))
app.use('/api/creditcards', require('./api/creditCardRoutes'))
app.use('/api/expenses', require('./api/expensesRoutes'))
app.use('/api/upload', require('./api/uploadRoutes'))
app.use('/api/google', require('./api/googleRoutes'))

const PORT = process.env.PORT || 3000
app.listen(PORT, '0.0.0.0', (err)=>{
  if(err){
    console.error('Failed to start server', err)
    process.exit(1)
  }
  console.log('Server listening on', PORT)
})

// start scheduler (non-blocking). For demo purposes uses setInterval.
try{
  const scheduler = require('./scheduler/cronJobs')
  scheduler.scheduleJobs()
}catch(e){
  console.log('Scheduler not started:', e.message)
}
