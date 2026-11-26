const EVENT_TYPE_RE = /^[a-z][a-z0-9_.-]{1,119}$/;
const USAGE_METRICS = new Set([
  "api_requests",
  "sms_segments",
  "voice_seconds",
  "radio_playout_events",
  "telemetry_events",
  "storage_bytes",
]);

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} is required`);
  }
  return value.trim();
}

/**
 * Provider adapters must verify the untouched raw body before calling this.
 * This function intentionally refuses unverified events; signature algorithms
 * differ by provider and belong in each provider-specific adapter.
 */
export function normalizeProviderEvent(input = {}) {
  if (input.signatureVerified !== true) {
    throw new Error("WEBHOOK_SIGNATURE_NOT_VERIFIED");
  }
  if (!USAGE_METRICS.has(input.usage?.metric)) {
    if (input.usage != null) throw new Error("USAGE_METRIC_UNSUPPORTED");
  }
  if (input.usage != null &&
      (!Number.isFinite(input.usage.quantity) || input.usage.quantity <= 0)) {
    throw new Error("USAGE_QUANTITY_INVALID");
  }

  const eventType = requiredString(input.eventType, "eventType");
  if (!EVENT_TYPE_RE.test(eventType)) throw new Error("EVENT_TYPE_INVALID");

  const occurredAt = new Date(input.occurredAt);
  if (!Number.isFinite(occurredAt.getTime())) throw new Error("EVENT_TIMESTAMP_INVALID");

  const receivedAt = input.receivedAt ? new Date(input.receivedAt) : new Date();
  if (!Number.isFinite(receivedAt.getTime())) throw new Error("RECEIVED_TIMESTAMP_INVALID");

  return Object.freeze({
    schema_version: "1.0",
    event_id: requiredString(input.providerEventId, "providerEventId"),
    provider: requiredString(input.provider, "provider"),
    provider_account_ref: requiredString(input.providerAccountRef, "providerAccountRef"),
    tenant_id: requiredString(input.tenantId, "tenantId"),
    environment: requiredString(input.environment, "environment"),
    event_type: eventType,
    occurred_at: occurredAt.toISOString(),
    received_at: receivedAt.toISOString(),
    signature_verified: true,
    signature_scheme: requiredString(input.signatureScheme, "signatureScheme"),
    signature_key_version: input.signatureKeyVersion ?? "",
    correlation_id: input.correlationId ?? "",
    resource_ref: input.resourceRef ?? "",
    ...(input.usage ? {
      usage: {
        metric: input.usage.metric,
        quantity: input.usage.quantity,
        unit: requiredString(input.usage.unit, "usage.unit"),
        billable: input.usage.billable === true,
        billing_reason: input.usage.billingReason ?? "",
      },
    } : {}),
    data: input.data && typeof input.data === "object" && !Array.isArray(input.data)
      ? input.data
      : {},
  });
}

/** Stable idempotency scope for provider event receipt and downstream effects. */
export function providerEventDedupeKey(event) {
  return [
    requiredString(event.provider, "provider"),
    requiredString(event.provider_account_ref, "provider_account_ref"),
    requiredString(event.event_id, "event_id"),
  ].join(":");
}

/**
 * A verified event is not automatically billable. A tenant subscription,
 * explicit metric mapping and billable flag are required before writing usage.
 */
export function toBillableUsage(event, subscription = {}) {
  if (event?.signature_verified !== true) throw new Error("EVENT_NOT_VERIFIED");
  if (event?.usage?.billable !== true) return null;
  if (subscription.status !== "active") throw new Error("SUBSCRIPTION_NOT_ACTIVE");
  if (!subscription.stripeCustomerId) throw new Error("STRIPE_CUSTOMER_NOT_MAPPED");
  if (!subscription.enabledMetrics?.includes(event.usage.metric)) {
    throw new Error("USAGE_METRIC_NOT_ENABLED");
  }
  return Object.freeze({
    usage_id: requiredString(subscription.usageIdFactory?.(event) ?? "", "usage_id"),
    tenant_id: event.tenant_id,
    stripe_customer_id: subscription.stripeCustomerId,
    metric: event.usage.metric,
    quantity: event.usage.quantity,
    unit: event.usage.unit,
    provider: event.provider,
    provider_event_id: event.event_id,
    occurred_at: event.occurred_at,
  });
}
