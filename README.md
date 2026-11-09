# TuitEase Frontend

The TuitEase frontend is a React and TypeScript application built with Vite. It includes the public landing and pricing pages, host account flows, dashboard, and student booking and payment pages.

## Requirements

- Node.js and npm
- The Django backend running locally for API-backed features

## Install and run

From this directory:

```powershell
npm install
npm run dev
```

Open the URL printed by Vite (by default, `http://127.0.0.1:3000`). The development server proxies `/api` requests to Django at `http://127.0.0.1:8000`.

## Environment variables

Copy `.env.example` to `.env.local` when you need to customize the frontend:

```powershell
Copy-Item .env.example .env.local
```

- `VITE_API_BASE_URL`: Optional API origin. Leave empty to use the local Vite `/api` proxy.
- `VITE_GOOGLE_CLIENT_ID`: Public Google OAuth web client ID; use the same client ID configured in the backend.
- `VITE_PUBLIC_BASE_URL`: Optional public site origin used when generating booking links and QR codes. Defaults to the current origin.

Restart Vite after changing environment variables. Do not put private keys or client secrets in frontend variables; Vite exposes `VITE_` variables to the browser.

## Pages

The multi-page app includes:

- `/`: public landing page
- `/pricing/`: pricing
- `/signup/`, `/signin/`, `/onboarding/`: host account flows
- `/dashboard/`, `/classes/`, `/students/`, `/messages/`, `/payments/`, `/settings/`: host workspace
- `/class/<slug>/`, `/booking/complete/`, `/pay/<booking-uuid>/`: public class and booking flows

The Vite configuration supports public class and payment routes during development and preview. Production hosting must serve the built app's route entry points and apply the rewrites described in the repository [README](../README.md).

## Build and tests

```powershell
npm run build
npm test
```

`npm run build` runs the TypeScript check before creating production files in `dist/`. `npm test` runs the Vitest suite.
