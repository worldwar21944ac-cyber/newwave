# Unit Managed Solutions — GitHub Agent Execution Plan

**Purpose:** prepare the Bervashun Trust Unit Managed Solutions integration for a controlled Sandbox-to-Production release using GitHub as the source-of-truth for code, tests, review, and deployment policy.

**Repository discovered:** `worldwar21944ac-cyber/newwave`  
**Relevant application path:** `ruby-os-v18/`  
**Current Worker name in Wrangler config:** `ruby-os-ai`  
**Current Worker entry point:** `ruby-os-v18/worker.mjs`  
**Deployment config:** `ruby-os-v18/wrangler.toml`

This plan is an instruction to the coding agent. It is not evidence that Unit or Stripe has approved Production.

---

## 1. Execution contract

The agent may inspect the repository, create an isolated branch, implement code, add tests, and open a pull request.

The agent must NOT:
- deploy any Worker or run `wrangler deploy`;
- run `wrangler d1 execute` against a remote database or apply migrations;
- change Unit dashboard settings, webhook subscriptions, callback URLs, payment-processing toggles, or credentials;
- change Stripe event destinations, connected accounts, API keys, webhook secrets, or live-mode settings;
- create customers, accounts, payments, transfers, payouts, invoices, or other live financial objects;
- run smoke tests against live endpoints that create or mutate records;
- claim that an internal database record means an external payment or settlement occurred.

Stop before any action that changes a provider dashboard, production secret, production database, production route, or money movement.

## 2. Baseline facts from the supplied account screens

Treat these as user-provided configuration evidence, not as a fresh live API verification:

### Unit
- The visible Unit environment is **Sandbox**, application **Bervashun-Trust**.
- The Unit webhook list contains multiple enabled destinations, including:
  - `https://api.knockoutforever.com/webhooks/unit`
  - `https://unit-application-webhooks.betterpaid1.workers.dev`
  - a Unit-hosted white-label handler.
- Other listed webhook subscriptions are unavailable or disabled.
- Do not enable, disable, delete, or replace any subscription. First map each destination to deployed code and identify ownership.
- Unit webhook signature scheme supplied for this task: HMAC-SHA1 over the exact raw request body, Base64-encoded, in `X-Unit-Signature`. Unit does not supply a timestamp, so event-ID deduplication is required for replay protection.
- Unit's Custom identity-provider setting validates end-user identity-provider JWTs. It is separate from Unit API credentials, Stripe keys, and webhook secrets. Use only the configured issuer and a public JWKS/public verification key. Never use a private key.
- The dashboard lists Application Prefill Endpoint, User Management Endpoint, and Banking Page URL. Implement only against exact, current Unit contracts. Do not infer User Management request methods or schemas from generic REST conventions.
- Unit support transferred the account-specific go-live question to a human. Production eligibility and the actual remaining launch blockers are not confirmed.

### Stripe
- The supplied Stripe screenshot shows an active event destination:
  `https://knockout-connect-production.betterpaid1.workers.dev/webhooks/stripe`
- It is configured for connected-account events and listens to 41 event types.
- The screenshot showed one delivery and zero failures. This does not prove all event types are correctly processed.
- The supplied Unit screen has separate fields for:
  - Secret/Restricted API Key
  - Publishable API Key
  - Connected accounts webhook secret
  - Your account webhook secret
  - Connected account lookup URL
  - MCC code
  - Hostname
  - Files Hostname
- Keep platform-account and connected-account webhook signing secrets distinct.
- The connected-account lookup URL resolves a connected-account ID from a JWT subject, but its exact HTTP method, request authentication, and response schema were not supplied. Do not implement a guessed contract.
- Do not pair Unit Sandbox with Stripe live credentials or use a live Stripe webhook secret in Sandbox. Verify matching environments with Unit before configuration.

## 3. Repository facts already inspected

- The repository is a mixed project; the relevant Worker is under `ruby-os-v18/`.
- Root `package.json` provides:
  - `npm run types`
  - `npm run check` (Wrangler types check, TypeScript check, deploy dry-run)
