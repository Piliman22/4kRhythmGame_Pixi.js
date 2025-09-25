import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  publicDir: 'assets',
  server: {
    port: 5174,
    open: true
  },
  build: {
    outDir: 'dist',
    target: 'es2015',
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  }
})
