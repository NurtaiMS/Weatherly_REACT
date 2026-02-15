import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Weatherly_REACT/',
  css: {
    postcss: false
  },
  server: {
    fs: {
      allow: ['..']
    }
  }
})