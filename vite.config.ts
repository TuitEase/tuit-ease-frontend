import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
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
  const appRoutes = new Set([
    '/',
    '/signup',
    '/signin',
    '/onboarding',
    '/dashboard',
    '/messages',
    '/settings',
    '/classes/new',
    '/classes/new/basics',
    '/classes/new/schedule',
    '/classes/new/seats-and-price',
    '/classes/new/review',
    '/classes/new/published',
    '/classes',
    '/classes/detail',
    '/students',
    '/booking/complete',
    '/pricing',
    '/payments',
  ]);

  const rewrite = (url: string | undefined): string | undefined => {
    if (!url) return url;
    const queryIndex = url.indexOf('?');
    const pathname = queryIndex === -1 ? url : url.slice(0, queryIndex);
    const query = queryIndex === -1 ? '' : url.slice(queryIndex);
    const normalizedPath = pathname.replace(/\/+$/, '') || '/';

    if (/^\/class\/(?!index\.html$)[^/]+\/?$/.test(pathname)) {
      return `/class/index.html${query}`;
    }
    if (/^\/pay\/[0-9a-f-]{36}\/?$/i.test(pathname)) {
      return `/pay/index.html${query}`;
    }
    if (pathname === '/booking/complete' || pathname === '/booking/complete/') {
      return `/booking/complete/index.html${query}`;
    }
    if (pathname === '/payments' || pathname === '/payments/') {
      return `/payments/index.html${query}`;
    }
    if (
      !appRoutes.has(normalizedPath) &&
      !/^\/class\/[^/]+$/.test(normalizedPath) &&
      !normalizedPath.startsWith('/api/') &&
      !normalizedPath.startsWith('/@') &&
      !/\.[^/]+$/.test(normalizedPath)
    ) {
      return `/404.html${query}`;
    }
    return url;
  };

  const routeRequest = (
    req: { url?: string; method?: string },
    res: {
      statusCode: number;
      setHeader: (name: string, value: string) => unknown;
      end: (body?: Uint8Array) => unknown;
    },
    next: (error?: Error) => void,
    notFoundFile: string,
  ) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    const originalUrl = req.url;
    const rewrittenUrl = rewrite(originalUrl);
    if (rewrittenUrl !== originalUrl && rewrittenUrl?.startsWith('/404.html')) {
      void readFile(notFoundFile).then(
        (page) => {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(req.method === 'HEAD' ? undefined : page);
        },
        next,
      );
      return;
    }
    req.url = rewrittenUrl;
    next();
  };

  return {
    name: 'tuitease-public-booking-routes',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        routeRequest(req, res, next, resolve(frontendRoot, 'public', '404.html'));
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        routeRequest(req, res, next, resolve(frontendRoot, 'dist', '404.html'));
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
        paymentLink: resolve(frontendRoot, 'pay/index.html'),
        pricing: resolve(frontendRoot, 'pricing/index.html'),
        payments: resolve(frontendRoot, 'payments/index.html'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    testTimeout: 15_000,
  },
});
