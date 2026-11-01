import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';

const frontendRoot = __dirname;

/**
 * Production hosts serve `/class/<slug>/` from `class/index.html` with a
 * rewrite. Vite does not do that rewrite for static dev/preview, so this plugin
 * keeps the public route working locally and in `vite preview`.
 */
function publicBookingRoutes(): Plugin {
  const rewrite = (url: string | undefined): string | undefined => {
    if (!url) return url;
    const queryIndex = url.indexOf('?');
    const pathname = queryIndex === -1 ? url : url.slice(0, queryIndex);
    const query = queryIndex === -1 ? '' : url.slice(queryIndex);

    if (/^\/class\/(?!index\.html$)[^/]+\/?$/.test(pathname)) {
      return `/class/index.html${query}`;
    }
    if (pathname === '/booking/complete' || pathname === '/booking/complete/') {
      return `/booking/complete/index.html${query}`;
    }
    return url;
  };

  return {
    name: 'tuitease-public-booking-routes',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        req.url = rewrite(req.url);
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        req.url = rewrite(req.url);
        next();
      });
    },
  };
}

export default defineConfig({
  root: frontendRoot,
  plugins: [react(), publicBookingRoutes()],
  server: {
    host: '127.0.0.1',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
    allowedHosts: ["zw65sfbj-3000.uks1.devtunnels.ms"]
  },
  build: {
    rollupOptions: {
      input: {
        landing: resolve(frontendRoot, 'index.html'),
        signup: resolve(frontendRoot, 'signup/index.html'),
        signin: resolve(frontendRoot, 'signin/index.html'),
        onboarding: resolve(frontendRoot, 'onboarding/index.html'),
        dashboard: resolve(frontendRoot, 'dashboard/index.html'),
        messages: resolve(frontendRoot, 'messages/index.html'),
        settings: resolve(frontendRoot, 'settings/index.html'),
        createClass: resolve(frontendRoot, 'classes/new/index.html'),
        createClassBasics: resolve(frontendRoot, 'classes/new/basics/index.html'),
        createClassSchedule: resolve(frontendRoot, 'classes/new/schedule/index.html'),
        createClassSeats: resolve(frontendRoot, 'classes/new/seats-and-price/index.html'),
        createClassReview: resolve(frontendRoot, 'classes/new/review/index.html'),
        createClassPublished: resolve(frontendRoot, 'classes/new/published/index.html'),
        classes: resolve(frontendRoot, 'classes/index.html'),
        classDetail: resolve(frontendRoot, 'classes/detail/index.html'),
        students: resolve(frontendRoot, 'students/index.html'),
        bookingClass: resolve(frontendRoot, 'class/index.html'),
        bookingComplete: resolve(frontendRoot, 'booking/complete/index.html'),
        pricing: resolve(frontendRoot, 'pricing/index.html'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    testTimeout: 15_000,
  },
});
