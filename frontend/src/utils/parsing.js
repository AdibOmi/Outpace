// ─── parsing.js ─────────────────────────────────────────────────────────────
// Shared response parsing for Claude calls that are expected to return JSON.

// Removes Claude markdown fences and parses structured JSON.
export function parseJsonResponse(rawResponse) {
  if (rawResponse && typeof rawResponse === "object") {
    return rawResponse;
  }

  const cleanedResponse = String(rawResponse ?? "")
    .replace(/```json|```/gi, "")
    .trim();

  return JSON.parse(cleanedResponse);
}
