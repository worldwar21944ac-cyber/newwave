#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_URL="https://ruby-os-ai.wwwknockoutforever.com"
EXPECTED_VERSION="2026.09.16-ruby-os-v18-operational"

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

require() {
  command -v "$1" >/dev/null 2>&1 || fail "missing command: $1"
}

require curl
require jq
require npx
require wrangler

cd "$ROOT_DIR"

echo "1) applying migration"
wrangler d1 execute ruby-os-business-core --file migrations/0001_business_core.sql || fail "migration failed"

echo "2) listing tables"
TABLES="$(wrangler d1 execute ruby-os-business-core --command 'SELECT name FROM sqlite_master WHERE type = "table" ORDER BY name;' --json)"
echo "$TABLES" | jq . >/dev/null || fail "table listing is not valid json"

echo "3) deploying worker"
wrangler deploy || fail "deploy failed"

echo "4) health check"
HEALTH="$(curl -sS "$BASE_URL/api/health")"
echo "$HEALTH" | jq -e --arg v "$EXPECTED_VERSION" '.ok == true and .version == $v' >/dev/null || fail "health/version check failed"

echo "5) verify smoke claim"
VERIFY="$(curl -sS -X POST "$BASE_URL/api/verify" -H 'content-type: application/json' -d '{"claim_id":"smoke-001","text":"harness smoke test"}')"
echo "$VERIFY" | jq -e '.ok == true and .claim_id == "smoke-001"' >/dev/null || fail "verify smoke failed"

echo "6) claims visible"
CLAIMS="$(curl -sS "$BASE_URL/api/claims")"
echo "$CLAIMS" | jq -e '.ok == true and any(.items[]?; .id == "smoke-001")' >/dev/null || fail "claims smoke missing"

echo "ALL CHECKS PASSED"
