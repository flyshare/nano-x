import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env from project root
// In development (src), __dirname is src, so ../.env is root.
// In production (dist), __dirname is dist, so ../.env is root.
dotenv.config({ path: path.join(__dirname, '../.env') })
