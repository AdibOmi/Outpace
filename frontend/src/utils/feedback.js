// ─── feedback.js ────────────────────────────────────────────────────────────
// Builds the "feedback memory" block fed into email-drafting prompts, so the
// agent learns tone/structure/CTA preferences from previously reviewed
// outreach (initial emails or follow-ups). Shared by RunPage and CadencePage.

export function buildFeedbackMemory(results, feedback) {
  const reviewedExamples = results
    .filter((result) => feedback[result.id]?.rating)
    .slice(-10)
    .map((result, index) => {
      const review = feedback[result.id];

      return `
Example ${index + 1}

Company:
${result.company}

Review:
${review.rating}

Reviewer notes:
${review.notes || "No additional notes"}

Research angle:
${result.research?.angle || "Not available"}

Email subject:
${result.generatedEmail?.subject || result.subject || "Not available"}

Email body:
${result.generatedEmail?.body || result.body || "Not available"}
`.trim();
    })
    .join("\n\n------------------------------\n\n");

  if (!reviewedExamples) {
    return `
There are no reviewed outreach examples yet.

Follow the campaign playbook, templates, and outreach guidelines.
`;
  }

  return `
PREVIOUS REVIEWED OUTREACH EXAMPLES

${reviewedExamples}

Use these examples as feedback memory.

Learning rules:
- Approved emails show patterns that should generally be repeated.
- Needs Revision feedback shows what should be improved.
- Rejected emails show patterns that should be avoided.
- Prioritize the reviewer's written notes.
- Learn tone, structure, CTA style, length, and personalization preferences.
- Never copy company-specific facts from a previous account.
- Adapt the learned patterns to the current account.
- Never mention these previous reviews in the generated email.
`;
}
