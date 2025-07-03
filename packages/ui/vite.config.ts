import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import { readFileSync, writeFileSync } from 'fs';

const generateTemplate = () => {
  return {
    name: 'generate-template',
    closeBundle: async () => {
      const template = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vue Component Dependencies</title>
  <link rel="stylesheet" href="./visualizer/style.css">
  <style>
    html, body, #root {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    window.__GRAPH_DATA__ = null; // Will be replaced with actual data
  </script>
  <script src="./visualizer/visualizer.iife.js"></script>
</body>
</html>
`;
      writeFileSync(resolve(__dirname, 'dist/template.html'), template);
    },
  };
};

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src/**/*'],
      exclude: ['**/*.test.ts', '**/*.test.tsx'],
      skipDiagnostics: true,
    }),
    generateTemplate(),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'VoyagerUI',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'reactflow', '@voyager/core'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          reactflow: 'ReactFlow',
          '@voyager/core': 'VoyagerCore',
        },
      },
    },
  },
  resolve: {
    alias: {
      '@voyager/core': resolve(__dirname, '../core/src'),
    },
  },
});
