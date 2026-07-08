// ─── RunPage.jsx ──────────────────────────────────────────────────────────────
// Step 3 of the workflow.
// Processes only accounts whose status is "pending".
// Previous accounts, results, and feedback remain preserved between runs.

import { useRef, useState } from "react";
import { now } from "../utils/helpers";
import { callClaude } from "../utils/claudeApi";
import { parseJsonResponse } from "../utils/parsing";
import { buildFeedbackMemory } from "../utils/feedback";
import { DEFAULT_CADENCE_STEPS, computeNextFollowUpDate } from "../utils/cadence";
import "./RunPage.css";

export default function RunPage({
  config = {},
  accounts = [],
  setAccounts,
  runResults = [],
  setRunResults,
  feedback = {},
}) {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const [activePreview, setActivePreview] = useState(null);
  const [done, setDone] = useState(false);

  // Setting this to true stops the loop after the current account finishes.
  const abortRef = useRef(false);

  // ── Helper: add a message to the campaign log ────────────────────────────
  const addLog = (msg, type = "") => {
    setLogs((previousLogs) => [
      ...previousLogs,
      {
        time: now(),
        msg,
        type,
      },
    ]);
  };

  // ── Helper: update an account's current workflow status ─────────────────
  const updateAccountStatus = (accountId, status) => {
    setAccounts((previousAccounts) =>
      previousAccounts.map((account) =>
        account.id === accountId
          ? {
              ...account,
              status,
            }
          : account
      )
    );
  };

  // ── Helper: insert or update one result ─────────────────────────────────
  // This prevents duplicate results if the same account is retried later.
  const saveResult = (newResult) => {
    setRunResults((previousResults) => {
      const resultAlreadyExists = previousResults.some(
        (result) => result.id === newResult.id
      );

      if (resultAlreadyExists) {
        return previousResults.map((result) =>
          result.id === newResult.id ? newResult : result
        );
      }

      return [...previousResults, newResult];
    });
  };

  // Remove any old duplicated results from the displayed/calculated data.
  const uniqueResults = Array.from(
    new Map(runResults.map((result) => [result.id, result])).values()
  );

  // ── Build feedback memory from previously reviewed emails ───────────────
  const feedbackMemory = buildFeedbackMemory(uniqueResults, feedback);

  const cadenceSteps = config.cadenceSteps?.length
    ? config.cadenceSteps
    : DEFAULT_CADENCE_STEPS;

  // ── Research prompt ──────────────────────────────────────────────────────
  const RESEARCH_SYSTEM = `
You are a world-class B2B sales researcher.

Produce a concise, actionable research brief connecting the account's
business context to the seller's service.

Service context:
${config.serviceDescription || "Not provided"}

Ideal customer profile:
${config.icp || "Not provided"}

Research guidelines:
${config.researchGuide || "Not provided"}

Return only valid JSON with this structure:

{
  "pain_points": ["..."],
  "opportunity": "1–2 sentences describing the specific opportunity",
  "angle": "The strongest outreach hook",
  "tone_notes": "Tone and style recommendations for this contact"
}
`;

  // ── Email prompt ─────────────────────────────────────────────────────────
  const EMAIL_SYSTEM = `
You are a top-performing B2B sales copywriter.

Write cold emails that:
- Feel genuinely personalized
- Are concise
- Avoid generic claims
- Connect the research to the seller's service
- End with a clear, low-friction CTA

Seller's service:
${config.serviceDescription || "Not provided"}

Sender:
${config.senderName || "the sender"}

Outreach guidelines:
${config.outreachGuide || "Not provided"}

${
  config.templates
    ? `
Best-performing templates for reference:

${config.templates}
`
    : ""
}

${feedbackMemory}

Return only valid JSON with this structure:

{
  "subject": "...",
  "body": "Complete email body without the subject line"
}

Sign the email as:
${config.senderName || "the sender"}
`;

  // ── Main campaign execution ──────────────────────────────────────────────
  const runCampaign = async () => {
    abortRef.current = false;

    setRunning(true);
    setDone(false);
    setLogs([]);
    setProgress(0);

    // Only new/unprocessed accounts are included in this run.
    const pendingAccounts = accounts.filter(
      (account) => account.status === "pending"
    );

    if (pendingAccounts.length === 0) {
      addLog("No pending accounts to process.", "err");
      setRunning(false);
      return;
    }

    addLog(
      `Starting campaign — ${pendingAccounts.length} pending account${
        pendingAccounts.length === 1 ? "" : "s"
      }`,
      "info"
    );

    for (let index = 0; index < pendingAccounts.length; index += 1) {
      if (abortRef.current) {
        break;
      }

      const account = pendingAccounts[index];

      try {
        // ── Step 1: Research ──────────────────────────────────────────────
        updateAccountStatus(account.id, "researching");

        addLog(`[${account.company}] Researching account...`);

        const researchRaw = await callClaude(
          RESEARCH_SYSTEM,
          `
Account:
${account.company}

Contact:
${account.contact || "Not provided"}

Title:
${account.title || "Not provided"}

Industry:
${account.industry || "Not provided"}

Notes:
${account.notes || "Not provided"}

Email:
${account.email || "Not provided"}
`
        );

        let research;

        try {
          research = parseJsonResponse(researchRaw);
        } catch {
          research = {
            angle: String(researchRaw ?? "").slice(0, 200),
            pain_points: [],
            opportunity: "",
            tone_notes: "",
          };

          addLog(
            `[${account.company}] Research response was not valid JSON. A fallback was used.`,
            "info"
          );
        }

        addLog(
          `[${account.company}] Research complete — angle: "${
            research.angle?.slice(0, 60) || "No angle returned"
          }${research.angle?.length > 60 ? "..." : ""}"`,
          "ok"
        );

        // ── Step 2: Draft email ───────────────────────────────────────────
        updateAccountStatus(account.id, "drafting");

        addLog(`[${account.company}] Drafting personalised email...`);

        const emailRaw = await callClaude(
          EMAIL_SYSTEM,
          `
Current contact:
${account.contact || "Not provided"}

Job title:
${account.title || "Not provided"}

Company:
${account.company}

Industry:
${account.industry || "Not provided"}

Email:
${account.email || "Not provided"}

Research brief:
${JSON.stringify(research, null, 2)}
`
        );

        let generatedEmail;

        try {
          generatedEmail = parseJsonResponse(emailRaw);
        } catch {
          generatedEmail = {
            subject: "Following up",
            body: String(emailRaw ?? ""),
          };

          addLog(
            `[${account.company}] Email response was not valid JSON. A fallback was used.`,
            "info"
          );
        }

        addLog(
          `[${account.company}] Email drafted — subject: "${
            generatedEmail.subject || "No subject"
          }"`,
          "ok"
        );

        // ── Step 3: Simulated sending ─────────────────────────────────────
        addLog(`[${account.company}] Sending to ${account.email}...`);

        await new Promise((resolve) => {
          window.setTimeout(resolve, 600);
        });

        const sentAt = new Date();

        const newResult = {
          ...account,
          status: "sent",
          research,
          generatedEmail,
          sentAt: sentAt.toISOString(),
        };

        setAccounts((previousAccounts) =>
          previousAccounts.map((acc) =>
            acc.id === account.id
              ? {
                  ...acc,
                  status: "sent",
                  cadenceStep: 0,
                  cadenceState: "active",
                  nextFollowUpAt: computeNextFollowUpDate(
                    sentAt,
                    0,
                    cadenceSteps
                  ).toISOString(),
                }
              : acc
          )
        );
        saveResult(newResult);

        addLog(`[${account.company}] ✓ Sent successfully`, "ok");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        updateAccountStatus(account.id, "error");

        const errorResult = {
          ...account,
          status: "error",
          errorMessage,
          sentAt: new Date().toISOString(),
        };

        saveResult(errorResult);

        addLog(
          `[${account.company}] ✗ Error: ${errorMessage}`,
          "err"
        );
      }

      setProgress(
        Math.round(
          ((index + 1) / pendingAccounts.length) * 100
        )
      );
    }

    const wasStopped = abortRef.current;

    addLog(
      wasStopped
        ? "Campaign stopped by user."
        : "Campaign complete.",
      wasStopped ? "err" : "ok"
    );

    setRunning(false);
    setDone(!wasStopped);
  };

  // ── Stop campaign after the current account finishes ────────────────────
  const stop = () => {
    abortRef.current = true;
  };

  // ── Account-level statistics ─────────────────────────────────────────────
  const sentCount = accounts.filter(
    (account) => account.status === "sent"
  ).length;

  const errorCount = accounts.filter(
    (account) => account.status === "error"
  ).length;

  const pendingCount = accounts.filter(
    (account) => account.status === "pending"
  ).length;

  const inProgressCount = accounts.filter(
    (account) =>
      account.status === "researching" ||
      account.status === "drafting"
  ).length;

  // ── Persisted result statistics ─────────────────────────────────────────
  const generatedCount = uniqueResults.filter(
    (result) => result.status === "sent"
  ).length;

  const resultErrorCount = uniqueResults.filter(
    (result) => result.status === "error"
  ).length;

  const processedCount = generatedCount + resultErrorCount;

  const campaignStats =
    processedCount > 0
      ? {
          processed: processedCount,
          generated: generatedCount,
          errors: resultErrorCount,
          successRate: Math.round(
            (generatedCount / processedCount) * 100
          ),
        }
      : null;

  return (
    <div>
      {/* ── Page header ── */}
      <div className="page-header">
        <h2>Run campaign</h2>

        <p>
          The agent processes pending accounts while preserving all previous
          accounts, results, and reviews.
        </p>
      </div>

      {/* ── Campaign statistics ── */}
      <div className="grid-4 run-stats">
        <div className="stat-card">
          <div className="num run-stat-pending">
            {pendingCount}
          </div>

          <div className="lbl">pending</div>
        </div>

        <div className="stat-card">
          <div className="num run-stat-progress">
            {inProgressCount}
          </div>

          <div className="lbl">in progress</div>
        </div>

        <div className="stat-card">
          <div className="num run-stat-sent">
            {sentCount}
          </div>

          <div className="lbl">sent</div>
        </div>

        <div className="stat-card">
          <div className="num run-stat-error">
            {errorCount}
          </div>

          <div className="lbl">errors</div>
        </div>
      </div>

      {/* ── Campaign controls ── */}
      <div className="card">
        <div className="row-between run-controls-header">
          <div>
            <h3>Campaign controls</h3>

            <p className="sub run-controls-sub">
              {accounts.length} total accounts · {pendingCount} waiting
            </p>
          </div>

          <div className="row">
            {running ? (
              <button
                className="btn btn-danger btn-sm"
                onClick={stop}
              >
                Stop
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={runCampaign}
                disabled={pendingCount === 0}
              >
                {processedCount > 0
                  ? "▶ Run pending accounts"
                  : "▶ Start campaign"}
              </button>
            )}
          </div>
        </div>

        {/* ── Progress bar ── */}
        {(running || done) && (
          <div className="progress-row">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>

            <span className="run-progress-label">
              {progress}%
            </span>
          </div>
        )}

        {/* ── Status indicator ── */}
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
                ? `Done — ${sentCount} sent across ${accounts.length} accounts`
                : pendingCount > 0
                  ? `${pendingCount} pending accounts ready`
                  : "No pending accounts"}
          </span>
        </div>

        {/* ── Campaign summary ── */}
        {campaignStats && (
          <div className="run-summary">
            <div className="run-summary-title">
              Campaign Summary
            </div>

            <div>
              Total Accounts: {accounts.length}
            </div>

            <div>
              Accounts Processed: {campaignStats.processed}
            </div>

            <div>
              Emails Generated: {campaignStats.generated}
            </div>

            <div>
              Errors: {campaignStats.errors}
            </div>

            <div>
              Success Rate: {campaignStats.successRate}%
            </div>
          </div>
        )}

        {/* ── Live campaign logs ── */}
        {logs.length > 0 && (
          <div className="run-log-container">
            {logs.map((entry, index) => (
              <div
                key={`${entry.time}-${index}`}
                className="log-entry"
              >
                <span className="log-time">
                  {entry.time}
                </span>

                <span className={`log-msg ${entry.type}`}>
                  {entry.msg}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Accumulated results ── */}
      {uniqueResults.length > 0 && (
        <div className="card">
          <h3 className="run-results-heading">
            Results — {uniqueResults.length} of {accounts.length} accounts
            processed
          </h3>

          {uniqueResults.map((result, index) => (
            <div
              key={result.id}
              className="run-result-row"
              style={{
                borderBottom:
                  index < uniqueResults.length - 1
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

                {result.generatedEmail && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() =>
                      setActivePreview((currentPreview) =>
                        currentPreview === result.id
                          ? null
                          : result.id
                      )
                    }
                  >
                    {activePreview === result.id
                      ? "Hide"
                      : "View email"}
                  </button>
                )}
              </div>

              {result.status === "error" && (
                <p className="run-result-angle">
                  Error: {result.errorMessage}
                </p>
              )}

              {result.research?.angle && (
                <p className="run-result-angle">
                  Angle: {result.research.angle}
                </p>
              )}

              {activePreview === result.id &&
                result.generatedEmail && (
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