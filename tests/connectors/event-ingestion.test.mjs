import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeProviderEvent,
  providerEventDedupeKey,
  toBillableUsage,
} from "../../src/connectors/event-ingestion.mjs";

const base = {
  signatureVerified: true,
  signatureScheme: "provider-hmac-sha256",
  signatureKeyVersion: "test-key-v1",
  provider: "carrier-adapter",
  providerAccountRef: "carrier-account-test",
  tenantId: "tenant-test",
  environment: "staging",
  providerEventId: "evt-1001",
  eventType: "telecom.sms.delivered",
  occurredAt: "2026-11-26T12:00:00Z",
  receivedAt: "2026-11-26T12:00:02Z",
  resourceRef: "message-test-1",
  usage: { metric: "sms_segments", quantity: 2, unit: "segment", billable: true },
  data: { deliveryStatus: "delivered" },
};

test("rejects webhook events that have not passed provider signature verification", () => {
  assert.throws(() => normalizeProviderEvent({ ...base, signatureVerified: false }),
    /WEBHOOK_SIGNATURE_NOT_VERIFIED/);
});

test("normalizes a verified provider event into the shared envelope", () => {
  const event = normalizeProviderEvent(base);
  assert.equal(event.schema_version, "1.0");
  assert.equal(event.signature_verified, true);
  assert.equal(event.event_type, "telecom.sms.delivered");
  assert.equal(event.usage.quantity, 2);
});

test("dedupe scope includes provider and provider account", () => {
  const event = normalizeProviderEvent(base);
  assert.equal(providerEventDedupeKey(event),
    "carrier-adapter:carrier-account-test:evt-1001");
});

test("rejects malformed event timestamps and unsupported usage metrics", () => {
  assert.throws(() => normalizeProviderEvent({ ...base, occurredAt: "not-a-date" }),
    /EVENT_TIMESTAMP_INVALID/);
  assert.throws(() => normalizeProviderEvent({
    ...base, usage: { metric: "made_up", quantity: 1, unit: "x", billable: true },
  }), /USAGE_METRIC_UNSUPPORTED/);
});

test("does not bill non-billable events", () => {
  const event = normalizeProviderEvent({
    ...base, usage: { ...base.usage, billable: false },
  });
  assert.equal(toBillableUsage(event, {
    status: "active",
    stripeCustomerId: "cus_test",
    enabledMetrics: ["sms_segments"],
    usageIdFactory: () => "usage-1001",
  }), null);
});

test("billable usage requires active subscription and explicit metric enablement", () => {
  const event = normalizeProviderEvent(base);
  assert.throws(() => toBillableUsage(event, {
    status: "past_due",
    stripeCustomerId: "cus_test",
    enabledMetrics: ["sms_segments"],
    usageIdFactory: () => "usage-1001",
  }), /SUBSCRIPTION_NOT_ACTIVE/);
  assert.throws(() => toBillableUsage(event, {
    status: "active",
    stripeCustomerId: "cus_test",
    enabledMetrics: [],
    usageIdFactory: () => "usage-1001",
  }), /USAGE_METRIC_NOT_ENABLED/);
});

test("creates one usage record for an eligible verified event", () => {
  const event = normalizeProviderEvent(base);
  const usage = toBillableUsage(event, {
    status: "active",
    stripeCustomerId: "cus_test",
    enabledMetrics: ["sms_segments"],
    usageIdFactory: () => "usage-1001",
  });
  assert.equal(usage.usage_id, "usage-1001");
  assert.equal(usage.quantity, 2);
  assert.equal(usage.provider_event_id, "evt-1001");
});