- Existing GitHub workflow `.github/workflows/cloudflare-worker.yml` runs on PRs and pushes to `main` or `codex/**`, installs root dependencies, and runs types/check.
- `ruby-os-v18/wrangler.toml` contains placeholder D1 and KV IDs. Do not replace placeholders with guessed IDs.
- `ruby-os-v18/deploy.sh` runs a remote D1 migration, deploys the Worker, and performs live smoke writes. Do not invoke it in CI or during this task.
- `ruby-os-v18/worker.mjs` contains a `settleClaim` path that writes an invoice with status `paid` and marks a claim `settled` without visible external-provider settlement proof. Audit and correct this before any integration can represent a real settlement. An internal state transition is not provider settlement evidence.
- The current root workflow is validation-only; it is not a safe staging/production deployment pipeline.

The agent must re-inspect current branch contents before editing; these notes may become stale.

## 4. Phase A — repository audit (read-only first)

1. Inspect all of:
   - `ruby-os-v18/worker.mjs`
   - `ruby-os-v18/wrangler.toml`
   - `ruby-os-v18/migrations/`
   - `ruby-os-v18/harness/`
   - `.github/workflows/`
   - root and nested package manifests and tests.
2. Search for Unit, Stripe, webhook, JWT, connected-account lookup, prefill, user management, settlement, and idempotency implementations.
3. Map each deployed URL from the supplied screens to a route and deployed Worker, if verifiable.
4. Identify secrets and bindings by name only. Never print secret values or include them in artifacts.
5. Report route ownership, environment, current tests, migration state, and gaps before making implementation changes.
6. Check whether `webhook-hardening.zip` or its extracted files are present in the repository. If absent, do not pretend they were reviewed.

## 5. Phase B — webhook workers

Implement or adapt dedicated webhook handlers only after Phase A identifies the correct project structure. Prefer isolated, explicit Worker entry points and isolated D1 event tables; do not overwrite the existing application Worker or its tables.

### Unit receiver requirements
- Read the request body exactly once as raw bytes/text before parsing JSON.
- Verify `X-Unit-Signature` using HMAC-SHA1 and Base64 against the exact raw body.
- Compare signatures in constant time.
- Reject missing, malformed, or invalid signatures before persisting or processing the event.
- Parse only after successful verification.
- Require a stable Unit event ID. Enforce a database uniqueness constraint on provider + event ID.
- Duplicate deliveries must return a safe acknowledgement without repeating side effects.
- Persist event ID, event type, received time, processing state, and a minimal payload or protected reference sufficient for audit/retry.
- If processing fails, record the failure and return a retryable non-2xx response. Do not mark failed work as complete.
- Because Unit does not provide a timestamp in the supplied contract, do not invent a timestamp freshness check. Use durable event-ID deduplication and controlled retention.

### Stripe receiver requirements
- Verify `Stripe-Signature` against the exact raw body using the official Stripe-compatible signature algorithm and configured endpoint secret.
- Enforce a bounded timestamp tolerance (five minutes unless the current Stripe contract/configuration says otherwise).
- Support explicit secret rotation with current and previous secrets without logging either.
- Enforce expected `livemode` for the deployed environment. A Sandbox/test deployment must reject live events and a Production deployment must reject test events.
- Persist event ID with a uniqueness constraint and handle connected-account event context distinctly from platform-account events.
- Return retryable failures when processing fails; do not acknowledge incomplete business processing as success.

### Shared requirements
- No secret configured = fail closed; health endpoints may report whether a secret is configured as a boolean only, never its value.
- Log only event ID, event type, processing status, and safe correlation IDs. Do not log tokens, signatures, raw payloads, or unnecessary PII.
- Do not allow duplicate or forged events to overwrite previously accepted events.
- Keep webhook ingestion separate from business side effects; process idempotently and durably.

## 6. Phase C — business event handlers

Create event handlers only for event types explicitly approved in the implementation brief or documented by Unit/Stripe. Unknown event types should be safely stored and acknowledged according to the retry policy, without guessed business effects.

For each implemented event type, add:
- schema/fixture based on a genuine documented sample or sanitized captured Sandbox fixture;
- success, invalid input, duplicate, transient failure, and retry tests;
- explicit mapping to internal state;
- audit record and reconciliation behavior;
- clear statement of which effects are read-only versus mutating.

Do not invent onboarding, KYC/KYB, account, transaction, transfer, or payment semantics.

## 7. Phase D — settlement truth and ledger controls

Audit every code path that sets statuses such as `paid`, `settled`, `completed`, or `posted`.

A record may be called externally settled only after durable, independently verifiable provider evidence is stored, including the provider reference/transaction identifier and the relevant provider status. A local database insert, generated invoice, webhook receipt, or internal journal entry alone is not settlement proof.

