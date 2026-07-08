// ─── demoData.js ─────────────────────────────────────────────────────────────
// Generates plausible research/email JSON so the campaign flow can be
// exercised end-to-end without a working Anthropic API key. Used by
// claudeApi.js as a fallback when the real API call fails.

function extractField(text, label) {
  const match = String(text ?? "").match(new RegExp(`${label}:\\s*\\n(.+)`));
  return match ? match[1].trim() : "";
}

function fallback(value, backup) {
  return value && value !== "Not provided" ? value : backup;
}

export function generateDemoResearch(userPrompt) {
  const company = fallback(extractField(userPrompt, "Account"), "the company");
  const title = fallback(extractField(userPrompt, "Title"), "the team");
  const industry = fallback(extractField(userPrompt, "Industry"), "their industry");

  const research = {
    pain_points: [
      `Manual processes are slowing ${company} down as they scale.`,
      `Limited visibility makes it hard for ${title} to prioritize what matters.`,
    ],
    opportunity: `${company} is well positioned to streamline operations and free up time for higher-value work in ${industry}.`,
    angle: `Show ${company} how similar teams in ${industry} cut manual work while improving results.`,
    tone_notes: "[Demo mode — generated without a live API key] Keep it concise, consultative, and specific to their situation.",
  };

  return JSON.stringify(research);
}

export function generateDemoEmail(userPrompt, systemPrompt) {
  const company = fallback(extractField(userPrompt, "Company"), "your team");
  const contact = fallback(extractField(userPrompt, "Current contact"), "there");
  const firstName = contact.split(" ")[0] || "there";
  const sender = fallback(extractField(systemPrompt, "Sender"), "The team");

  let angle = "streamline how your team works";
  const researchMatch = String(userPrompt ?? "").match(/Research brief:\s*\n([\s\S]*)/);
  if (researchMatch) {
    try {
      const research = JSON.parse(researchMatch[1]);
      if (research.angle) angle = research.angle;
    } catch {
      // Keep the default angle if the embedded research brief isn't valid JSON.
    }
  }

  const email = {
    subject: `Quick idea for ${company}`,
    body: `Hi ${firstName},\n\n${angle}\n\nWorth a quick chat this week?\n\nBest,\n${sender}`,
  };

  return JSON.stringify(email);
}
