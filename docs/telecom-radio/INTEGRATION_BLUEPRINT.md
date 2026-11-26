# Telecom + Radio API Event Mesh

**Status:** staging implementation blueprint; provider adapters remain disabled until each vendor's official webhook contract and test credentials are verified.

## System roles

- **Cloudflare Workers**: authenticated API gateway and provider webhook ingress.
- **Cloudflare Queues / Workflows**: asynchronous delivery, retry, backoff and dead-letter handling.
- **D1**: connector registry, tenant/provider account mapping, idempotency ledger, usage ledger and audit state.
- **R2**: optional immutable raw-payload evidence. The current staging environment has reported R2 unavailable; do not claim durable object storage until a bucket is enabled and verified. Hash-only evidence is not a substitute for a retained payload.
- **Stripe Billing**: customer, product/price, subscription, invoice, meter and payment lifecycle. Sandbox only until separately approved.
- **GitHub**: versioned provider contracts, adapters, test fixtures, schema validation, CI and reviewed releases.

## Common flow

1. Provider sends a webhook to `POST /v1/webhooks/{provider}/{providerAccount}`.
2. Gateway resolves the tenant and provider account from a server-side registry; never trust tenant IDs supplied in an unsigned body.
3. Adapter captures the **raw request bytes** and verifies the provider-specific signature/authentication scheme, timestamp tolerance and key version before parsing.
4. Adapter extracts the provider's stable event ID and maps the event to the common envelope in `schemas/telecom-radio-event.schema.json`.
5. D1 atomically inserts the provider event under a unique key: `(provider, provider_account_ref, provider_event_id)`. Duplicate deliveries return an acknowledged duplicate result and do not create a second usage record.
6. Verified events are queued. Queue consumers are at-least-once and must repeat the idempotency check before side effects.
7. A normalized event may create a usage-ledger row only when its mapping is explicitly marked billable, its tenant and subscription are active, and the event has passed signature, schema, timestamp and deduplication checks.
8. Usage is aggregated by tenant, Stripe customer, meter and billing period. Stripe meter events are emitted with stable identifiers; retries reuse the same identifier. The usage ledger remains the source for reconciliation.
9. Stripe webhooks are independently signature-verified and deduplicated. `invoice.paid` means the invoice is paid; it does not prove a payout reached a bank.
10. GitHub CI tests schemas, adapters, replay behavior and billing calculations. Release to staging is a reviewed action; production remains a separate gate.

## Provider families to support

| Family | Event classes | Notes |
|---|---|---|
| Carrier / telecom | account state, service activation, service suspension, number port status, outage/restoration, usage/CDR batches | Provider-specific account identifiers must map to internal tenant IDs. |
| SMS / MMS | accepted, delivered, failed, inbound message, segment count | Bill by provider-confirmed billable segments, not webhook attempts. |
| Voice / SIP / PBX | call started/ended, duration, disposition, trunk registration, trunk outage | Use provider-rated duration and call IDs; reconcile late CDRs and corrections. |
| Radio automation / playout | schedule changes, media item played, playout failure, station status | A playout log is operational evidence, not proof of audience reach or advertising revenue. |
| Broadcast / transmitter | transmitter state, power/temperature alarms, site alarms, RF telemetry | Telemetry can trigger alerts/tickets; it must not independently command RF power or transmission state. |
| STL / microwave / network links | link up/down, latency, packet loss, path failover, equipment alarm | Normalize units and preserve source timestamps and device identity. |
| EAS / public-safety alert logging | received alert, test, operator acknowledgement, termination | Preserve official logs. Webhooks may notify and record; they must not originate or retransmit alerts without the authorized broadcast control workflow. |

No provider is marked active until its actual vendor, API version, signature format, event ID semantics, retry policy, rate limits, data-retention rules and sandbox endpoint have been documented and tested. This blueprint does not invent carrier or broadcast-vendor credentials.

## Billing rules

- Separate platform subscription fees from metered usage.
- Suggested meter dimensions: `api_requests`, `sms_segments`, `voice_seconds`, `radio_playout_events`, `telemetry_events`, and `storage_bytes`. Activate only dimensions with a verified source and approved pricing.
- Count a billable event once, after verification and deduplication. Do not bill retries, malformed events, failed signature checks, replayed duplicates or internal health checks.
- Corrections and reversals must be explicit adjustment records linked to the original usage event; never silently rewrite historical usage.
- Use a stable Stripe meter-event identifier derived from the internal usage-ledger ID. Keep the provider event ID and internal usage ID for reconciliation.
- Do not create Stripe prices, subscriptions, invoices or charges until the commercial rate card, billing interval, included quota, overage treatment, currency and tax treatment are approved.
- Distinguish `USAGE_RECORDED`, `METER_EVENT_SUBMITTED`, `INVOICE_FINALIZED`, `PAYMENT_COLLECTED`, and `PAYOUT_SETTLED`. These are not interchangeable.

## Security and reliability requirements

- Verify signatures over the untouched raw body before JSON parsing.
- Support provider-specific HMAC, asymmetric signatures, signed timestamps, mTLS or OAuth only as documented by that provider. Never assume every provider uses the same scheme.
- Keep secrets in Cloudflare secrets/secret stores, never in GitHub source, D1 plaintext, logs or fixtures.
- Enforce tenant isolation, provider-account binding, timestamp tolerance, payload size limits and allowlisted event types.
- Use unique constraints and transactional writes for event receipt and usage-ledger creation.
- Queue retries use exponential backoff with bounded attempts; terminal failures enter a dead-letter queue and alert operations.
- Provide replay tooling that reprocesses retained evidence without creating duplicate usage or billing.
- Redact message bodies, phone numbers, subscriber identifiers and location data from routine logs. Apply retention limits to call-detail records and message metadata.
- Require operator authorization for radio-control actions. This event mesh is an ingestion, monitoring and billing layer, not an autonomous transmitter controller.

## Staging gates

1. Verify Cloudflare account, Worker source, D1 schema, queue bindings and environment names.
2. Verify the Stripe **Bervashun Trust sandbox** context and use test-mode objects only.
3. Implement one adapter at a time from the actual provider's official docs; start with a provider test fixture and signed webhook.
4. Test duplicate delivery, out-of-order delivery, invalid signatures, stale timestamps, key rotation, provider outage, queue retry, dead-letter replay and meter idempotency.
5. Reconcile internal usage totals to Stripe meter summaries and invoice line items.
6. Keep production routes, live Stripe, money movement, radio transmission controls and provider account settings unchanged until their separate approvals.

## Current integration boundary

The repository's WP-04 PR #12 contains a pure collection/recognition/settlement evidence guard and tests. It is not a deployed telecom/radio adapter and does not yet connect the payment Worker to provider webhooks. This blueprint is additive documentation and schema/code foundation only; it does not claim a live connection.
