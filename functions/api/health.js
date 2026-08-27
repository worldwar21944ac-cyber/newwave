export async function onRequestGet() {
  return new Response(JSON.stringify({ ok: true, service: 'ruby-os-ai', ts: new Date().toISOString() }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
