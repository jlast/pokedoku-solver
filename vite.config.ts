import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        custom: './custom/index.html',
        today: './today/index.html',
        pokemonList: './pokemon-list/index.html',
        tips: './tips/index.html',
      },
    },
  },
})
