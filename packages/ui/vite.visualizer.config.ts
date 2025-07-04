import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'generate-template',
      closeBundle: async () => {
        const js = readFileSync(resolve(__dirname, 'dist/visualizer/visualizer.iife.js'), 'utf-8');
        const css = readFileSync(resolve(__dirname, 'dist/visualizer/style.css'), 'utf-8');
        const reactFlowBase = readFileSync(
          resolve(__dirname, 'node_modules/@xyflow/react/dist/base.css'),
          'utf-8'
        );

        const template = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vue Component Dependencies</title>
  <style>
    /* === React Flow Base Styles === */
    ${reactFlowBase}
    
    /* === Tailwind CSS & Custom Styles === */
    ${css}
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    window.__GRAPH_DATA__ = null; // Will be replaced with actual data
  </script>
  <script>${js}</script>
</body>
</html>`;

        writeFileSync(resolve(__dirname, 'dist/template.html'), template);
      },
    },
  ],
  build: {
    outDir: 'dist/visualizer',
    lib: {
      entry: resolve(__dirname, 'src/app.tsx'),
      name: 'VoyagerVisualizer',
      formats: ['iife'],
      fileName: 'visualizer',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        assetFileNames: '[name][extname]',
      },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': JSON.stringify({ NODE_ENV: 'production' }),
    'global': 'window',
  },
  resolve: {
    alias: {
      '@voyager-vue/core': resolve(__dirname, '../core/src'),
    },
  },
});
