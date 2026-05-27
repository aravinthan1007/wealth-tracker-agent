// Minimal notification service. Replace with email/SMS integrations.
function sendNotification({ message, level='info' }){
  const when = new Date().toISOString()
  console.log(`[Notification][${level}] ${when} - ${message}`)
}

module.exports = { sendNotification }
