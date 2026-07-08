// ─── cadence.js ─────────────────────────────────────────────────────────────
// Follow-up cadence math. A cadence is a list of day-offsets between touches,
// e.g. [3, 7, 14] means: follow up 3 days after the initial email, then 7
// days after that, then 14 days after that (the final touch).

export const DEFAULT_CADENCE_STEPS = [3, 7, 14];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Returns the Date the next follow-up (at `stepIndex`, 0-based) is due,
// counting forward from `fromDate`.
export function computeNextFollowUpDate(fromDate, stepIndex, cadenceSteps) {
  const days = cadenceSteps[stepIndex] ?? 0;
  return new Date(new Date(fromDate).getTime() + days * MS_PER_DAY);
}

// Whether an account's next follow-up is due to be sent.
export function isFollowUpDue(account, cadenceSteps, now = new Date()) {
  return (
    account.cadenceState === "active" &&
    !!account.nextFollowUpAt &&
    account.cadenceStep < cadenceSteps.length &&
    new Date(account.nextFollowUpAt) <= now
  );
}

// Parses a "3,7,14" style string into a validated array of positive integers.
// Returns DEFAULT_CADENCE_STEPS if the input doesn't yield at least one step.
export function parseCadenceSteps(text) {
  const steps = String(text ?? "")
    .split(",")
    .map((part) => parseInt(part.trim(), 10))
    .filter((n) => Number.isInteger(n) && n > 0);

  return steps.length > 0 ? steps : DEFAULT_CADENCE_STEPS;
}
