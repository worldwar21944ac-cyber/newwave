const STRIPE_METER_EVENTS_URL = "https://api.stripe.com/v1/billing/meter_events";

function required(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} is required`);
  }
  return value.trim();
}

/** Build Stripe's form-encoded Billing Meter Event request. */
export function buildStripeMeterEvent({ eventName, identifier, customerId, quantity, timestamp }) {
  const name = required(eventName, "eventName");
  const id = required(identifier, "identifier");
  const customer = required(customerId, "customerId");
  if (!/^[a-zA-Z0-9_]{1,100}$/.test(name)) throw new Error("METER_EVENT_NAME_INVALID");
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("METER_QUANTITY_INVALID");
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0) throw new Error("METER_TIMESTAMP_INVALID");

  const form = new URLSearchParams();
  form.set("event_name", name);
  form.set("identifier", id);
  form.set("timestamp", String(timestamp));
  form.set("payload[stripe_customer_id]", customer);
  form.set("payload[value]", String(quantity));
  return form;
}

/**
 * Sends only to Stripe test mode. Caller must first persist the usage row and
 * retry with the same identifier; Stripe meter aggregation is asynchronous.
 */
export async function submitStripeMeterEvent({
  secretKey,
  eventName,
  identifier,
  customerId,
  quantity,
  timestamp,
  fetchImpl = fetch,
}) {
  if (typeof secretKey !== "string" || !secretKey.startsWith("sk_test_")) {
    throw new Error("STRIPE_TEST_SECRET_REQUIRED");
  }
  const form = buildStripeMeterEvent({ eventName, identifier, customerId, quantity, timestamp });
  const response = await fetchImpl(STRIPE_METER_EVENTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = payload?.error?.code || "STRIPE_METER_EVENT_FAILED";
    throw new Error(`${code}:${response.status}`);
  }
  return payload;
}
