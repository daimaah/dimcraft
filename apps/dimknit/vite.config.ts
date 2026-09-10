import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'))
// short commit hash for the About/version display; empty when .git is not
// part of the build context (e.g. container builds) — inject GIT_HASH instead
let gitHash = ''
try {
  gitHash = execSync('git rev-parse --short HEAD').toString().trim()
} catch {
  gitHash = process.env.GIT_HASH ?? ''
}

export default defineConfig({
  resolve: {
    alias: {
      '@dimcraft/core': fileURLToPath(new URL('../../packages/core/src/', import.meta.url)),
    },
  },
  define: {
    __APP_ID__: JSON.stringify('dimknit'),
    __APP_VERSION__: JSON.stringify(pkg.version),
    __GIT_COMMIT__: JSON.stringify(gitHash),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'DimKnit — Knitting Chart Composer',
        short_name: 'DimKnit',
        description:
          'Draw knitting charts on a stitch grid — flat rows read serpentine with RS/WS-aware written instructions. Export SVG, PNG and PDF.',
        theme_color: '#1c2427',
        background_color: '#f4f6f5',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
      },
    }),
  ],
})
