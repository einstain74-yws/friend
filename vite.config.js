import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages: https://<user>.github.io/<repo>/
// 로컬 개발(vite / vite dev)은 '/' , 프로덕션 빌드만 저장소 경로 사용
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/friend/' : '/',
}))
