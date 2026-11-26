import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateCollectionEvidence,
  evaluateRecognitionEvidence,
  evaluateSettlementEvidence,
} from "../../src/wp04/stagingGuard.mjs";

const validPayment = {
  provider: "stripe",
  providerObjectType: "payment_intent",
  providerObjectId: "pi_test_real_001",
  providerApiRetrieved: true,
  providerStatus: "succeeded",
  accountId: "acct_test_001",
  expectedAccountId: "acct_test_001",
  livemode: false,
  expectedLivemode: false,
  amountReceivedMinor: 2400,
  expectedAmountMinor: 2400,
  currency: "usd",
  expectedCurrency: "usd",
};

test("a draft invoice cannot be counted as collected", () => {
  const result = evaluateCollectionEvidence({
    ...validPayment,
    providerObjectType: "invoice",
    providerObjectId: "in_test_draft_001",
    providerStatus: "draft",
    amountPaidMinor: 0,
  });
  assert.equal(result.decision, "BLOCKED");
  assert.equal(result.verifiedCollectedMinor, 0);
  assert.ok(result.blockers.includes("INVOICE_NOT_PAID"));
});

test("a synthetic or locally modeled object cannot be counted as collected", () => {
  const result = evaluateCollectionEvidence({
    ...validPayment,
    providerObjectId: "pi_stress_10m_evt_01",
    providerApiRetrieved: false,
  });
  assert.equal(result.decision, "BLOCKED");
  assert.ok(result.blockers.includes("PROVIDER_OBJECT_NOT_INDEPENDENTLY_RETRIEVED"));
});

test("test/live mismatch blocks collection", () => {
  const result = evaluateCollectionEvidence({ ...validPayment, livemode: true });
  assert.equal(result.decision, "BLOCKED");
  assert.ok(result.blockers.includes("LIVEMODE_MISMATCH"));
});

test("Stripe account mismatch blocks collection", () => {
  const result = evaluateCollectionEvidence({ ...validPayment, accountId: "acct_other" });
  assert.equal(result.decision, "BLOCKED");
  assert.ok(result.blockers.includes("STRIPE_ACCOUNT_MISMATCH"));
});

test("amount or currency mismatch blocks collection", () => {
  const result = evaluateCollectionEvidence({
    ...validPayment,
    amountReceivedMinor: 2399,
    currency: "eur",
  });
  assert.equal(result.decision, "BLOCKED");
  assert.ok(result.blockers.includes("COLLECTED_AMOUNT_MISMATCH"));
  assert.ok(result.blockers.includes("CURRENCY_MISMATCH"));
});

test("a retrieved, succeeded PaymentIntent with matching account, mode and amount is collected", () => {
  const result = evaluateCollectionEvidence(validPayment);
  assert.equal(result.decision, "COLLECTED");
  assert.equal(result.verifiedCollectedMinor, 2400);
  assert.deepEqual(result.blockers, []);
});

test("recognition requires verified collection, fulfillment and a policy reference", () => {
  const collection = evaluateCollectionEvidence(validPayment);
  const blocked = evaluateRecognitionEvidence({
    collection,
    fulfillmentVerified: false,
    recognitionPolicyRef: "",
    recognizedAmountMinor: 2400,
  });
  assert.equal(blocked.decision, "BLOCKED");
  assert.ok(blocked.blockers.includes("FULFILLMENT_NOT_VERIFIED"));
  assert.ok(blocked.blockers.includes("RECOGNITION_POLICY_REFERENCE_MISSING"));

  const accepted = evaluateRecognitionEvidence({
    collection,
    fulfillmentVerified: true,
    recognitionPolicyRef: "POLICY-REVREC-001",
    recognizedAmountMinor: 2400,
  });
  assert.equal(accepted.decision, "RECOGNIZED");
  assert.equal(accepted.recognizedAmountMinor, 2400);
});

test("Stripe collection alone is not bank settlement", () => {
  const collection = evaluateCollectionEvidence(validPayment);
  const result = evaluateSettlementEvidence({ collection });
  assert.equal(result.decision, "BLOCKED");
  assert.ok(result.blockers.includes("STRIPE_PAYOUT_NOT_PAID"));
  assert.ok(result.blockers.includes("BANK_RECONCILIATION_NOT_MATCHED"));
});

test("settlement requires a paid payout and matched bank evidence", () => {
  const collection = evaluateCollectionEvidence(validPayment);
  const result = evaluateSettlementEvidence({
    collection,
    payoutStatus: "paid",
    payoutId: "po_test_001",
    bankReconciliationStatus: "MATCH",
    bankReference: "bank-trace-001",
    reconciledAmountMinor: 2375,
    bankEvidenceSha256: "a".repeat(64),
  });
  assert.equal(result.decision, "SETTLED");
  assert.equal(result.verifiedSettledMinor, 2375);
  assert.deepEqual(result.blockers, []);
});
