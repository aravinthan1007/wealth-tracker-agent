export async function notifyBackend(message, level='info'){
  try{
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, level })
    })
  }catch(e){
    console.warn('notifyBackend failed', e)
  }
}

export default { notifyBackend }
