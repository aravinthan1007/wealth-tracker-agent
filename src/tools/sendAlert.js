export async function sendAlert(message, level='info'){
  try{
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, level })
    })
  }catch(e){
    console.warn('Failed to send alert', e)
  }
}

export default sendAlert
