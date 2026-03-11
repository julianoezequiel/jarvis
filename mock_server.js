const express = require('express')
const app = express()
app.use(express.json())

app.post('/api/agent-execute', (req, res) => {
  console.log('[mock] received agent-execute', req.body)
  res.json({ agent: req.body.agent || 'mock', status: 'completed', result: 'mocked execution' })
})

app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`[mock] server listening on ${PORT}`))
