// Run with: node scripts/init-db.js
// This re-initializes the database (useful for reset)

const path = require('path')
const fs = require('fs')

const DB_PATH = process.env.DATABASE_PATH || './data/agents.db'
const resolvedPath = path.resolve(process.cwd(), DB_PATH)

// Delete existing DB to reset
if (fs.existsSync(resolvedPath)) {
  fs.unlinkSync(resolvedPath)
  console.log('🗑️  Removed existing database')
}

const dir = path.dirname(resolvedPath)
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true })
}

console.log('✅ Database will be initialized on first server start')
console.log(`📍 Path: ${resolvedPath}`)
