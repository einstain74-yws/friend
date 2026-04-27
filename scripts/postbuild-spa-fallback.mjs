/**
 * GitHub Pages: 직접 URL·새로고침 시 SPA가 아닌 404 HTML이 뜨는 문제 방지.
 * index.html을 404.html로 복사하면 Pages가 같은 앱을 내려줍니다. (Vercel은 vercel.json rewrite 사용)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const index = path.join(dist, 'index.html')
const dest = path.join(dist, '404.html')

if (!fs.existsSync(index)) {
  console.warn('postbuild-spa-fallback: dist/index.html 없음 — 건너뜀')
  process.exit(0)
}
fs.copyFileSync(index, dest)
console.log('postbuild: dist/404.html ← index.html (GitHub Pages SPA)')
