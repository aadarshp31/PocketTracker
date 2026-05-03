# PocketTracker Client

React frontend for PocketTracker, maintained in this workspace.

## Stack

- React 19
- TypeScript
- Vite
- React Router
- TanStack Query
- Axios

## Setup

1. Copy `.env.example` to `.env`.
2. Set `VITE_API_BASE_URL` to your backend API.
3. Set `VITE_DEFAULT_USER_ID` for local testing until auth integration is complete.

## Scripts

- `npm run dev` — start development server
- `npm run build` — typecheck + production build
- `npm run lint` — lint source files
- `npm run preview` — preview production build

## Current Structure

- `src/app` — providers, router, shell layout
- `src/features` — domain modules (`transactions`)
- `src/pages` — route-level screens
- `src/shared` — shared clients/utilities (`api/http`)

## Notes

- Current dashboard UI is a baseline shell and is ready to consume insights endpoints once backend APIs are added.
- Transaction list is already connected to existing backend paginated endpoint.
