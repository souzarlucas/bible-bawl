import 'dotenv/config'
import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { databaseFile, initializeDatabase } from './database.js'

initializeDatabase()
const backupDir = resolve(process.cwd(), '../../backups')
mkdirSync(backupDir, { recursive: true })
const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const destination = resolve(backupDir, `bible-bawl-${stamp}.db`)
copyFileSync(databaseFile, destination)
console.log(`Backup criado em: ${destination}`)
