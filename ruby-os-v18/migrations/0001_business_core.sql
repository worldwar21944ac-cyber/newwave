CREATE TABLE IF NOT EXISTS ruby_business_leads (
  id TEXT PRIMARY KEY,
  created_at TEXT,
  updated_at TEXT,
  name TEXT,
  company TEXT,
  email TEXT,
  phone TEXT,
  need TEXT,
  budget TEXT,
  source TEXT,
  status TEXT,
  score INTEGER,
  next_action TEXT,
  notes TEXT,
  owner TEXT,
  budget_cents INTEGER
);

CREATE TABLE IF NOT EXISTS ruby_business_opportunities (
  id TEXT PRIMARY KEY,
  lead_id TEXT,
  created_at TEXT,
  updated_at TEXT,
  title TEXT,
  stage TEXT,
  amount TEXT,
  probability INTEGER,
  next_step TEXT,
  status TEXT,
  notes TEXT,
  amount_cents INTEGER
);

CREATE TABLE IF NOT EXISTS ruby_business_customers (
  id TEXT PRIMARY KEY,
  created_at TEXT,
  updated_at TEXT,
  name TEXT,
  company TEXT,
  email TEXT,
  phone TEXT,
  status TEXT,
  lifetime_value TEXT,
  notes TEXT,
  lifetime_value_cents INTEGER
);

CREATE TABLE IF NOT EXISTS ruby_business_tasks (
  id TEXT PRIMARY KEY,
  created_at TEXT,
  updated_at TEXT,
  source_type TEXT,
  source_id TEXT,
  title TEXT,
  description TEXT,
  assignee TEXT,
  priority TEXT,
  status TEXT,
  due_at TEXT,
  verified_at TEXT,
  result TEXT,
  notes TEXT,
  verification_notes TEXT
);

CREATE TABLE IF NOT EXISTS ruby_business_offers (
  id TEXT PRIMARY KEY,
  created_at TEXT,
  updated_at TEXT,
  lead_id TEXT,
  title TEXT,
  description TEXT,
  price TEXT,
  currency TEXT,
  status TEXT,
  notes TEXT,
  price_cents INTEGER
);

CREATE TABLE IF NOT EXISTS ruby_business_quotes (
  id TEXT PRIMARY KEY,
  created_at TEXT,
  updated_at TEXT,
  offer_id TEXT,
  lead_id TEXT,
  amount TEXT,
  status TEXT,
  notes TEXT,
  amount_cents INTEGER
);

CREATE TABLE IF NOT EXISTS ruby_business_invoices (
  id TEXT PRIMARY KEY,
  created_at TEXT,
  updated_at TEXT,
  customer_id TEXT,
  quote_id TEXT,
  amount TEXT,
  due_at TEXT,
  status TEXT,
  notes TEXT,
  amount_cents INTEGER
);

CREATE TABLE IF NOT EXISTS ruby_business_documents (
  id TEXT PRIMARY KEY,
  created_at TEXT,
  updated_at TEXT,
  title TEXT,
  source_type TEXT,
  source_id TEXT,
  mime_type TEXT,
  body TEXT,
  summary TEXT,
  status TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS ruby_business_workflows (
  id TEXT PRIMARY KEY,
  created_at TEXT,
  updated_at TEXT,
  title TEXT,
  kind TEXT,
  source_type TEXT,
  source_id TEXT,
  status TEXT,
  plan_json TEXT,
  result_json TEXT,
  verification_state TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS ruby_business_activities (
  id TEXT PRIMARY KEY,
  created_at TEXT,
  action TEXT,
  source_type TEXT,
  source_id TEXT,
  service TEXT,
  success INTEGER,
  verification_state TEXT,
  input_json TEXT,
  result_json TEXT,
  error TEXT,
  actor TEXT
);

CREATE TABLE IF NOT EXISTS ruby_system_events (
  id TEXT PRIMARY KEY,
  created_at TEXT,
  category TEXT,
  title TEXT,
  details TEXT,
  severity TEXT
);

CREATE TABLE IF NOT EXISTS ruby_system_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT,
  transaction_id TEXT,
  event TEXT,
  route TEXT,
  decision TEXT,
  score INTEGER,
  payload TEXT,
  notes TEXT,
  hash TEXT
);

CREATE TABLE IF NOT EXISTS session_store (
  id TEXT PRIMARY KEY,
  created_at TEXT,
  updated_at TEXT,
  value TEXT
);

CREATE TABLE IF NOT EXISTS memory_store (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT
);

INSERT OR REPLACE INTO ruby_system_settings (key, value, updated_at)
VALUES ('billing_guardrails', '{"spend_cap_usd":50,"expensive_services":"optional","planetscale":"disabled_by_default"}', datetime('now'));
