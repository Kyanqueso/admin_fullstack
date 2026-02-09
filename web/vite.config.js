import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  root: 'src',        // your source files
  base: './',         // relative paths
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        login: path.resolve(__dirname, 'src/views/auth/index.html'), // login entry
      },
    },
  },
})
