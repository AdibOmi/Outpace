// ─── parsing.js ─────────────────────────────────────────────────────────────
// Shared response parsing for AI calls that are expected to return JSON.

// Removes markdown fences and parses structured JSON. With web search
// on, the model may wrap the JSON in a sentence or two, so if the whole response
// doesn't parse, fall back to the outermost {...} span.
export function parseJsonResponse(rawResponse) {
  if (rawResponse && typeof rawResponse === "object") {
    return rawResponse;
  }

  const cleanedResponse = String(rawResponse ?? "")
    .replace(/```json|```/gi, "")
    .trim();

  try {
    return JSON.parse(cleanedResponse);
  } catch (error) {
    const start = cleanedResponse.indexOf("{");
    const end = cleanedResponse.lastIndexOf("}");
    if (start === -1 || end <= start) throw error;
    return JSON.parse(cleanedResponse.slice(start, end + 1));
  }
}
