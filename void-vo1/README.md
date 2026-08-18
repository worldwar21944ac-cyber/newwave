# VOID / VO-1 Command Center

Production-ready foundation for the VOID / VO-1 architecture: React/Vite UI, Tailwind configuration, Python FastAPI API, realtime WebSocket telemetry, and browser-native TTS.

## Structure

- `src/` React command center and TTS interface
- `backend/` Python FastAPI Worker
- `backend/telemetry/` realtime telemetry stream
- `backend/tts/` TTS control interface
- `tailwind.config.js` Tailwind configuration
- `wrangler.toml` Cloudflare UI deployment
- `backend/wrangler.toml` Cloudflare Python API deployment

## Local UI

`cd void-vo1 && npm install && npm run dev`

## Local Python API

Install `uv`, then from `void-vo1` run `uv run pywrangler dev --config backend/wrangler.toml`.

## Cloudflare deployment

Cloudflare supports Python Workers and FastAPI through its Python Workers runtime. From `void-vo1`, build and deploy the UI with `npm install && npm run build && npx wrangler deploy`. Deploy the API with `uv run pywrangler deploy --config backend/wrangler.toml`.

Set `VITE_API_URL` during the UI build if the Python API is on a separate hostname. The UI automatically upgrades the telemetry endpoint to `wss://` on HTTPS pages.

## API

- `GET /api/health`
- `GET /api/telemetry`
- `WS /ws/telemetry`
- `GET /api/tts/voices`
- `POST /api/tts/speak`

The current TTS implementation uses the browser Web Speech API for immediate speech. The backend endpoint is deliberately provider-neutral so a server-side AI voice provider can be added without changing the UI contract.
