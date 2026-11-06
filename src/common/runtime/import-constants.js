// Persisted on the event row before an external billing request is sent.
// Do not retry an event with this marker without reconciling the billing log.
const BILLING_CLAIM_MESSAGE = "Billing reconciliation required";

module.exports = { BILLING_CLAIM_MESSAGE };
