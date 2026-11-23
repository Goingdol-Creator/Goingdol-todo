import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // GitHub Pages(저장소 이름 하위 경로)에서도 동작하도록 상대 경로 사용
  plugins: [react()],
})
