import 'dotenv/config'
import { initializeDatabase, databaseFile } from './database.js'
initializeDatabase()
console.log(`Dados iniciais conferidos em: ${databaseFile}`)
