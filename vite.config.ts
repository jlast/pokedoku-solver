import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        custom: './custom/index.html',
        today: './today/index.html',
        pokemonList: './pokemon-list/index.html',
        tips: './tips/index.html',
        puzzleStats: './puzzle-stats/index.html',
      },
    },
  },
})
