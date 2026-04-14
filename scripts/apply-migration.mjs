/**
 * Supabase Postgres에 supabase/migrations/*.sql 을 파일명 순서로 적용합니다.
 * 사용: DATABASE_URL=... npm run db:apply
 *
 * DATABASE_URL 은 Supabase 대시보드 → Project Settings → Database
 * → Connection string → URI (비밀번호로 [YOUR-PASSWORD] 치환) 를 복사합니다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')

function loadDatabaseUrlFromEnvLocal() {
  if (process.env.DATABASE_URL) return
  const p = path.join(__dirname, '..', '.env.local')
  let text
  try {
    text = fs.readFileSync(p, 'utf8')
  } catch {
    return
  }
  const m = text.match(/^\s*DATABASE_URL\s*=\s*([^\r\n#]+)/m)
  if (!m) return
  process.env.DATABASE_URL = m[1].trim().replace(/^["']|["']$/g, '')
}

loadDatabaseUrlFromEnvLocal()

const url = process.env.DATABASE_URL?.trim()
if (!url) {
  console.error(
    'DATABASE_URL 이 없습니다.\n' +
      'Supabase → Project Settings → Database → Connection string → URI 를 복사한 뒤\n' +
      '[YOUR-PASSWORD] 를 DB 비밀번호로 바꾸고, 한 줄로 실행하세요:\n' +
      '  set DATABASE_URL=postgresql://...\n' +
      '  npm run db:apply\n' +
      '(PowerShell: $env:DATABASE_URL="postgresql://..." ; npm run db:apply)',
  )
  process.exit(1)
}

const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()
if (!files.length) {
  console.error('마이그레이션 SQL 파일이 없습니다:', migrationsDir)
  process.exit(1)
}

const useSsl = !/localhost|127\.0\.0\.1/.test(url)
const client = new pg.Client({
  connectionString: url,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
})

try {
  await client.connect()
  for (const f of files) {
    const sqlPath = path.join(migrationsDir, f)
    const sql = fs.readFileSync(sqlPath, 'utf8')
    await client.query(sql)
    console.log('적용 완료:', sqlPath)
  }
} catch (err) {
  console.error(err.message || err)
  process.exit(1)
} finally {
  await client.end().catch(() => {})
}
