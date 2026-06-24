import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'mineros-design-system-copy-styles',
      closeBundle() {
        const source = resolve(__dirname, 'dist/style.css');
        const target = resolve(__dirname, 'dist/styles.css');

        if (existsSync(source) && !existsSync(target)) {
          copyFileSync(source, target);
        }
      },
    },
  ],
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MinerosDesignSystem',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs')
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        assetFileNames: (assetInfo) => (assetInfo.name?.endsWith('.css') ? 'styles.css' : '[name][extname]'),
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  }
});
