import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'))
// version of the shared kernel this app embeds (packages/core) — shown in
// the About/version displays so bug reports can name the platform too
const corePkg = JSON.parse(readFileSync('../../packages/core/package.json', 'utf8'))
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
    __APP_ID__: JSON.stringify('dimcrochet'),
    __APP_VERSION__: JSON.stringify(pkg.version),
    __GIT_COMMIT__: JSON.stringify(gitHash),
    __CORE_VERSION__: JSON.stringify(corePkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'DimCrochet — Crochet Chart Composer',
        short_name: 'DimCrochet',
        description:
          'Draw granny squares, doilies, lace motifs and circular crochet charts. Place stitches evenly along circles, arcs, spirals and repeats — export SVG, PNG and PDF.',
        theme_color: '#221f26',
        background_color: '#faf8f4',
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
