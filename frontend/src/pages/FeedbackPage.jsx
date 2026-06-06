// ─── FeedbackPage.jsx ─────────────────────────────────────────────────────────
// Step 4 of the workflow.
// Shows every result from the campaign run. For each email the user can:
//   - Rate it (Approved / Needs Revision / Reject)
//   - Leave free-text notes so the agent can improve next time.
// If no results exist yet, an empty-state message is shown instead.

import { useState } from "react";
import "./FeedbackPage.css";

export default function FeedbackPage({ results }) {
  // feedback[accountId] = { rating: string, notes: string }
  const [feedback, setFeedback] = useState({});

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!results.length) {
    return (
      <div>
        <div className="page-header">
          <h2>Feedback</h2>
          <p>Run a campaign first — then review and annotate each email here.</p>
        </div>
        <div className="card feedback-empty">
          No results yet.
        </div>
      </div>
    );
  }

  // ── Rating buttons config ─────────────────────────────────────────────────
  const RATING_OPTIONS = [
    "✓ Approved",
    "~ Needs Revision",
    "✗ Reject",
  ];

  return (
    <div>
      {/* ── Page header ── */}
      <div className="page-header">
        <h2>Review &amp; feedback</h2>
        <p>
          Review research, inspect generated emails, and give feedback for
          future improvements.
        </p>
      </div>

      {/* ── One card per result ── */}
      {results.map((result) => (
        <div className="card" key={result.id}>

          {/* ── Card header: company info + rating buttons ── */}
          <div className="row-between feedback-card-header">
            <div>
              <strong className="feedback-company">{result.company}</strong>
              <div className="feedback-contact">
                {result.contact} • {result.title} • {result.industry}
              </div>
            </div>

            {/* Rating buttons — the selected one gets an accent border */}
            <div className="row">
              {RATING_OPTIONS.map((label) => {
                const isSelected = feedback[result.id]?.rating === label;
                return (
                  <button
                    key={label}
                    className="btn btn-secondary btn-sm"
                    style={
                      isSelected
                        ? { borderColor: "var(--accent)", color: "var(--accent)" }
                        : {}
                    }
                    onClick={() =>
                      setFeedback((prev) => ({
                        ...prev,
                        [result.id]: { ...prev[result.id], rating: label },
                      }))
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Research summary panel ── */}
          <div className="feedback-research-panel">
            <div className="feedback-research-title">Research Summary</div>

            {/* Pain points */}
            <div className="feedback-research-section">
              <strong>Pain Points</strong>
              <ul className="feedback-pain-list">
                {result.research?.pain_points?.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>

            {/* Opportunity */}
            <div className="feedback-research-section">
              <strong>Opportunity</strong>
              <div className="feedback-research-body">
                {result.research?.opportunity}
              </div>
            </div>

            {/* Recommended angle */}
            <div className="feedback-research-section">
              <strong>Recommended Angle</strong>
              <div className="feedback-research-body">
                {result.research?.angle}
              </div>
            </div>

            {/* Tone guidance */}
            <div>
              <strong>Tone Guidance</strong>
              <div className="feedback-research-body">
                {result.research?.tone_notes}
              </div>
            </div>
          </div>

          {/* ── Generated email preview ── */}
          {result.generatedEmail && (
            <div className="email-preview feedback-email-preview">
              <div className="subject-line">
                Subject: {result.generatedEmail.subject}
              </div>
              {result.generatedEmail.body}
            </div>
          )}

          {/* ── Free-text feedback ── */}
          <div className="field feedback-notes-field">
            <label>What should the agent do differently?</label>
            <textarea
              rows={2}
              placeholder="E.g. Lead with the ROI angle, not the pain point. Subject line too long. Missing CTA."
              value={feedback[result.id]?.notes || ""}
              onChange={(e) =>
                setFeedback((prev) => ({
                  ...prev,
                  [result.id]: { ...prev[result.id], notes: e.target.value },
                }))
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}
