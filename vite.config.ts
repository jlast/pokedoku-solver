import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/pokedoku-solver/',
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        today: './today/index.html',
      },
    },
  },
})
