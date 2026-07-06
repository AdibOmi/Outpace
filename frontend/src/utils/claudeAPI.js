// ─── claudeApi.js ────────────────────────────────────────────────────────────
// Centralises all calls to the Claude API (or the mock during development).
// To switch to the real backend, comment out `callClaude` below and
// uncomment the real implementation underneath it.

// ── MOCK (development / demo) ────────────────────────────────────────────────
// Simulates a 1.2-second delay and returns canned responses so the UI can be
// tested without a live backend.

export async function callClaude(systemPrompt) {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 1200));

  // Detect which kind of response is expected based on the system prompt
  const isEmailRequest = systemPrompt.includes("sales copywriter");

  if (isEmailRequest) {
    // Return a fake generated email
    return JSON.stringify({
      subject: "Quick idea for your outbound workflow",
      body:
        "Hi there,\n\nNoticed your team is growing and likely handling more outbound work.\n\nUsually at this stage, personalization becomes harder to maintain without adding more SDR headcount.\n\nWe help teams use AI agents to research accounts and draft personalized outreach, so reps can spend more time selling instead of manually researching.\n\nWorth a quick 15-minute chat next week?\n\nBest,\nAdib",
    });
  }

  // Return a fake research brief
  return JSON.stringify({
    pain_points: [
      "Manual prospect research",
      "Inconsistent email personalization",
    ],
    opportunity:
      "AI SDR agents can help the team scale outbound without increasing manual SDR workload.",
    angle:
      "Growth creates pressure to personalize outreach faster without adding more headcount.",
    tone_notes: "Keep the email short, direct, and relevant.",
  });
}


// ── REAL BACKEND (production) ─────────────────────────────────────────────────
// Uncomment this and remove the mock above when your backend is ready.
// Your FastAPI (or similar) server should forward requests to the Anthropic API
// and return { text: "..." }.

// export async function callClaude(systemPrompt, userPrompt) {
//   const res = await fetch("http://localhost:8000/api/claude", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ systemPrompt, userPrompt }),
//   });
//
//   const data = await res.json();
//
//   if (!res.ok) {
//     throw new Error(data.detail || "Claude request failed");
//   }
//
//   return data.text;
// }
