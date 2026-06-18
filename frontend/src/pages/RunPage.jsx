// ─── RunPage.jsx ──────────────────────────────────────────────────────────────
// Step 3 of the workflow.
// Loops through all "pending" accounts and, for each one:
//   1. Calls Claude to produce a research brief (pain points, angle, tone).
//   2. Calls Claude again to draft a personalised cold email.
//   3. "Sends" the email (simulated in demo mode).
// A live log, progress bar, and results list keep the user informed.

import { useState, useRef } from "react";
import { now } from "../utils/helpers";
import { callClaude } from "../utils/claudeApi";
import "./RunPage.css";

export default function RunPage({ config, accounts, setAccounts, setRunResults }) {
  const [running, setRunning]             = useState(false);
  const [logs, setLogs]                   = useState([]);
  const [results, setResults]             = useState([]);
  const [progress, setProgress]           = useState(0);
  const [activePreview, setActivePreview] = useState(null); // which email preview is open
  const [done, setDone]                   = useState(false);
  const [campaignStats, setCampaignStats] = useState(null);

  // Setting this ref to `true` asks the loop to stop after the current account
  const abortRef = useRef(false);

  // ── Helper: append a line to the run log ─────────────────────────────────
  const addLog = (msg, type = "") => {
    setLogs((prev) => [...prev, { time: now(), msg, type }]);
  };

  // ── System prompts ────────────────────────────────────────────────────────
  // These are injected into each Claude call. They include the user's own
  // service description, ICP, and guides from the Setup page.

  const RESEARCH_SYSTEM = `You are a world-class B2B sales researcher. Your job is to produce a tight, actionable research brief about an account, focused on connecting their business context to the seller's services.

Service context: ${config.serviceDescription}
ICP: ${config.icp || ""}

Research guidelines:
${config.researchGuide}

Return a JSON object (no markdown) with:
{
  "pain_points": ["..."],
  "opportunity": "1–2 sentences on the specific opportunity",
  "angle": "The single strongest hook to lead with",
  "tone_notes": "Any tone/style notes specific to this contact"
}`;

  const EMAIL_SYSTEM = `You are a top-performing B2B sales copywriter. You write cold emails that feel personal, are never generic, and always have a clear, low-friction CTA.

Service: ${config.serviceDescription}
Sender: ${config.senderName || "the sender"}
${config.templates ? `\nBest-performing templates for reference (match the voice and structure):\n${config.templates}` : ""}

Outreach guidelines:
${config.outreachGuide}

Return a JSON object (no markdown) with:
{
  "subject": "...",
  "body": "Full email body, no subject line, signed off as ${config.senderName || "the sender"}..."
}`;

  // ── Main campaign loop ────────────────────────────────────────────────────
  const runCampaign = async () => {

    localStorage.removeItem("feedback");

      // Clear previous campaign
    setRunResults([]);
    setResults([]);
    localStorage.removeItem("runResults");
    
    abortRef.current = false;
    setRunning(true);
    setDone(false);
    setLogs([]);
    setProgress(0);
    
    setCampaignStats(null);
    localStorage.removeItem("runResults");

    const pending = accounts.filter((a) => a.status === "pending");

    if (!pending.length) {
      addLog("No pending accounts.", "err");
      setRunning(false);
      return;
    }

    addLog(`Starting campaign — ${pending.length} accounts`, "info");

    for (let i = 0; i < pending.length; i++) {
      // Check if the user hit "Stop"
      if (abortRef.current) {
        addLog("Campaign stopped by user.", "err");
        break;
      }

      const acct = pending[i];

      // Mark this account as currently being processed
      setAccounts((prev) =>
        prev.map((a) => (a.id === acct.id ? { ...a, status: "researching" } : a))
      );

      try {
        // ── Step 1: Research ────────────────────────────────────────────────
        addLog(`[${acct.company}] Researching account...`);

        const researchRaw = await callClaude(
          RESEARCH_SYSTEM,
          `Account: ${acct.company}\nContact: ${acct.contact} (${acct.title})\nIndustry: ${acct.industry}\nNotes: ${acct.notes}\nEmail: ${acct.email}`
        );

        // Parse the JSON response; fall back gracefully if parsing fails
        let research;
        try {
          research = JSON.parse(researchRaw.replace(/```json|```/g, "").trim());
        } catch {
          research = {
            angle: researchRaw.slice(0, 200),
            pain_points: [],
            opportunity: "",
            tone_notes: "",
          };
        }

        addLog(
          `[${acct.company}] Research complete — angle: "${research.angle?.slice(0, 60)}..."`,
          "ok"
        );

        // ── Step 2: Draft email ─────────────────────────────────────────────
        addLog(`[${acct.company}] Drafting personalised email...`);
        setAccounts((prev) =>
            prev.map((a) => (a.id === acct.id ? { ...a, status: "drafting" } : a))
          );

        const emailRaw = await callClaude(
          EMAIL_SYSTEM,
          `Contact: ${acct.contact}, ${acct.title} at ${acct.company}\nIndustry: ${acct.industry}\nResearch brief:\n${JSON.stringify(research, null, 2)}`
        );

        let email;
        try {
          email = JSON.parse(emailRaw.replace(/```json|```/g, "").trim());
        } catch {
          email = { subject: "Following up", body: emailRaw };
        }

        addLog(
          `[${acct.company}] Email drafted — subject: "${email.subject}"`,
          "ok"
        );

        // ── Step 3: "Send" (simulated) ──────────────────────────────────────
        addLog(`[${acct.company}] Sending to ${acct.email}...`);
        await new Promise((r) => setTimeout(r, 600)); // simulate network delay

        const newResult = {
          ...acct,
          research,
          generatedEmail: email,
          sentAt: new Date().toISOString(),
        };

        // Update the account's status to "sent"
        setAccounts((prev) =>
          prev.map((a) => (a.id === acct.id ? { ...a, status: "sent" } : a))
        );

        // Add to local results list (for the preview panel below)
        setResults((prev) => [...prev, newResult]);

        // Also push to the parent's runResults so FeedbackPage can access it
        if (setRunResults) {
          setRunResults((prev) => [...prev, newResult]);
        }

        addLog(`[${acct.company}] ✓ Sent successfully`, "ok");
      } catch (err) {
        setAccounts((prev) =>
          prev.map((a) => (a.id === acct.id ? { ...a, status: "error" } : a))
        );
        addLog(`[${acct.company}] ✗ Error: ${err.message}`, "err");
      }

      // Update the progress bar after each account
      setProgress(Math.round(((i + 1) / pending.length) * 100));
    }

    addLog("Campaign complete ...");
    setCampaignStats({
      processed: pending.length,
      generated: pending.length,
      errors: 0,
      successRate: 100,
    });
    setRunning(false);
    setDone(true);
  };

  // ── Stop handler ──────────────────────────────────────────────────────────
  const stop = () => {
    abortRef.current = true;
  };

  // ── Derived counts for the stat cards ─────────────────────────────────────
  const sentCount    = accounts.filter((a) => a.status === "sent").length;
  const errorCount   = accounts.filter((a) => a.status === "error").length;
  const pendingCount = accounts.filter((a) => a.status === "pending").length;
  const inProgressCount = accounts.filter((a) => a.status === "researching" || a.status === "drafting").length;

  return (
    <div>
      {/* ── Page header ── */}
      <div className="page-header">
        <h2>Run campaign</h2>
        <p>
          The agent will research each account, draft a personalised email, and
          send automatically.
        </p>
      </div>

      {/* ── Stat cards (pending / sent / errors) ── */}
      <div className="grid-4 run-stats">
        <div className="stat-card">
          <div className="num run-stat-pending">{pendingCount}</div>
          <div className="lbl">pending</div>
        </div>
        <div className="stat-card">
            <div className="num run-stat-progress">{inProgressCount}</div>
            <div className="lbl">in progress</div>
          </div>
        <div className="stat-card">
          <div className="num run-stat-sent">{sentCount}</div>
          <div className="lbl">sent</div>
        </div>
        <div className="stat-card">
          <div className="num run-stat-error">{errorCount}</div>
          <div className="lbl">errors</div>
        </div>
      </div>

      {/* ── Campaign controls card ── */}
      <div className="card">
        <div className="row-between run-controls-header">
          <div>
            <h3>Campaign controls</h3>
            <p className="sub run-controls-sub">
              Phase 1 — research, draft, and send
            </p>
          </div>

          <div className="row">
            {running ? (
              <button className="btn btn-danger btn-sm" onClick={stop}>
                Stop
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={runCampaign}
                disabled={pendingCount === 0}
              >
                {done ? "Re-run pending" : "▶ Start campaign"}
              </button>
            )}
          </div>
        </div>

        {/* Progress bar — only visible while running or after completion */}
        {(running || done) && (
          <div className="progress-row">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="run-progress-label">{progress}%</span>
          </div>
        )}

        {/* Status indicator */}
        <div className="status-bar">
          <div
            className={`status-dot ${
              running ? "working" : done ? "done" : "idle"
            }`}
          />
          <span>
            {running
              ? "Agent working..."
              : done
              ? `Done — ${sentCount} sent`
              : "Ready to run"}
          </span>
        </div>

        {/* Campaign summary — shown after a run completes */}
        {campaignStats && (
          <div className="run-summary">
            <div className="run-summary-title">Campaign Summary</div>
            <div>Accounts Processed: {campaignStats.processed}</div>
            <div>Emails Generated:   {campaignStats.generated}</div>
            <div>Errors:             {campaignStats.errors}</div>
            <div>Success Rate:       {campaignStats.successRate}%</div>
          </div>
        )}

        {/* Live run log */}
        {logs.length > 0 && (
          <div className="run-log-container">
            {logs.map((entry, i) => (
              <div key={i} className="log-entry">
                <span className="log-time">{entry.time}</span>
                <span className={`log-msg ${entry.type}`}>{entry.msg}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Results list ── */}
      {results.length > 0 && (
        <div className="card">
          <h3 className="run-results-heading">
            Results — {results.length} email{results.length > 1 ? "s" : ""} sent
          </h3>

          {results.map((result, i) => (
            <div
              key={result.id}
              className="run-result-row"
              style={{
                // Remove the bottom border from the last item
                borderBottom:
                  i < results.length - 1
                    ? "1px solid var(--border)"
                    : "none",
              }}
            >
              <div className="row-between">
                <div>
                  <strong className="run-result-company">
                    {result.company}
                  </strong>
                  <span className="run-result-contact">
                    {result.contact} · {result.email}
                  </span>
                </div>

                {/* Toggle email preview */}
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() =>
                    setActivePreview(
                      activePreview === result.id ? null : result.id
                    )
                  }
                >
                  {activePreview === result.id ? "Hide" : "View email"}
                </button>
              </div>

              {/* Research angle summary */}
              {result.research?.angle && (
                <p className="run-result-angle">
                  Angle: {result.research.angle}
                </p>
              )}

              {/* Expanded email preview */}
              {activePreview === result.id && result.generatedEmail && (
                <div className="email-preview run-email-preview">
                  <div className="subject-line">
                    Subject: {result.generatedEmail.subject}
                  </div>
                  {result.generatedEmail.body}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
