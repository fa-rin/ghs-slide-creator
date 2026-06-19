import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

function emitHymnDatabaseAsset(): Plugin {
  return {
    name: 'emit-hymn-database-asset',
    apply: 'build',
    generateBundle() {
      const hymnDatabasePath = resolve(process.cwd(), 'src/data/hymns.json');
      const source = readFileSync(hymnDatabasePath, 'utf-8');

      this.emitFile({
        type: 'asset',
        fileName: 'hymns.json',
        source,
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    emitHymnDatabaseAsset(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['/public/icons/pwa-192x192.svg', '/public/icons/pwa-512x512.svg', ],
      workbox: {
        globPatterns: ['**/*.{html,js,css,json,svg}'],
      },
      manifest: {
        name: 'GHS Slide Generator',
        short_name: 'GHS Slides',
        description: 'Offline-First Presentation Generator for Gospel Hymns & Songs',
        theme_color: '#0A0F1E',
        background_color: '#0A0F1E',
        display: 'standalone',
        icons: [
          {
            src: '/public/icons/pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: '/public/icons/pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
        ],
      },
    }),
  ],
});
