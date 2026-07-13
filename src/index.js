const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Newwave</title>
  <style>
    :root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#05070b;color:#fff;font:16px/1.5 system-ui,sans-serif}main{width:min(720px,90vw);padding:48px;border:1px solid #223047;border-radius:24px;background:linear-gradient(145deg,#111827,#080b11);box-shadow:0 25px 80px #000}p{color:#a8b4c7}small{color:#65748a}
  </style>
</head>
<body><main><small>12 ROUNDS MEDIA</small><h1>Newwave is live.</h1><p>The Cloudflare Worker deployment is healthy and ready for the full production experience.</p></main></body>
</html>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({
        ok: true,
        service: "newwave",
        timestamp: new Date().toISOString()
      }, {
        headers: { "cache-control": "no-store" }
      });
    }

    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=UTF-8",
        "cache-control": "public, max-age=300",
        "x-content-type-options": "nosniff",
        "referrer-policy": "strict-origin-when-cross-origin",
        "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"
      }
    });
  }
};
