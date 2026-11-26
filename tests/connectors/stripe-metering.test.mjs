import test from "node:test";
import assert from "node:assert/strict";
import {
  buildStripeMeterEvent,
  submitStripeMeterEvent,
} from "../../src/connectors/stripe-metering.mjs";

const input = {
  eventName: "sms_segments",
  identifier: "usage_01HZX4J8M7Q2",
  customerId: "cus_test_123",
  quantity: 3,
  timestamp: 1795694400,
};

test("builds a Stripe Billing Meter Event with a stable usage identifier", () => {
  const form = buildStripeMeterEvent(input);
  assert.equal(form.get("event_name"), "sms_segments");
  assert.equal(form.get("identifier"), input.identifier);
  assert.equal(form.get("payload[stripe_customer_id]"), input.customerId);
  assert.equal(form.get("payload[value]"), "3");
});

test("rejects invalid meter data", () => {
  assert.throws(() => buildStripeMeterEvent({ ...input, quantity: 0 }),
    /METER_QUANTITY_INVALID/);
  assert.throws(() => buildStripeMeterEvent({ ...input, timestamp: 1.5 }),
    /METER_TIMESTAMP_INVALID/);
});

test("refuses live Stripe secret keys", async () => {
  await assert.rejects(() => submitStripeMeterEvent({
    ...input,
    secretKey: "sk_live_not_allowed",
    fetchImpl: async () => { throw new Error("fetch_must_not_run"); },
  }), /STRIPE_TEST_SECRET_REQUIRED/);
});

test("submits usage to Stripe with the stable identifier and test key", async () => {
  let request;
  const result = await submitStripeMeterEvent({
    ...input,
    secretKey: "sk_test_example",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ id: "mevt_test_123", livemode: false }) };
    },
  });
  assert.equal(request.url, "https://api.stripe.com/v1/billing/meter_events");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.headers.Authorization, "Bearer sk_test_example");
  assert.equal(new URLSearchParams(request.options.body).get("identifier"), input.identifier);
  assert.equal(result.livemode, false);
});
