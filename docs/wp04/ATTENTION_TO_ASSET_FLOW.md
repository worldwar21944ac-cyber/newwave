# WP-04 — Attention-to-Asset commercial operating flow

**Purpose:** connect 12 Rounds Media's audience, IP, physical activations and commerce to contracts, fulfillment, collected cash, settlement evidence and retained asset value.

**Implementation scope:** additive application logic and documentation only. This package does not deploy a Worker, change Stripe settings, enable R2, apply a D1 migration, create a payment, or move money.

## 1. Business flow

The operating sequence is:

1. **Create attention:** 12 Rounds Media develops and distributes its owned media and formats, including LOT 9 and other 12 Rounds properties.
2. **Package commercial inventory:** sell defined sponsor placements, ticketed experiences, merchandise, licensing and production services.
3. **Contract the offer:** record the contracting entity, counterparty, price, term, rights granted, deliverables and payment milestones.
4. **Deliver:** capture sponsor activation, ticket attendance, shipment, licensing or production-service evidence.
5. **Collect:** retrieve the actual Stripe object and verify account, environment, status, amount and currency.
6. **Recognize:** recognize only the amount supported by fulfillment and the applicable accounting policy.
7. **Settle:** reconcile the Stripe payout to an external bank record and preserve its reference and evidence digest.
8. **Retain value:** connect the completed commercial activity to customer relationships, reusable IP, production capacity, software, equipment and other retained assets.

The commercial loop is:

**Audience → Offer → Agreement → Delivery → Collection → Recognition → Settlement → Reinvestment**

Audience and platform analytics are demand evidence. They are not payment evidence. An invoice draft, internal ledger row, webhook receipt, modeled provider ID or completed stress-test run is not, by itself, proof of collection or settlement.

## 2. Business and entity connections

The current WP-04 staging model places the sponsor, core event and ancillary merchandise/licensing offers under 12RM_OPCO (12 Rounds Media LLC). The entity/IP boundary table keeps founder equity, IP transfer, AI-training rights and creative control unencumbered by default.

The broader business-plan alignment is:

| Business function | Business asset / operating role | WP-04 connection |
|---|---|---|
| 12 Rounds Media | Media, series, formats, events, sponsor inventory and production services | Offer owner, contracting operator, delivery owner |
| Knockout Universal Music Publishing | Composition/publishing rights and licensing administration | License scope, royalty obligation and publishing payment evidence |
| Knockout Universal Music Records | Sound-recording and label operations | Master-use permissions and recording-side licensing |
| Bervashun Couture | Apparel and brand commerce | Merchandise SKU, order, fulfillment and customer value |
| Sweetheart Breads / Family Crest Bread | Consumer packaged-goods brand | Product SKU, order, fulfillment and repeat-purchase economics |
| Void Technology Corporation | Technology company; Ruby OS and Void API Caller are products | Workflow, API, evidence, reconciliation and reporting infrastructure |
| Bervashun Holdings International | Holding-company layer | Entity-level governance and asset organization, subject to its governing records |
| Bervashun Trust | Trust structure | Trust-level ownership/distribution treatment, subject to its governing instrument |

These roles connect the business plan; they do not substitute for executed intercompany agreements, rights schedules, trust instruments or ownership records. The staging entity map is an operating configuration, not a legal opinion.

## 3. Existing Cloudflare foundation

The staging database is knockout-connect-staging-db (c14e931b-c9e1-434e-b062-bf9ba9f58d54) in the Cloudflare account that hosts the WP-04 staging Workers.

It already contains eight WP-04 tables:

- wp04_entity_ip_boundaries
- wp04_offers
- wp04_agreements
- wp04_fulfillment_deliverables
- wp04_revenue_inflows
- wp04_cost_obligations
- wp04_treasury_reserves
- wp04_provider_verification

The existing entity, execution-run, evidence, policy, intercompany and payment tables remain the supporting control plane. This work deliberately adds no DDL and does not alter the existing tables.

Relevant Workers already present include knockout-connect-staging and bervashun-autonomous-auditor-staging. The connection inventory shows the connect Worker has D1, Stripe-related bindings, queues and an R2 bucket binding. The auditor Worker has a D1 binding and expected-livemode setting; it is not treated as the Stripe provider verifier.

### Evidence storage dependency

The Cloudflare R2 bucket-list API currently returns error 10042 ("Please enable R2 through the Cloudflare Dashboard"). Until R2 is enabled and the target bucket is verified, evidence remains hash-only in D1 or in a separately verified provider source. A configured Worker binding is not proof that the bucket is available.

## 4. Stripe test-mode baseline

The selected WP-04 Stripe context is acct_1Sd0V1LO4xj7mkhW in **test mode** (livemode=false). The same account context is also exposed in live mode; this work uses test mode only.

