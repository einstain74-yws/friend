import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// 기본 base는 '/' — 로컬 dev·preview·루트에 올린 배포에서 빈 화면(에셋 404)을 막습니다.
// GitHub Pages (https://<user>.github.io/<repo>/) 는 빌드 시 .env.production 에
// VITE_BASE_PATH=/friend/ 처럼 저장소 경로를 넣으세요.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  let base = env.VITE_BASE_PATH || '/'
  if (base !== '/' && !base.endsWith('/')) base = `${base}/`

  return {
    plugins: [react()],
    base,
  }
})
