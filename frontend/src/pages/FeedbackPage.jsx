// ─── FeedbackPage.jsx ─────────────────────────────────────────────────────────
// Step 4 of the workflow.
// Shows every result from the campaign run. For each email the user can:
//   - Rate it (Approved / Needs Revision / Reject)
//   - Leave free-text notes so the agent can improve next time.
// If no results exist yet, an empty-state message is shown instead.

import "./FeedbackPage.css";

export default function FeedbackPage({
  results = [],
  feedback = {},
  setFeedback,
}) {
  // feedback[accountId] = { rating: string, notes: string }



  // ── Empty state ───────────────────────────────────────────────────────────
  if (!results || results.length === 0) {
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



  // ____ Campaign Summary Dashboard ______

const summary = results.reduce(
  (acc, result) => {
    acc.total += 1;

    if (result.status === "sent") acc.sent += 1;
    if (result.status === "error") acc.error += 1;

    const currentRating = feedback[result.id]?.rating;

    if (currentRating === "✓ Approved") acc.approved += 1;
    else if (currentRating === "~ Needs Revision") acc.needsRevision += 1;
    else if (currentRating === "✗ Reject") acc.rejected += 1;
    else acc.pending += 1;

    return acc;
  },
  {
    total: 0,
    approved: 0,
    needsRevision: 0,
    rejected: 0,
    pending: 0,
    sent: 0,
    error: 0,
  }
);



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

 {/* _____Summary Dashboard______ */}

      <div className="summary-grid">
  <div className="summary-card">
    <span>Total</span>
    <strong>{summary.total}</strong>
  </div>

  <div className="summary-card">
    <span>Pending Review</span>
    <strong>{summary.pending}</strong>
  </div>

  <div className="summary-card">
    <span>Approved</span>
    <strong>{summary.approved}</strong>
  </div>

  <div className="summary-card">
    <span>Needs Revision</span>
    <strong>{summary.needsRevision}</strong>
  </div>

  <div className="summary-card">
    <span>Rejected</span>
    <strong>{summary.rejected}</strong>
  </div>

  <div className="summary-card">
    <span>Sent</span>
    <strong>{summary.sent}</strong>
  </div>

  <div className="summary-card">
    <span>Errors</span>
    <strong>{summary.error}</strong>
  </div>
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

          {result.status === "error" && (
          <div className="feedback-error-box">
            <strong>Generation failed</strong>
            <div>{result.errorMessage || "Unknown error occurred."}</div>
          </div>
        )}

        {result.status !== "error" && (
        <>
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

           </> 
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
