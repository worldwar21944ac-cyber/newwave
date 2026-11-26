# WP-04 — Attention-to-Asset commercial operating flow

**Purpose:** connect 12 Rounds Media's audience, intellectual property, physical activations and commerce to contracts, fulfillment, collected cash, settlement evidence and retained asset value.

**Implementation scope:** additive application logic and documentation only. This package does not deploy a Worker, change provider settings, enable storage services, apply a remote database migration, create a payment, or move money.

## 1. Business flow

1. **Create attention:** 12 Rounds Media develops and distributes owned media and formats, including LOT 9 and other 12 Rounds properties.
2. **Package commercial inventory:** define sponsor placements, ticketed experiences, merchandise, licensing and production services.
3. **Contract the offer:** record the contracting operator, counterparty, approved price, term, rights granted, deliverables and payment milestones.
4. **Deliver:** capture sponsor activation, ticket attendance, shipment, licensing or production-service evidence.
5. **Collect:** retrieve the actual provider object and verify account, environment, status, amount and currency.
6. **Recognize:** recognize only the amount supported by fulfillment and the applicable accounting policy.
7. **Settle:** reconcile the provider payout to an external bank record and preserve its reference and evidence digest.
8. **Retain value:** connect completed commercial activity to customer relationships, reusable IP, production capacity, software, equipment and other retained assets.

**Audience → Offer → Agreement → Delivery → Collection → Recognition → Settlement → Reinvestment**

Audience and platform analytics are demand evidence. They are not payment evidence. An invoice draft, internal ledger row, webhook receipt, modeled provider ID or completed stress-test run is not, by itself, proof of collection or settlement.

## 2. Business connections

The operating model connects these business functions without collapsing them into one entity:

| Business function | Asset / operating role | WP-04 connection |
|---|---|---|
| 12 Rounds Media and LOT 9 | Media, series, formats, events, sponsor inventory and production services | Commercial offers, contracting workflow and delivery |
| Music publishing administration | Composition rights and licensing | License scope, royalty obligations and publishing evidence |
| Record-label operations | Sound recordings and master-use permissions | Recording-side licensing and rights schedules |
| Consumer brands | Apparel, coffee/food and merchandise | SKU, order, fulfillment and repeat-purchase economics |
| Void Technology Corporation | Software and infrastructure; Ruby OS and Void API Caller are products | Workflow, API, evidence, reconciliation and reporting |
| Holding and trust structures | Governance and asset organization | Separate ownership/distribution treatment under their governing records |

These connections describe the intended operating model. They do not substitute for executed intercompany agreements, rights schedules, trust instruments or ownership records. The operating database is not a legal opinion.

## 3. Existing Cloudflare foundation

The staging environment already contains eight WP-04 tables:

- wp04_entity_ip_boundaries
- wp04_offers
- wp04_agreements
- wp04_fulfillment_deliverables
- wp04_revenue_inflows
- wp04_cost_obligations
- wp04_treasury_reserves
- wp04_provider_verification

Existing entity, execution-run, evidence, policy, intercompany and payment tables provide the supporting control plane. This work deliberately adds no DDL and does not alter existing staging records.

The staging environment has a payment Worker and a scheduled auditor. The payment Worker has D1, Stripe-related bindings, queues and an evidence-storage binding. The auditor has a D1 binding and expected-environment setting; it is not treated as the Stripe provider verifier.

### Evidence storage dependency

The configured evidence-storage binding is not proof that the storage service is available. The current staging account reports that R2 must first be enabled. Until the target bucket is enabled and verified, evidence remains hash-only in D1 or in a separately verified provider source.

## 4. Stripe test-mode baseline

The selected provider context is **test mode only**. No live-mode API reads or writes were used.

The test-mode API read found no PaymentIntents or balance transactions. Draft invoices remain drafts and are excluded from collected revenue. The staging database contains modeled stress-test offers and inflow records, but the provider-verification records show no verified collected or settled amounts. Some modeled ancillary inflows still need corresponding provider-verification records.

The stress-test records are useful for exercising workflow shape, allocation, reserves and reconciliation logic. They are not actual commercial revenue or proof of external payment.

## 5. First commercial pilot

The first end-to-end pilot is deliberately smaller than the stress model:

- one sponsor/brand placement;
- one real SKU from a consumer brand;
- one 12 Rounds ticketed event.

Each pilot needs its own offer, counterparty, contracting operator, approved price, deliverables, fulfillment evidence, provider test object and reconciliation reference. The SKU's supplier and fulfillment path, and the event's final price and terms, must be attached to the relevant offer before the pilot is treated as ready. This specification does not invent prices or counterparties.

The test should prove the same prospect-to-cash path for all three offers without touching production or moving real money.

## 6. State rules

- **COMMITTED:** an offer or agreement exists. This is not cash.
- **COLLECTED:** the provider independently returns a succeeded PaymentIntent or paid invoice, with matching account, mode, amount and currency.
- **RECOGNIZED:** fulfillment is verified and an explicit accounting-policy reference supports the recognized amount.
- **SETTLED:** the provider payout is paid and matched to an external bank reference with a retained evidence digest.

A local RECOGNIZED label, a collection timestamp, a synthetic provider identifier, a draft invoice or a provider-like string in a cost row cannot override provider evidence.

The pure guard in src/wp04/stagingGuard.mjs encodes these transitions. It does not call Stripe, write D1, create invoices, issue refunds or transfer funds. The staging integration must call it only after retrieving the corresponding provider object and must preserve its blockers.

## 7. Division of responsibility

| System | Owns | Does not prove |
|---|---|---|
| Cloudflare D1 / Workers | Workflow state, entity boundaries, deliverables, hashes, audit events, idempotency and reconciliation records | That a provider charge or bank settlement occurred |
| Stripe | PaymentIntent/invoice status, refunds, balance transactions, payouts and provider object IDs | Delivery of a sponsor placement, product shipment or event experience |
| GitHub | Versioned schemas, validation code, tests, review and release history | Live payment, bank settlement or fulfillment |
| Business/operations evidence | Signed agreements, approved rights, delivery records, attendance, shipment and acceptance | Cash collection unless tied to provider records |

The complete record is the join across these systems, with each source retaining its own evidentiary role.

## 8. Release gates

The staging pilot remains held until:

1. The evidence-storage service is enabled and the exact bucket is verified, or an approved alternate evidence store is documented.
2. Provider test-mode account, publishable-key mode and webhook environment are confirmed as one matched configuration.
3. Draft invoices remain excluded from collected revenue; any new test offer uses an explicitly approved small test amount.
4. Synthetic event identifiers are replaced by actual provider test objects retrieved from the selected test account.
5. Modeled ancillary inflows receive provider-verification records.
6. Bank settlement is demonstrated with an actual provider payout and a matched external bank reference.
7. The first brand placement, SKU and ticketed event each pass prospect → agreement → delivery → collection → reconciliation.

The master register and one small end-to-end test come before a multi-city route.

## 9. Change boundary

This GitHub package adds an independently testable evidence gate and operating documentation. It does not:

- apply or create a remote D1 migration;
- modify any existing WP-04 table or staging record;
- enable evidence storage or change Worker bindings/secrets;
- read or print secret values;
- create provider customers, invoices, PaymentIntents, refunds, transfers or payouts;
- deploy a Worker or change a production route;
- mark any staged amount as collected, recognized or settled.

The next implementation step after review is to wire the tested guard into the version-controlled source for the staging payment Worker and exercise it with genuine provider test objects. That Worker source must be versioned in an appropriately private repository before it is changed or deployed.
