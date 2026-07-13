# Zilla Ops Cloudflare Worker

Native Cloudflare Workers conversion of the supplied FastAPI/Uvicorn service.

## What changed

- Replaced FastAPI routes with an ES module `fetch` handler.
- Removed Uvicorn, Python SSL checks, `nest_asyncio`, event-loop management, and threads.
- Preserved `/`, `/auth`, `/routes`, `/dockerize`, `/batch_content`, and `/batch_audit`.
- Added `/api/health` and `/api/vision`.
- Added explicit CORS, structured errors, request IDs, security headers, and Worker observability.
- Kept the unavailable Python content/audit dependency honest: both routes return `503` until a real edge-compatible implementation is connected.

## Local validation

```bash
npm install
npm run types
npm run check
npm run dev
```

Test locally:

```bash
curl http://localhost:8787/api/health
curl http://localhost:8787/routes
curl -X POST http://localhost:8787/batch_content
```

## Preview-first deployment

Authenticate once:

```bash
npx wrangler login
npx wrangler whoami
```

Upload a version without replacing production traffic:

```bash
npm run deploy:preview
```

After testing the preview URL, deploy the Worker:

```bash
npm run deploy
```

Do not add a custom domain or route for `knockoutforever.com` until the preview endpoints pass.

## Production configuration

Change `ALLOWED_ORIGIN` in `wrangler.jsonc` from `*` to the exact frontend origin before adding cookie- or token-based authentication. Store credentials with `wrangler secret put`; never commit them.

The two batch endpoints need an edge-compatible implementation. Recommended choices are a service binding to a separate Worker, Workers AI, or a Queue/Workflow for long-running batches.
