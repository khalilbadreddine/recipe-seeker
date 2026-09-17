import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        // Split the large recipe/blog dataset out of the main entry chunk so the
        // initial JS stays under Vite's 500 kB warning threshold. Loaded in
        // parallel with the entry; SSR/prerender unaffected.
        manualChunks(id) {
          if (id.includes(`${'/'}data${'/'}recipes.json`)) return 'recipe-data'
        },
      },
    },
  },
  server: {
    // Dev only: forwards newsletter signup + any other /api calls to the Express API
    // (built by the sibling server agent; expected on :3001).
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
