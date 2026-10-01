import pg from 'pg'
import { readFile } from 'node:fs/promises'

const connection = new URL(process.env.POSTGRES_URL)
for (const key of ['sslmode','sslcert','sslkey','sslrootcert']) connection.searchParams.delete(key)
const client = new pg.Client({ connectionString: connection.toString(), ssl: { rejectUnauthorized: false } })
try {
  await client.connect()
  await client.query('begin')
  await client.query(await readFile(new URL('../supabase/migrations/003_events_and_ai_budget.sql', import.meta.url), 'utf8'))
  await client.query('commit')
  const result = await client.query("select tablename, rowsecurity from pg_tables where schemaname='public' and tablename in ('learning_events','learning_budgets')")
  console.log(JSON.stringify(result.rows))
} catch (error) {
  await client.query('rollback').catch(() => {})
  console.error('Migration failed:', error.code || error.name)
  process.exitCode = 1
} finally { await client.end() }
