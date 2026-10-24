# TypBox Frontend

React client for the **TypBox Study Tracker & Portfolio Hub**.
Built with **React 19**, **TypeScript**, **Vite**, and **Tailwind CSS v4**.

## Requirements

- Node.js 24.22.1+ (or 22.23.4+ / 26.12.1+)
- The [backend](../backend/README.md) running locally or on Render

## Getting Started

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The dev server runs at `http://localhost:5173`.

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API URL. If empty, uses `http://localhost:8000/api` in dev and `https://typbox-dev.onrender.com/api` in production. |
| `VITE_ALLOW_REGISTRATION` | Set to `true` to show the "Create account" UI. Keep in sync with the backend's `ALLOW_REGISTRATION`. |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
