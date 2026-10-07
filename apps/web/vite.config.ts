import path from 'node:path';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

/**
 * CSS only reveals the fonts once a screen renders, a step after the scripts.
 * Preloading the two Latin files lets them download alongside the entry chunk.
 */
function preloadLatinFonts(): Plugin {
  return {
    name: 'nutrisnap:preload-latin-fonts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        return Object.keys(ctx.bundle ?? {})
          .filter((file) => /-latin-wght-normal-[\w-]+\.woff2$/.test(file))
          .map((file) => ({
            tag: 'link',
            attrs: {
              rel: 'preload',
              href: `/${file}`,
              as: 'font',
              type: 'font/woff2',
              crossorigin: '',
            },
            injectTo: 'head' as const,
          }));
      },
    },
  };
}

export default defineConfig({
  plugins: [
    preloadLatinFonts(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      emitTsDeclarations: false,
      strategy: ['localStorage', 'preferredLanguage', 'baseLocale'],
    }),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'NutriSnap',
        short_name: 'NutriSnap',
        description: 'Snap your meal, see the calories. Free.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#12100e',
        theme_color: '#12100e',
        categories: ['health', 'fitness', 'food'],
        icons: [
          { src: '/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: [
          '**/*.{js,css,html,png,ico,svg,webmanifest}',
          '**/*latin-wght-normal*.woff2',
        ],
        // The 370 KB source image only feeds the icon generator and a test.
        globIgnores: ['**/icon-source.png'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: { port: 5173 },
});
