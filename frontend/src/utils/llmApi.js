// ─── llmApi.js ───────────────────────────────────────────────────────────────
// Centralises all AI calls. Forwards requests to the FastAPI backend
// (backend/main.py), which sends them to the configured provider (Gemini or
// Claude — see backend/llm.py).
//
// Falls back to locally generated demo data only when the backend can't be
// reached or has no AI key configured (HTTP 503), so the campaign flow can
// still be exercised end-to-end offline. Real API errors are thrown so they
// show up in the run log instead of being masked by demo output.

import { generateDemoResearch, generateDemoEmail } from "./demoData";

// Relative URL — Vite proxies /api to the backend (see vite.config.js).
const API_BASE = "/api";

function demoResponse(systemPrompt, userPrompt) {
  return systemPrompt.includes("sales researcher")
    ? generateDemoResearch(userPrompt)
    : generateDemoEmail(userPrompt, systemPrompt);
}

// `webSearch: true` lets the model search the web, which the research step
// uses to ground briefs in real, current information.
export async function callLLM(systemPrompt, userPrompt, { webSearch = false } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemPrompt, userPrompt, webSearch }),
    });
  } catch {
    // Backend not running.
    return demoResponse(systemPrompt, userPrompt);
  }

  const data = await res.json().catch(() => ({}));

  if (res.status === 503) {
    return demoResponse(systemPrompt, userPrompt);
  }

  if (!res.ok) {
    throw new Error(data.detail || `AI request failed (${res.status})`);
  }

  return data.text;
}

// Reports which integrations the backend has configured. Never throws —
// returns { online: false } when the backend can't be reached.
export async function getBackendStatus() {
  try {
    const res = await fetch(`${API_BASE}/status`);
    if (!res.ok) return { online: false };
    return { online: true, ...(await res.json()) };
  } catch {
    return { online: false };
  }
}
