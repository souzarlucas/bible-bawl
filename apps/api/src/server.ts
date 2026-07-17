import 'dotenv/config'
import { createApp } from './app.js'
import { databaseFile } from './database.js'

const port = Number(process.env.PORT || 3001)
createApp().listen(port, () => {
  console.log(`Bible Bawl API disponível em http://localhost:${port}`)
  console.log(`Banco local: ${databaseFile}`)
})
