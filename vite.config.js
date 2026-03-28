import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    open: true,
    proxy: {
      '/platformer/room': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
});