The test-mode API read returned:

- 0 PaymentIntents
- 0 Stripe balance transactions
- 2 draft invoices, each for $750,000, associated with the sponsor stress-test tranches

The draft invoices are not collections. No live-mode API reads or writes were used.

The D1 stress model contains three active offer categories with modeled totals of $1.5M sponsor advances, $7M core event ticketing/VIP and $1.5M ancillary merchandise/licensing. Its inflow rows include historical-looking timestamps and RECOGNIZED lifecycle labels, but the current provider-verification rows show two draft sponsor invoices and eight synthetic event references, with zero verified collected and zero verified settled amounts. The ancillary inflows do not yet have corresponding provider-verification rows in that table.

The stress-test records are useful for exercising workflow shape, allocation, reserves and reconciliation logic. They are not actual commercial revenue or proof of external payment.

## 5. Commercial test to run next

The first end-to-end pilot is deliberately smaller than the $10M stress model:

- one sponsor/brand placement;
- one real SKU from a Bervashun brand;
- one 12 Rounds ticketed event.

Each pilot must have its own offer, counterparty, contracting entity, approved price, deliverables, fulfillment evidence, Stripe test object and reconciliation reference. The SKU's supplier and fulfillment path, and the event's final price/terms, must be attached to the relevant offer before the pilot is treated as ready. No amount is invented by this specification.

The test should prove the same prospect-to-cash path for all three offers without touching production or moving real money.

## 6. State rules

- **COMMITTED:** an offer/agreement exists. This is not cash.
- **COLLECTED:** Stripe independently returns a succeeded PaymentIntent or paid invoice, with matching account, mode, amount and currency.
- **RECOGNIZED:** fulfillment is verified and an explicit accounting-policy reference supports the recognized amount.
- **SETTLED:** Stripe payout is paid and the payout is matched to an external bank reference with a retained evidence digest.

A local lifecycle_state='RECOGNIZED', a collected_at timestamp, a synthetic pi_* identifier, a draft invoice, or a provider-like string in a cost row cannot override provider evidence.

The new pure guard in src/wp04/stagingGuard.mjs encodes these transitions. It is intentionally a decision function: it does not call Stripe, write D1, create invoices, issue refunds, or transfer funds. The staging Worker integration must call it only after retrieving the corresponding provider object and must preserve the returned blockers.

## 7. Division of responsibility

| System | Owns | Does not prove |
|---|---|---|
| Cloudflare D1 / Workers | Workflow state, entity boundaries, deliverables, hashes, audit events, idempotency and reconciliation records | That a Stripe charge or bank settlement occurred |
| Stripe | PaymentIntent/invoice status, refunds, balance transactions, payouts and provider object IDs | Delivery of a sponsor placement, merchandise shipment or event experience |
| GitHub | Versioned schemas, validation code, tests, review and release history | Live payment, bank settlement or fulfillment |
| Business/operations evidence | Signed agreements, approved rights, delivery records, attendance, shipment and acceptance | Cash collection unless tied to provider records |

The complete record is the join across these systems, with each source retaining its own evidentiary role.

## 8. Release gates

The staging pilot remains held until these items are closed:

1. R2 is enabled and the exact evidence bucket is verified, or an approved alternate evidence store is documented.
2. Stripe test-mode account, publishable-key mode and webhook environment are confirmed as one matched configuration. The current pk_test prefix and STRIPE_EXPECT_LIVEMODE=false are mode-consistent; exact key/account parity remains a separate verification item.
3. The sponsor draft invoices are either kept as drafts or replaced by an explicitly approved, small test offer. They are not counted as collected.
4. Synthetic event IDs are replaced by actual Stripe test objects retrieved from the selected test account.
5. The ancillary inflows receive provider-verification records.
6. Bank settlement is demonstrated with an actual payout and a matched external bank reference.
7. The first brand placement, SKU and ticketed event each pass prospect → agreement → delivery → collection → reconciliation.

No four-city route is part of this first gate. The master register and one small end-to-end test come first.

## 9. Change boundary

This GitHub package adds an independently testable evidence gate and operating documentation. It does not:

- apply or create a remote D1 migration;
- modify any existing WP-04 table or staging record;
- enable R2 or change Worker bindings/secrets;
- read or print secret values;
- create Stripe customers, invoices, PaymentIntents, refunds, transfers or payouts;
- deploy a Worker or change a production route;
- mark any staged amount as collected, recognized or settled.

The next implementation step after this PR is reviewed is to wire the pure guard into the actual knockout-connect-staging Worker source and exercise it with genuine Stripe test objects. That Worker source must be versioned in GitHub before it is changed or deployed.
