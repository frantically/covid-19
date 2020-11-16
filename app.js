const express = require('express')
const app = express()
const port = 3001

app.use(express.static('./src/'))

app.listen(port, '0.0.0.0', () => {
  console.log(`Example app listening at http://localhost:${port}`)
})