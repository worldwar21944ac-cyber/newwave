const HASH_RE = /^[a-f0-9]{64}$/i;

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validMinor(value) {
  return Number.isSafeInteger(value) && value > 0;
}

/** Pure decision gate for independently retrieved Stripe collection evidence. */
export function evaluateCollectionEvidence(evidence = {}) {
  const blockers = [];

  if (evidence.provider !== "stripe") blockers.push("PROVIDER_NOT_STRIPE");
  if (!nonEmpty(evidence.providerObjectId)) blockers.push("PROVIDER_OBJECT_ID_MISSING");
  if (evidence.providerApiRetrieved !== true) blockers.push("PROVIDER_OBJECT_NOT_INDEPENDENTLY_RETRIEVED");

  if (typeof evidence.livemode !== "boolean" ||
      typeof evidence.expectedLivemode !== "boolean" ||
      evidence.livemode !== evidence.expectedLivemode) {
    blockers.push("LIVEMODE_MISMATCH");
  }

  if (!nonEmpty(evidence.expectedAccountId) ||
      !nonEmpty(evidence.accountId) ||
      evidence.accountId !== evidence.expectedAccountId) {
    blockers.push("STRIPE_ACCOUNT_MISMATCH");
  }

  const objectType = String(evidence.providerObjectType || "").toLowerCase();
  const status = String(evidence.providerStatus || "").toLowerCase();
  let actualAmountMinor = null;

  if (objectType === "payment_intent") {
    if (status !== "succeeded") blockers.push("PAYMENT_INTENT_NOT_SUCCEEDED");
    actualAmountMinor = evidence.amountReceivedMinor;
  } else if (objectType === "invoice") {
    if (status !== "paid") blockers.push("INVOICE_NOT_PAID");
    actualAmountMinor = evidence.amountPaidMinor;
  } else {
    blockers.push("UNSUPPORTED_PROVIDER_OBJECT_TYPE");
  }

  if (!validMinor(evidence.expectedAmountMinor)) blockers.push("EXPECTED_AMOUNT_INVALID");
  if (!validMinor(actualAmountMinor)) blockers.push("COLLECTED_AMOUNT_INVALID");
  if (validMinor(evidence.expectedAmountMinor) &&
      validMinor(actualAmountMinor) &&
      actualAmountMinor !== evidence.expectedAmountMinor) {
    blockers.push("COLLECTED_AMOUNT_MISMATCH");
  }

  const expectedCurrency = String(evidence.expectedCurrency || "").toLowerCase();
  const actualCurrency = String(evidence.currency || "").toLowerCase();
  if (!expectedCurrency || !actualCurrency || expectedCurrency !== actualCurrency) {
    blockers.push("CURRENCY_MISMATCH");
  }

  const verified = blockers.length === 0;
  return {
    decision: verified ? "COLLECTED" : "BLOCKED",
    verifiedCollectedMinor: verified ? actualAmountMinor : 0,
    currency: verified ? actualCurrency : null,
    blockers,
  };
}

/** Recognition is separate from collection and requires fulfillment and policy evidence. */
export function evaluateRecognitionEvidence(evidence = {}) {
  const blockers = [];
  const collection = evidence.collection;

  if (collection?.decision !== "COLLECTED" ||
      !validMinor(collection?.verifiedCollectedMinor)) {
    blockers.push("COLLECTION_NOT_VERIFIED");
  }
  if (evidence.fulfillmentVerified !== true) blockers.push("FULFILLMENT_NOT_VERIFIED");
  if (!nonEmpty(evidence.recognitionPolicyRef)) blockers.push("RECOGNITION_POLICY_REFERENCE_MISSING");
  if (!validMinor(evidence.recognizedAmountMinor)) blockers.push("RECOGNIZED_AMOUNT_INVALID");

  if (validMinor(evidence.recognizedAmountMinor) &&
      validMinor(collection?.verifiedCollectedMinor) &&
      evidence.recognizedAmountMinor > collection.verifiedCollectedMinor) {
    blockers.push("RECOGNIZED_AMOUNT_EXCEEDS_COLLECTED");
  }

  const verified = blockers.length === 0;
  return {
    decision: verified ? "RECOGNIZED" : "BLOCKED",
    recognizedAmountMinor: verified ? evidence.recognizedAmountMinor : 0,
    blockers,
  };
}

/**
 * Stripe collection is not bank settlement. Settlement requires a paid payout,
 * an independently matched bank reference and a digest of the bank evidence.
 */
export function evaluateSettlementEvidence(evidence = {}) {
  const blockers = [];
  const collection = evidence.collection;

  if (collection?.decision !== "COLLECTED" ||
      !validMinor(collection?.verifiedCollectedMinor)) {
    blockers.push("COLLECTION_NOT_VERIFIED");
  }
  if (String(evidence.payoutStatus || "").toLowerCase() !== "paid") {
    blockers.push("STRIPE_PAYOUT_NOT_PAID");
  }
  if (!nonEmpty(evidence.payoutId)) blockers.push("STRIPE_PAYOUT_ID_MISSING");
  if (String(evidence.bankReconciliationStatus || "").toUpperCase() !== "MATCH") {
    blockers.push("BANK_RECONCILIATION_NOT_MATCHED");
  }
  if (!nonEmpty(evidence.bankReference)) blockers.push("BANK_REFERENCE_MISSING");
  if (!validMinor(evidence.reconciledAmountMinor)) blockers.push("RECONCILED_AMOUNT_INVALID");
  if (!HASH_RE.test(String(evidence.bankEvidenceSha256 || ""))) {
    blockers.push("BANK_EVIDENCE_HASH_INVALID");
  }

  const verified = blockers.length === 0;
  return {
    decision: verified ? "SETTLED" : "BLOCKED",
    verifiedSettledMinor: verified ? evidence.reconciledAmountMinor : 0,
    blockers,
  };
}