Preserve existing tables unless a reviewed migration is explicitly approved. If schema changes are needed, propose additive, isolated migrations and document their rollback; do not execute them against remote databases.

Any operation that creates or moves money must remain disabled in this workstream. No automatic settlement or payout side effects.

## 8. Phase E — undocumented Unit endpoints are blockers

### Connected-account lookup
- Search for an existing implementation and tests.
- If absent, add a documented blocker and contract request.
- Do not assume POST, Authorization Bearer, request body, or a response such as `{ "account_id": "acct_..." }`.
- Obtain Unit's written method, headers/authentication, JWT issuer/audience/algorithm expectations, request schema, response schema, error behavior, timeout, and retry contract before implementation.

### Application Prefill and User Management
- Use the official Unit Managed Solutions contract supplied by Unit.
- Do not extrapolate User Management behavior from prefill docs.
- For identity tokens, validate signature, issuer, audience, expiry, and applicable claims using the configured public JWKS/public key. Reject unsupported algorithms and key mismatches.
- Do not store private keys or accept unverified JWT claims.

### Banking Page URL
- Treat it as a user-facing destination, not as a server webhook, unless Unit's exact contract says otherwise.

## 9. Phase F — GitHub Actions

Keep CI deterministic and provider-independent.

### Pull request CI
- Run the repository's existing checks and all new unit/integration tests with mocks and local test databases.
- Add secret scanning and dependency/security checks.
- Use minimal workflow permissions (normally `contents: read`).
- Pin third-party Actions to reviewed immutable versions/SHAs where practical.
- Do not require Unit or Stripe credentials for pull-request CI.
- Do not deploy, run remote migrations, or call live APIs from PR workflows.

### Staging deployment
- Only add a staging deploy if a real staging environment, account IDs, route, and secret store are identified and verified.
- Use a GitHub Environment named `staging` with sandbox-only credentials.
- Run non-mutating health and contract checks after deployment. Any test that creates a customer, account, payment, transfer, or database record must use an isolated test fixture and have explicit cleanup—or be omitted.

### Production deployment
- Use a separate protected GitHub Environment named `production` with required human reviewers.
- Require Unit's written production approval and a verified Production credential/configuration inventory before enabling the job.
- Production secrets must be distinct from Sandbox secrets and injected only at deploy/runtime.
- Never use GitHub Actions as a webhook receiver or payment processor.
- Do not enable an automatic push-to-production trigger.
- Keep the production deployment job disabled or guarded until all go-live gates are satisfied.

## 10. Required tests

At minimum:
- Unit: valid signature; invalid signature; missing signature; body changed after signing; duplicate event ID; missing event ID; handler transient failure; retry then success.
- Stripe: valid signature; invalid signature; stale timestamp; rotated secret; test/live mismatch; connected-account context; duplicate event; handler failure and retry.
- Both: no secret configured; malformed JSON after signature validation; payload size limit; no secret/PII leakage in logs.
- Business logic: each approved event type has deterministic fixture-based tests.
- Settlement: local event/invoice/journal record cannot independently mark external settlement; missing provider proof must block the terminal settled state.

Never call live Unit or Stripe APIs in tests.

## 11. Required deliverables

Open a pull request containing:
1. A concise audit of current routes, Worker bindings, D1 schemas, and workflows.
2. The implemented code and isolated migrations, if justified.
3. Unit and Stripe fixture-based tests with actual test output.
4. CI workflow updates.
5. A secret/binding inventory by name only.
6. A Unit support contract request for all undocumented endpoints and production blockers.
7. A cutover checklist mapping each Unit webhook subscription to one intended receiver.
8. A rollback plan and post-deploy verification plan.
9. A clear list of unresolved blockers and evidence needed to close each one.

The PR must state that no Unit/Stripe settings, production secrets, remote databases, live routes, or money movement were changed.

## 12. Definition of done

The work is complete only when:
- all tests pass in CI;
- Unit and Stripe signature verification is proven by positive and negative tests;
- duplicate event processing is prevented by database constraints;
- business handlers are implemented only against documented event contracts;
- settlement states require external provider proof;
- sandbox and production configuration are explicitly separated;
- undocumented Unit endpoint contracts remain clearly blocked;
- production deployment is protected by human approval and Unit's account-specific go-live approval;
- no production changes have occurred without a separate explicit authorization.

**Agent stop condition:** if a required contract, secret binding, environment identity, repository mapping, or approval is unknown, record the blocker and stop that subtask. Never fill the gap with an assumption.
