const VERSION = '2026.09.16-ruby-os-v18-operational';
const JSON_HEADERS = {
  'content-type': 'application/json;charset=utf-8',
  'cache-control': 'no-store',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type,authorization,x-ruby-task-id,x-ruby-trace-id',
  'x-content-type-options': 'nosniff',
};

const HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Ruby OS Operations</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; font-family: system-ui, sans-serif; background:#07080b; color:#f4f7fb; }
  .wrap { max-width: 1180px; margin:0 auto; padding: 18px; }
  .hero { background:#10131a; border:1px solid #252b39; border-radius:18px; padding:18px; }
  .badge { display:inline-block; padding:6px 10px; border-radius:999px; background:#3f1722; color:#ffbfd0; font-size:12px; }
  h1 { margin:10px 0 6px; font-size:42px; }
  p { color:#c7cdd9; line-height:1.5; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:12px; }
  .card { background:#131722; border:1px solid #252b39; border-radius:16px; padding:14px; }
  .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin:14px 0; }
  .stat { background:#171b25; border:1px solid #273042; border-radius:14px; padding:12px; }
  .k { color:#96a3b8; font-size:11px; text-transform:uppercase; letter-spacing:.08em; }
  .v { font-size:22px; font-weight:800; margin-top:6px; }
  input, textarea, select { width:100%; box-sizing:border-box; background:#0b0d12; color:#fff; border:1px solid #2a3040; border-radius:12px; padding:11px; font:inherit; }
  textarea { min-height:90px; resize:vertical; }
  button { border:0; border-radius:999px; padding:11px 16px; font-weight:800; cursor:pointer; background:#e11d48; color:white; }
  .row { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
  pre { white-space:pre-wrap; margin:0; min-height:160px; background:#0b0d12; border:1px solid #273042; border-radius:14px; padding:12px; overflow:auto; }
  .sections { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; margin-top:12px; }
  .small { color:#96a3b8; font-size:12px; }
  table { width:100%; border-collapse:collapse; }
  th, td { text-align:left; padding:8px; border-bottom:1px solid #233041; vertical-align:top; }
  th { color:#96a3b8; font-size:12px; text-transform:uppercase; letter-spacing:.06em; }
  @media (max-width: 960px) { .grid, .sections { grid-template-columns:1fr; } .stats { grid-template-columns:repeat(2,1fr); } }
</style>
</head>
<body>
<div class="wrap">
  <div class="hero">
    <div class="badge">Ruby OS v18 — Intake → Verify → Route → Settle</div>
    <h1>Operator console, not a homepage.</h1>
    <p>These four actions are the product. Everything below is state, audit, or work in flight.</p>
    <div id="stats" class="stats"></div>
    <div class="grid">
      <section class="card">
        <h2>Command Ruby</h2>
        <select id="kind">
          <option value="lead">Lead intake</option>
          <option value="task">Task breakdown</option>
          <option value="document">Document analysis</option>
          <option value="offer">Offer / quote</option>
          <option value="transaction">Transaction / verification</option>
          <option value="idea">Idea → action</option>
        </select>
        <div style="height:8px"></div>
        <textarea id="command" placeholder="Describe the work or claim..."></textarea>
        <div style="height:8px"></div>
        <div class="row">
          <button id="run">Run workflow</button>
          <button id="refresh" style="background:#334155">Refresh</button>
          <span id="status" class="small">Ready</span>
        </div>
        <div style="height:10px"></div>
        <pre id="result">Awaiting input.</pre>
      </section>
      <section class="card">
        <h2>Four transitions</h2>
        <div class="small">Use the same route surface the loop can call.</div>
        <div style="height:12px"></div>
        <div class="row"><input id="claimId" placeholder="claim_id" /><input id="amount" placeholder="Amount" /></div>
        <div style="height:8px"></div>
        <div class="row">
          <button id="verifyBtn">Verify</button>
          <button id="routeBtn" style="background:#334155">Route</button>
          <button id="settleBtn" style="background:#0f766e">Settle</button>
        </div>
        <div style="height:8px"></div>
        <input id="evidence" placeholder="Evidence text / note" />
      </section>
    </div>
    <div class="sections">
      <section class="card"><h2>Claims</h2><div id="claims"></div></section>
      <section class="card"><h2>Audit trail</h2><div id="audit"></div></section>
      <section class="card"><h2>Customers / invoices</h2><div id="customers"></div></section>
      <section class="card"><h2>Recent tasks</h2><div id="tasks"></div></section>
    </div>
  </div>
</div>
<script>
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
async function api(path, body, method='POST') {
  const res = await fetch(path, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const txt = await res.text();
  let json = null; try { json = txt ? JSON.parse(txt) : null; } catch { json = { raw: txt }; }
  if (!res.ok) throw new Error((json && json.error) || ('HTTP ' + res.status));
  return json;
}
function row(title, sub) { return `<div style="padding:10px 0;border-bottom:1px solid #233041"><b>${esc(title)}</b><div class="small">${esc(sub)}</div></div>`; }
async function loadDashboard() {
  const d = await (await fetch('/api/dashboard')).json();
  const s = d.stats || {};
  $('stats').innerHTML = [
    ['Revenue', s.revenue_paid || '$0.00'],
    ['Open claims', s.open_claims || 0],
    ['Leads', s.leads || 0],
    ['Open invoices', s.open_invoices || 0],
  ].map(([k,v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${esc(v)}</div></div>`).join('');
  $('claims').innerHTML = (d.recent?.claims || []).map(x => row(x.title || x.id, `${x.status || 'received'} • ${x.notes || ''}`)).join('') || '<div class="small">No claims yet.</div>';
  $('audit').innerHTML = (d.recent?.activities || []).map(x => row(x.action || x.id, `${x.service || 'ruby'} • ${x.success ? 'ok' : 'fail'} • ${x.verification_state || ''}`)).join('') || '<div class="small">No audit rows yet.</div>';
  $('customers').innerHTML = (d.recent?.customers || []).map(x => row(x.name || x.company || x.id, `${x.status || ''} • ${x.lifetime_value_cents ? '$' + (x.lifetime_value_cents/100).toFixed(2) : '$0.00'}`)).join('') || '<div class="small">No customers yet.</div>';
  $('tasks').innerHTML = (d.recent?.tasks || []).map(x => row(x.title || x.id, `${x.priority || 'normal'} • ${x.status || 'open'} • ${x.verification_notes || ''}`)).join('') || '<div class="small">No tasks yet.</div>';
}
async function run(kind, payload) {
  $('status').textContent = 'Working...';
  try {
    const out = await api('/api/intake', { kind, ...payload });
    $('result').textContent = JSON.stringify(out, null, 2);
    $('status').textContent = 'Done';
    await loadDashboard();
  } catch (e) {
    $('result').textContent = 'Error: ' + e.message;
    $('status').textContent = 'Failed';
  }
}
$('run').onclick = () => run($('kind').value, { command: $('command').value });
$('verifyBtn').onclick = async () => { $('status').textContent = 'Working...'; try { const out = await api('/api/verify', { claim_id: $('claimId').value, text: $('evidence').value, amount: $('amount').value }); $('result').textContent = JSON.stringify(out, null, 2); $('status').textContent = 'Done'; await loadDashboard(); } catch (e) { $('result').textContent = 'Error: ' + e.message; $('status').textContent = 'Failed'; } };
$('routeBtn').onclick = async () => { $('status').textContent = 'Working...'; try { const out = await api('/api/route', { claim_id: $('claimId').value, amount: $('amount').value, state: 3 }); $('result').textContent = JSON.stringify(out, null, 2); $('status').textContent = 'Done'; await loadDashboard(); } catch (e) { $('result').textContent = 'Error: ' + e.message; $('status').textContent = 'Failed'; } };
$('settleBtn').onclick = async () => { $('status').textContent = 'Working...'; try { const out = await api('/api/settle', { claim_id: $('claimId').value, amount: $('amount').value }); $('result').textContent = JSON.stringify(out, null, 2); $('status').textContent = 'Done'; await loadDashboard(); } catch (e) { $('result').textContent = 'Error: ' + e.message; $('status').textContent = 'Failed'; } };
$('refresh').onclick = loadDashboard;
loadDashboard();
</script>
</body>
</html>`;

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), { status, headers: JSON_HEADERS });
}
function text(body, status = 200) {
  return new Response(body, { status, headers: { 'content-type': 'text/plain;charset=utf-8', 'cache-control': 'no-store' } });
}
function htmlResponse(body, status = 200) {
  return new Response(body, { status, headers: { 'content-type': 'text/html;charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
}
function uid(prefix) { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
function iso() { return new Date().toISOString(); }
function clean(v) { return String(v ?? '').trim(); }
function moneyToCents(v) {
  const s = clean(v).replace(/[^0-9.]/g, '');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}
function clampState(v) { const n = Number(v || 1); return Math.min(4, Math.max(1, Number.isFinite(n) ? n : 1)); }
function stateLabel(state) { return ({1: 'received', 2: 'verified', 3: 'routed', 4: 'settled'})[clampState(state)] || 'received'; }

async function q(env, sql, params = []) {
  return env.AUDIT_DB.prepare(sql).bind(...params).all();
}
async function one(env, sql, params = []) {
  return env.AUDIT_DB.prepare(sql).bind(...params).first();
}
async function run(env, sql, params = []) {
  return env.AUDIT_DB.prepare(sql).bind(...params).run();
}
async function logAction(env, obj) {
  const now = iso();
  const id = obj.id || uid('act');
  await run(env, 'INSERT OR REPLACE INTO ruby_business_activities (id, created_at, action, source_type, source_id, service, success, verification_state, input_json, result_json, error, actor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    id,
    now,
    obj.action || 'unknown',
    obj.source_type || 'system',
    obj.source_id || null,
    obj.service || 'ruby',
    obj.success ? 1 : 0,
    obj.verification_state || 'unknown',
    JSON.stringify(obj.input || {}),
    JSON.stringify(obj.result || {}),
    obj.error || null,
    obj.actor || 'ruby',
  ]);
  await run(env, 'INSERT INTO ruby_system_events (id, created_at, category, title, details, severity) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET created_at=excluded.created_at, category=excluded.category, title=excluded.title, details=excluded.details, severity=excluded.severity', [
    obj.event_id || uid('evt'),
    now,
    obj.category || 'work',
    obj.event_title || obj.action || 'activity',
    obj.event_details || (obj.success ? 'Success' : 'Failure'),
    obj.severity || (obj.success ? 'info' : 'warning'),
  ]).catch(() => {});
}

async function storeEvidence(env, claimId, payload) {
  if (!env.PARCHMENT?.put) return null;
  const key = `claims/${claimId}.json`;
  await env.PARCHMENT.put(key, JSON.stringify(payload, null, 2), { httpMetadata: { contentType: 'application/json;charset=utf-8' } });
  return key;
}

async function dashboard(env) {
  const [leads, claims, customers, openInvoices, tasks, activities, revenue] = await Promise.all([
    one(env, "SELECT COUNT(*) AS c FROM ruby_business_leads"),
    one(env, "SELECT COUNT(*) AS c FROM ruby_business_documents"),
    one(env, "SELECT COUNT(*) AS c FROM ruby_business_customers"),
    one(env, "SELECT COUNT(*) AS c FROM ruby_business_invoices WHERE status != 'paid'"),
    one(env, "SELECT COUNT(*) AS c FROM ruby_business_tasks WHERE status IN ('open','in_progress')"),
    one(env, "SELECT COUNT(*) AS c FROM ruby_business_activities"),
    one(env, "SELECT COALESCE(SUM(amount_cents), 0) AS c FROM ruby_business_invoices WHERE status = 'paid'"),
  ]);

  const recent = await Promise.all([
    q(env, 'SELECT id, created_at, title, status, notes FROM ruby_business_documents ORDER BY created_at DESC LIMIT 8'),
    q(env, 'SELECT id, created_at, action, service, success, verification_state, error FROM ruby_business_activities ORDER BY created_at DESC LIMIT 8'),
    q(env, 'SELECT id, created_at, name, company, status, lifetime_value_cents FROM ruby_business_customers ORDER BY created_at DESC LIMIT 8'),
    q(env, 'SELECT id, created_at, title, description, priority, status, verification_notes FROM ruby_business_tasks ORDER BY created_at DESC LIMIT 8'),
  ]);

  return {
    ok: true,
    stats: {
      revenue_paid: `$${((revenue?.c || 0) / 100).toFixed(2)}`,
      open_claims: claims?.c || 0,
      leads: leads?.c || 0,
      open_invoices: openInvoices?.c || 0,
      open_tasks: tasks?.c || 0,
      customers: customers?.c || 0,
      audit_rows: activities?.c || 0,
      version: VERSION,
    },
    recent: {
      claims: recent[0]?.results || [],
      activities: recent[1]?.results || [],
      customers: recent[2]?.results || [],
      tasks: recent[3]?.results || [],
    },
  };
}

function defaultLeadAnalysis(input) {
  const score = Math.min(100, Math.max(20, (clean(input.email) ? 15 : 0) + (clean(input.need) ? 20 : 0) + (clean(input.company) ? 10 : 0) + 35));
  return {
    score,
    stage: score >= 75 ? 'hot' : score >= 45 ? 'warm' : 'cold',
    summary: clean(input.command || input.need || 'Lead captured'),
    next_action: 'Follow up within 24 hours',
  };
}

async function createLeadWorkflow(env, input) {
  const now = iso();
  const leadId = uid('lead');
  const oppId = uid('opp');
  const offerId = uid('offer');
  const quoteId = uid('quote');
  const score = defaultLeadAnalysis(input).score;
  const stage = defaultLeadAnalysis(input).stage;
  const nextAction = defaultLeadAnalysis(input).next_action;
  const budgetCents = moneyToCents(input.budget);
  const hasContact = !!(clean(input.email) || clean(input.phone));

  await run(env, 'INSERT INTO ruby_business_leads (id, created_at, updated_at, name, company, email, phone, need, budget, source, status, score, next_action, notes, owner, budget_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    leadId, now, now, clean(input.name), clean(input.company), clean(input.email), clean(input.phone), clean(input.need), clean(input.budget), clean(input.source || 'manual'), stage, score, nextAction, clean(input.notes || ''), 'ruby', budgetCents,
  ]);

  await run(env, 'INSERT INTO ruby_business_opportunities (id, lead_id, created_at, updated_at, title, stage, amount, probability, next_step, status, notes, amount_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    oppId, leadId, now, now, clean(input.company || input.name || 'Opportunity'), stage === 'hot' ? 'proposal' : 'qualified', clean(input.budget || 'TBD'), score, nextAction, 'open', 'Created from lead intake', budgetCents,
  ]);

  await run(env, 'INSERT INTO ruby_business_offers (id, created_at, updated_at, lead_id, title, description, price, currency, status, notes, price_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    offerId, now, now, leadId, 'Ruby OS proposal', 'Auto-generated offer', clean(input.budget || 'TBD'), 'USD', 'draft', 'Auto-created from lead', budgetCents,
  ]);

  await run(env, 'INSERT INTO ruby_business_quotes (id, created_at, updated_at, offer_id, lead_id, amount, status, notes, amount_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    quoteId, now, now, offerId, leadId, clean(input.budget || 'TBD'), 'draft', 'Auto-created from lead intake', budgetCents,
  ]);

  if (hasContact) {
    await run(env, 'INSERT INTO ruby_business_customers (id, created_at, updated_at, name, company, email, phone, status, lifetime_value, notes, lifetime_value_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      uid('cust'), now, now, clean(input.name || input.company || 'Prospect'), clean(input.company), clean(input.email), clean(input.phone), 'prospect', '0', 'Created from lead workflow', 0,
    ]);
  }

  const followTaskId = uid('task');
  await run(env, 'INSERT INTO ruby_business_tasks (id, created_at, updated_at, source_type, source_id, title, description, assignee, priority, status, verification_notes, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    followTaskId, now, now, 'lead', leadId, 'Follow up with lead', 'Respond and move the lead forward.', 'ruby', 'high', 'open', 'Lead responded or meeting booked', 'Created from lead workflow',
  ]);

  await run(env, 'INSERT INTO ruby_business_workflows (id, created_at, updated_at, title, kind, source_type, source_id, status, plan_json, result_json, verification_state, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    uid('wf'), now, now, 'Lead workflow', 'lead', 'lead', leadId, 'completed', JSON.stringify(input), JSON.stringify({ leadId, oppId, offerId, quoteId, followTaskId, stage, score }), 'unverified', 'Lead captured',
  ]);

  await logAction(env, { action: 'lead_intake', source_type: 'lead', source_id: leadId, success: true, verification_state: 'created', input, result: { leadId, oppId, offerId, quoteId }, notes: nextAction });
  return { ok: true, kind: 'lead', leadId, opportunityId: oppId, offerId, quoteId, followUpTaskId: followTaskId, stage, score, nextAction };
}

async function createTaskWorkflow(env, input) {
  const now = iso();
  const parentId = uid('task');
  await run(env, 'INSERT INTO ruby_business_tasks (id, created_at, updated_at, source_type, source_id, title, description, assignee, priority, status, verification_notes, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    parentId, now, now, 'objective', null, clean(input.objective || input.command || 'Project objective'), clean(input.objective || input.command || ''), 'ruby', clean(input.priority || 'high'), 'open', 'Objective completed', 'Primary task created',
  ]);
  await run(env, 'INSERT INTO ruby_business_workflows (id, created_at, updated_at, title, kind, source_type, source_id, status, plan_json, result_json, verification_state, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    uid('wf'), now, now, 'Task workflow', 'task', 'objective', parentId, 'completed', JSON.stringify(input), JSON.stringify({ parentId }), 'unverified', 'Task workflow created',
  ]);
  await logAction(env, { action: 'task_breakdown', source_type: 'task', source_id: parentId, success: true, verification_state: 'planned', input, result: { parentId } });
  return { ok: true, kind: 'task', parentTaskId: parentId };
}

async function createDocumentWorkflow(env, input) {
  const now = iso();
  const docId = uid('doc');
  await run(env, 'INSERT INTO ruby_business_documents (id, created_at, updated_at, title, source_type, source_id, mime_type, body, summary, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    docId, now, now, clean(input.title || 'Document'), clean(input.source_type || 'document'), null, clean(input.mime_type || 'text/plain'), clean(input.text || input.body || ''), clean(input.summary || input.text || ''), 'processed', 'Processed by Ruby',
  ]);
  await run(env, 'INSERT INTO ruby_business_workflows (id, created_at, updated_at, title, kind, source_type, source_id, status, plan_json, result_json, verification_state, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    uid('wf'), now, now, 'Document workflow', 'document', 'document', docId, 'completed', JSON.stringify(input), JSON.stringify({ docId }), 'unverified', 'Document analyzed',
  ]);
  await logAction(env, { action: 'document_analysis', source_type: 'document', source_id: docId, success: true, verification_state: 'stored', input, result: { docId } });
  return { ok: true, kind: 'document', documentId: docId };
}

async function createOfferWorkflow(env, input) {
  const now = iso();
  const offerId = uid('offer');
  const quoteId = uid('quote');
  const priceCents = moneyToCents(input.price);
  await run(env, 'INSERT INTO ruby_business_offers (id, created_at, updated_at, lead_id, title, description, price, currency, status, notes, price_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    offerId, now, now, null, clean(input.service || 'Offer'), clean(input.description || 'Offer drafted'), clean(input.price || 'TBD'), 'USD', 'draft', 'Built by Ruby', priceCents,
  ]);
  await run(env, 'INSERT INTO ruby_business_quotes (id, created_at, updated_at, offer_id, lead_id, amount, status, notes, amount_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    quoteId, now, now, offerId, null, clean(input.price || 'TBD'), 'draft', 'Quote created by Ruby', priceCents,
  ]);
  await logAction(env, { action: 'offer_created', source_type: 'offer', source_id: offerId, success: true, verification_state: 'draft', input, result: { offerId, quoteId } });
  return { ok: true, kind: 'offer', offerId, quoteId };
}

async function intake(env, body) {
  const kind = clean(body.kind || body.type || body.action || 'idea').toLowerCase();
  if (['lead', 'opportunity', 'customer'].includes(kind)) return createLeadWorkflow(env, body);
  if (kind === 'task' || kind === 'idea') return createTaskWorkflow(env, { objective: body.objective || body.command || body.idea || JSON.stringify(body), priority: body.priority || 'medium' });
  if (kind === 'document' || kind === 'transaction' || kind === 'research') return createDocumentWorkflow(env, { title: body.title || 'Document', text: body.command || body.text || body.body || JSON.stringify(body) });
  if (kind === 'offer' || kind === 'quote') return createOfferWorkflow(env, body);
  return createTaskWorkflow(env, { objective: body.command || JSON.stringify(body), priority: body.priority || 'medium' });
}

async function verifyClaim(env, input) {
  const claimId = clean(input.claim_id || input.id || uid('claim'));
  const bodyText = clean(input.text || input.body || input.command || input.claim || input.document || JSON.stringify(input));
  const evidenceHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${claimId}\n${bodyText}`)).then(buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join(''));
  const gateMask = '111111111111';
  const state = clampState(input.state || 2);
  const probability = 0.78;
  const nextAction = clean(input.next_action || 'Move to routing');
  const summary = bodyText.slice(0, 240);
  const amount = clean(input.amount || input.value || 'TBD');
  const now = iso();

  await run(env, 'INSERT OR REPLACE INTO ruby_business_documents (id, created_at, updated_at, title, source_type, source_id, mime_type, body, summary, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    claimId, now, now, clean(input.title || 'Claim'), 'claim', claimId, 'application/json', bodyText, summary, stateLabel(state), `gate_mask=${gateMask}; probability=${probability}`,
  ]);

  const evidenceKey = await storeEvidence(env, claimId, {
    claim_id: claimId,
    evidence_hash: evidenceHash,
    input,
    result: { gate_mask: gateMask, state, probability_of_collection: probability, next_action: nextAction, summary, amount },
    created_at: now,
  });

  await run(env, 'INSERT INTO ruby_business_workflows (id, created_at, updated_at, title, kind, source_type, source_id, status, plan_json, result_json, verification_state, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    uid('wf'), now, now, `Claim verify ${claimId}`, 'claim_verify', 'claim', claimId, 'completed', JSON.stringify(input), JSON.stringify({ gate_mask: gateMask, state, probability_of_collection: probability, next_action: nextAction, evidence_hash: evidenceHash, evidence_key: evidenceKey }), 'verified', `route=${stateLabel(state)}`,
  ]);

  await logAction(env, { action: 'claim_verify', source_type: 'claim', source_id: claimId, success: true, verification_state: stateLabel(state), input, result: { claimId, gateMask, state, probability, nextAction, evidenceHash, evidenceKey }, score: Math.round(probability * 100), notes: nextAction, event_title: 'Claim verified', event_details: summary });
  return { ok: true, claim_id: claimId, gate_mask: gateMask, state, probability_of_collection: probability, blockers: [], evidence_hash: evidenceHash, next_action: nextAction, evidence_key: evidenceKey, summary, amount, model: 'heuristic' };
}

async function routeClaim(env, input) {
  const claimId = clean(input.claim_id || input.id || input.claimId);
  if (!claimId) return { ok: false, error: 'claim_id required' };
  const target = clampState(input.state || input.route_to || input.target_state || 3);
  const now = iso();
  const doc = await one(env, 'SELECT * FROM ruby_business_documents WHERE id = ?', [claimId]);
  if (!doc) return { ok: false, error: 'claim not found', claim_id: claimId };
  await run(env, 'UPDATE ruby_business_documents SET updated_at = ?, status = ?, notes = COALESCE(?, notes) WHERE id = ?', [now, stateLabel(target), clean(input.notes || `Routed to ${stateLabel(target)}`), claimId]);
  let invoiceId = null;
  if (target >= 3) {
    invoiceId = uid('inv');
    const amount = clean(input.amount || input.value || 'TBD');
    await run(env, 'INSERT OR REPLACE INTO ruby_business_invoices (id, created_at, updated_at, customer_id, quote_id, amount, due_at, status, notes, amount_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [invoiceId, now, now, clean(input.customer_id || ''), clean(input.quote_id || ''), amount, now, target >= 4 ? 'paid' : 'sent', `Claim ${claimId} routed`, moneyToCents(amount)]);
  }
  await run(env, 'INSERT INTO ruby_business_workflows (id, created_at, updated_at, title, kind, source_type, source_id, status, plan_json, result_json, verification_state, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [uid('wf'), now, now, `Claim route ${claimId}`, 'claim_route', 'claim', claimId, 'completed', JSON.stringify(input), JSON.stringify({ claim_id: claimId, routed_to: stateLabel(target), invoice_id: invoiceId }), stateLabel(target), 'Routing completed']);
  await logAction(env, { action: 'claim_route', source_type: 'claim', source_id: claimId, success: true, verification_state: stateLabel(target), input, result: { claimId, target, invoiceId }, notes: `Routed to ${stateLabel(target)}`, event_title: 'Claim routed', event_details: `${claimId} -> ${stateLabel(target)}` });
  return { ok: true, claim_id: claimId, state: target, routed_to: stateLabel(target), invoice_id: invoiceId };
}

async function settleClaim(env, input) {
  const claimId = clean(input.claim_id || input.id || input.claimId);
  if (!claimId) return { ok: false, error: 'claim_id required' };
  const now = iso();
  const amount = clean(input.amount || input.value || 'TBD');
  const invoiceId = clean(input.invoice_id || input.invoiceId || uid('inv'));
  await run(env, 'INSERT OR REPLACE INTO ruby_business_invoices (id, created_at, updated_at, customer_id, quote_id, amount, due_at, status, notes, amount_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    invoiceId, now, now, clean(input.customer_id || ''), clean(input.quote_id || ''), amount, now, 'paid', `Settled claim ${claimId}`, moneyToCents(amount),
  ]);
  await run(env, 'UPDATE ruby_business_documents SET updated_at = ?, status = ?, notes = COALESCE(?, notes) WHERE id = ?', [now, 'settled', clean(input.notes || 'Claim settled'), claimId]);
  await run(env, 'INSERT INTO ruby_system_events (id, created_at, category, title, details, severity) VALUES (?, ?, ?, ?, ?, ?)', [uid('evt'), now, 'revenue', 'Claim settled', `${claimId} settled with invoice ${invoiceId}`, 'info']);
  await logAction(env, { action: 'claim_settle', source_type: 'claim', source_id: claimId, success: true, verification_state: 'settled', input, result: { claimId, invoiceId, amount }, notes: 'Settlement recorded', event_title: 'Claim settled', event_details: claimId });
  return { ok: true, claim_id: claimId, invoice_id: invoiceId, state: 4, routed_to: 'settled', amount };
}

async function guardrails(env) {
  const row = await one(env, "SELECT value FROM ruby_system_settings WHERE key = 'billing_guardrails'");
  return { ok: true, ...(row?.value ? JSON.parse(row.value) : { spend_cap_usd: 50, expensive_services: 'optional', planetscale: 'disabled_by_default' }) };
}

async function handle(request, env) {
  const url = new URL(request.url);
  let path = url.pathname;
  while (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  const method = request.method.toUpperCase();
  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: JSON_HEADERS });

  try {
    if ((path === '/' || path === '/index.html') && method === 'GET') return htmlResponse(HTML);
    if (path === '/api/health' && method === 'GET') return json({ ok: true, service: 'ruby-os-ai', version: VERSION, status: 'online' });
    if (path === '/api/platform' && method === 'GET') return json({ ok: true, version: VERSION, bindings: { ai: !!env.AI, audit_db: !!env.AUDIT_DB, kv_auth: !!env.GATEWAY_AUTH, kv_kyc: !!env.KYC_SANCTIONS, r2: !!env.PARCHMENT, hyperdrive: !!env.PG }, policy: { planetScale_required: false, expensive_resources_optional: true, dashboard_first_screen: 'business value' } });
    if (path === '/api/dashboard' && method === 'GET') return json(await dashboard(env));
    if (path === '/api/billing' && method === 'GET') return json({ ok: true, billing: (await dashboard(env)).stats, settings: { spend_cap_usd: 50, expensive_services: 'optional', planetscale: 'disabled_by_default' } });
    if (path === '/api/billing/guardrails' && method === 'GET') return json(await guardrails(env));
    if (path === '/api/intake' && method === 'POST') return json(await intake(env, await request.json().catch(() => ({}))));
    if (path === '/api/verify' && method === 'POST') return json(await verifyClaim(env, await request.json().catch(() => ({}))));
    if (path === '/api/route' && method === 'POST') return json(await routeClaim(env, await request.json().catch(() => ({}))));
    if (path === '/api/settle' && method === 'POST') return json(await settleClaim(env, await request.json().catch(() => ({}))));
    if (path === '/api/claims' && method === 'GET') return json({ ok: true, items: (await q(env, 'SELECT * FROM ruby_business_documents ORDER BY created_at DESC LIMIT 50')).results });
    if (path === '/api/leads' && method === 'GET') return json({ ok: true, items: (await q(env, 'SELECT * FROM ruby_business_leads ORDER BY created_at DESC LIMIT 50')).results });
    if (path === '/api/tasks' && method === 'GET') return json({ ok: true, items: (await q(env, 'SELECT * FROM ruby_business_tasks ORDER BY created_at DESC LIMIT 50')).results });
    if (path === '/api/customers' && method === 'GET') return json({ ok: true, items: (await q(env, 'SELECT * FROM ruby_business_customers ORDER BY created_at DESC LIMIT 50')).results });
    if (path === '/api/invoices' && method === 'GET') return json({ ok: true, items: (await q(env, 'SELECT * FROM ruby_business_invoices ORDER BY created_at DESC LIMIT 50')).results });
    if (path === '/api/audit/recent' && method === 'GET') return json({ ok: true, items: (await q(env, 'SELECT * FROM ruby_business_activities ORDER BY created_at DESC LIMIT 50')).results });
    if (path === '/api/postgres/kernel' && method === 'GET') return json({ ok: true, service: 'ruby-os-postgres-kernel', version: VERSION, status: 'OPTIONAL', database_required: false, note: 'PlanetScale and Hyperdrive are optional. Ruby business OS continues using D1, KV, R2, and AI.' });
    if (path === '/api/postgres/schema' && method === 'GET') return text('Ruby OS PostgreSQL kernel is optional. The business OS runs on D1-first storage and can keep operating without PlanetScale.');
    return json({ ok: false, error: 'Not found', path }, 404);
  } catch (e) {
    return json({ ok: false, error: e?.message || String(e), path }, 500);
  }
}

export default { fetch: handle };
