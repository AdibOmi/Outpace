// ─── emailApi.js ─────────────────────────────────────────────────────────────
// Delivers outreach according to the playbook's delivery mode:
//   simulate — nothing is sent (default, safe for demos)
//   test     — every email goes to config.testRecipient instead of the prospect
//   live     — email goes to the prospect's real address
// Sending happens through the FastAPI backend's SMTP sender.

export const DELIVERY_MODES = ["simulate", "test", "live"];

const SIMULATED_SEND_DELAY_MS = 600;

// Returns { delivery, deliveredTo, messageId }. Throws on any send failure so
// the caller can mark the account as errored.
export async function deliverEmail(config, { to, subject, body, inReplyTo }) {
  const mode = config.deliveryMode || "simulate";

  if (mode === "simulate") {
    await new Promise((resolve) => window.setTimeout(resolve, SIMULATED_SEND_DELAY_MS));
    return { delivery: "simulated", deliveredTo: to, messageId: null };
  }

  const recipient = mode === "test" ? config.testRecipient?.trim() : to?.trim();

  if (!recipient) {
    throw new Error(
      mode === "test"
        ? "Test mode is on but no test inbox is set in Playbook setup"
        : "Account has no email address"
    );
  }

  let res;
  try {
    res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: recipient,
        // Make test sends easy to tell apart from real outreach.
        subject: mode === "test" ? `[TEST → ${to || "no address"}] ${subject}` : subject,
        body,
        senderName: config.senderName?.split(",")[0].trim() || null,
        inReplyTo: inReplyTo || null,
      }),
    });
  } catch {
    throw new Error("Backend is not reachable — start it with `uvicorn main:app --reload`");
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.detail || `Email send failed (${res.status})`);
  }

  return { delivery: mode, deliveredTo: recipient, messageId: data.messageId };
}
