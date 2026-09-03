import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {cpSync} from 'node:fs';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), {
      name: 'vector-site',
      closeBundle() {
        cpSync('site', 'dist', {recursive: true});
      },
    }],
    base: process.env.GITHUB_ACTIONS ? '/ATC-Study-app/' : '/',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
