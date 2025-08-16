import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

// File path for the database
const file = 'api/db.json'

// Configure adapter
const adapter = new JSONFile(file)
const defaultData = { posts: [] }
const db = new Low(adapter, defaultData)

// Read data from JSON file, initializing if it doesn't exist
await db.read()

export default db
