// ─── claudeApi.js ────────────────────────────────────────────────────────────
// Centralises all calls to the Claude API. Forwards requests to the FastAPI
// backend (backend/main.py), which proxies them to the Anthropic API.
//
// No working API key is configured yet (see backend/.env). Until one is
// added, any failure here (auth error, backend not running, network error)
// falls back to locally generated demo data so the campaign flow can still
// be exercised end-to-end.

import { generateDemoResearch, generateDemoEmail } from "./demoData";

export async function callClaude(systemPrompt, userPrompt) {
  try {
    const res = await fetch("http://localhost:8000/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemPrompt, userPrompt }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || "Claude request failed");
    }

    return data.text;
  } catch {
    return systemPrompt.includes("sales researcher")
      ? generateDemoResearch(userPrompt)
      : generateDemoEmail(userPrompt, systemPrompt);
  }
}
