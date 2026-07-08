// ─── CadencePage.jsx ────────────────────────────────────────────────────────
// Follow-up cadence. Once an account's initial email has been sent, this page
// tracks a configurable sequence of follow-up touches (e.g. +3, +7, +14
// days). Since there's no inbox integration, the cadence is stopped manually
// by marking an account Replied / Won / Lost.

import { useRef, useState } from "react";
import { now } from "../utils/helpers";
import { callClaude } from "../utils/claudeApi";
import { parseJsonResponse } from "../utils/parsing";
import { buildFeedbackMemory } from "../utils/feedback";
import {
  DEFAULT_CADENCE_STEPS,
  computeNextFollowUpDate,
  isFollowUpDue,
  parseCadenceSteps,
} from "../utils/cadence";
import "./CadencePage.css";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// No inbox integration exists, so there's no real signal for "the prospect
// replied." This is the per-day chance used only by the "simulate time
// passing" testing tool, to make the cadence demoable without an inbox.
const SIMULATED_REPLY_CHANCE_PER_DAY = 0.12;

const STATE_OPTIONS = ["active", "replied", "won", "lost"];

const STATE_LABELS = {
  active: "Active",
  replied: "Replied",
  won: "Won",
  lost: "Lost",
  completed: "Completed",
};

const STATE_TAG_CLASS = {
  active: "tag-cyan",
  replied: "tag-green",
  won: "tag-green",
  lost: "tag-red",
  completed: "tag-purple",
};

export default function CadencePage({
  config = {},
  setConfig,
  accounts = [],
  setAccounts,
  runResults = [],
  followUps = [],
  setFollowUps,
  feedback = {},
}) {
  const cadenceSteps = config.cadenceSteps?.length
    ? config.cadenceSteps
    : DEFAULT_CADENCE_STEPS;

  const [stepsInput, setStepsInput] = useState(cadenceSteps.join(", "));

  // Resync the text field when the underlying config changes from outside
  // this page (e.g. switching campaigns) — adjusted during render rather
  // than in an effect, per React's "don't setState in an effect" guidance.
  const [syncedSteps, setSyncedSteps] = useState(config.cadenceSteps);
  if (config.cadenceSteps !== syncedSteps) {
    setSyncedSteps(config.cadenceSteps);
    setStepsInput(cadenceSteps.join(", "));
  }

  const [running, setRunning] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [fastForwardDays, setFastForwardDays] = useState("3");
  const abortRef = useRef(false);

  const busy = running || sendingId !== null;

  const addLog = (msg, type = "") => {
    setLogs((prev) => [...prev, { time: now(), msg, type }]);
  };

  const sentAccounts = accounts.filter((account) => account.status === "sent");

  const activeCount = sentAccounts.filter(
    (account) => account.cadenceState === "active"
  ).length;
  const dueCount = sentAccounts.filter((account) =>
    isFollowUpDue(account, cadenceSteps)
  ).length;
  const stoppedCount = sentAccounts.filter((account) =>
    ["replied", "won", "lost"].includes(account.cadenceState)
  ).length;
  const completedCount = sentAccounts.filter(
    (account) => account.cadenceState === "completed"
  ).length;

  // ── Save cadence step config ─────────────────────────────────────────────
  const saveSteps = () => {
    setConfig((prev) => ({ ...prev, cadenceSteps: parseCadenceSteps(stepsInput) }));
  };

  // ── Testing tool: fast-forward the clock, simulating replies along the way
  // There's no inbox integration, so this is the only way to exercise "due"
  // follow-ups and reply-driven state changes without waiting real days.
  const simulateTimePassing = () => {
    const days = Math.max(1, parseInt(fastForwardDays, 10) || 0);
    const replyChance = 1 - (1 - SIMULATED_REPLY_CHANCE_PER_DAY) ** days;

    let repliedCount = 0;

    const updatedAccounts = accounts.map((account) => {
      if (account.status !== "sent" || account.cadenceState !== "active") {
        return account;
      }

      if (Math.random() < replyChance) {
        repliedCount += 1;
        return { ...account, cadenceState: "replied", nextFollowUpAt: null };
      }

      if (!account.nextFollowUpAt) return account;

      return {
        ...account,
        nextFollowUpAt: new Date(
          new Date(account.nextFollowUpAt).getTime() - days * MS_PER_DAY
        ).toISOString(),
      };
    });

    setAccounts(updatedAccounts);

    addLog(
      `Simulated ${days} day${days === 1 ? "" : "s"} passing — ${repliedCount} simulated repl${
        repliedCount === 1 ? "y" : "ies"
      }.`,
      "info"
    );
  };

  // ── Draft + "send" the next follow-up for one account ────────────────────
  const sendFollowUp = async (account) => {
    const initialResult = runResults.find((result) => result.id === account.id);
    const priorFollowUps = followUps
      .filter((f) => f.accountId === account.id)
      .sort((a, b) => a.step - b.step);

    const nextStep = priorFollowUps.length + 1;
    const isFinalStep = nextStep === cadenceSteps.length;
    const feedbackMemory = buildFeedbackMemory(runResults, feedback);

    const FOLLOWUP_SYSTEM = `
You are a top-performing B2B sales copywriter writing a FOLLOW-UP email.
This is follow-up #${nextStep} of ${cadenceSteps.length} in an outbound cadence.

Rules:
- Do not repeat the original pitch verbatim — build on it.
- Reference that this is a follow-up without sounding apologetic or needy.
- Keep it noticeably shorter than a first-touch email.
- ${
      isFinalStep
        ? 'This is the FINAL touch in the cadence. Write a polite "closing the loop" breakup email that gives the prospect an easy, low-pressure out, while leaving the door open.'
        : "Add one new angle, proof point, or question that moves the conversation forward — do not just \"bump\" the thread."
    }

Seller's service:
${config.serviceDescription || "Not provided"}

Sender:
${config.senderName || "the sender"}

Outreach guidelines:
${config.outreachGuide || "Not provided"}

${feedbackMemory}

Return only valid JSON with this structure:

{
  "subject": "...",
  "body": "Complete email body without the subject line"
}

Sign the email as:
${config.senderName || "the sender"}
`;

    const userPrompt = `
Account:
${account.company}

Contact:
${account.contact || "Not provided"}

Title:
${account.title || "Not provided"}

Research brief:
${JSON.stringify(initialResult?.research || {}, null, 2)}

Original email sent:
Subject: ${initialResult?.generatedEmail?.subject || "Not available"}
${initialResult?.generatedEmail?.body || "Not available"}

Previous follow-ups sent so far:
${
  priorFollowUps.length
    ? priorFollowUps
        .map((f) => `Follow-up ${f.step} — Subject: ${f.subject}\n${f.body}`)
        .join("\n\n")
    : "None"
}

This will be follow-up #${nextStep} of ${cadenceSteps.length}.
`;

    addLog(`[${account.company}] Drafting follow-up ${nextStep}/${cadenceSteps.length}...`);

    let generated;
    try {
      const raw = await callClaude(FOLLOWUP_SYSTEM, userPrompt);
      try {
        generated = parseJsonResponse(raw);
      } catch {
        generated = {
          subject: `Following up — ${account.company}`,
          body: String(raw ?? ""),
        };
        addLog(
          `[${account.company}] Follow-up response was not valid JSON. A fallback was used.`,
          "info"
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(`[${account.company}] ✗ Error: ${errorMessage}`, "err");
      return;
    }

    // Simulated send delay, matching RunPage's behaviour.
    await new Promise((resolve) => window.setTimeout(resolve, 600));

    const sentAt = new Date();

    setFollowUps((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        accountId: account.id,
        company: account.company,
        contact: account.contact,
        email: account.email,
        step: nextStep,
        subject: generated.subject,
        body: generated.body,
        sentAt: sentAt.toISOString(),
        status: "sent",
      },
    ]);

    setAccounts((prev) =>
      prev.map((a) =>
        a.id === account.id
          ? {
              ...a,
              cadenceStep: nextStep,
              cadenceState: isFinalStep ? "completed" : "active",
              nextFollowUpAt: isFinalStep
                ? null
                : computeNextFollowUpDate(sentAt, nextStep, cadenceSteps).toISOString(),
            }
          : a
      )
    );

    addLog(`[${account.company}] ✓ Follow-up ${nextStep} sent`, "ok");
  };

  // ── Manual per-row override ──────────────────────────────────────────────
  const handleSendNow = async (account) => {
    setSendingId(account.id);
    try {
      await sendFollowUp(account);
    } finally {
      setSendingId(null);
    }
  };

  // ── Bulk: process every account whose next follow-up is due ─────────────
  const runDueFollowUps = async () => {
    abortRef.current = false;
    setRunning(true);
    setLogs([]);
    setProgress(0);

    const due = sentAccounts.filter((account) => isFollowUpDue(account, cadenceSteps));

    if (due.length === 0) {
      addLog("No follow-ups due right now.", "info");
      setRunning(false);
      return;
    }

    addLog(`Starting cadence run — ${due.length} follow-up${due.length === 1 ? "" : "s"} due`, "info");

    for (let i = 0; i < due.length; i += 1) {
      if (abortRef.current) break;
      await sendFollowUp(due[i]);
      setProgress(Math.round(((i + 1) / due.length) * 100));
    }

    addLog(abortRef.current ? "Cadence run stopped by user." : "Cadence run complete.", abortRef.current ? "err" : "ok");
    setRunning(false);
  };

  const stop = () => {
    abortRef.current = true;
  };

  // ── State dropdown (mark replied / won / lost / reactivate) ─────────────
  const setCadenceState = (accountId, newState) => {
    setAccounts((prev) =>
      prev.map((account) => {
        if (account.id !== accountId) return account;

        if (newState === "active") {
          const hasStepsLeft = account.cadenceStep < cadenceSteps.length;
          return {
            ...account,
            cadenceState: hasStepsLeft ? "active" : "completed",
            nextFollowUpAt: hasStepsLeft
              ? computeNextFollowUpDate(new Date(), account.cadenceStep, cadenceSteps).toISOString()
              : null,
          };
        }

        return { ...account, cadenceState: newState, nextFollowUpAt: null };
      })
    );
  };

  const dueLabel = (account) => {
    if (account.cadenceState === "completed") return "Cadence complete";
    if (account.cadenceState !== "active") return "—";
    if (!account.nextFollowUpAt) return "—";

    const diffDays = Math.ceil((new Date(account.nextFollowUpAt) - new Date()) / MS_PER_DAY);
    if (diffDays <= 0) return "Due now";
    return `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
  };

  if (sentAccounts.length === 0) {
    return (
      <div>
        <div className="page-header">
          <h2>Follow-up cadence</h2>
          <p>Run a campaign first — accounts appear here once their initial email is sent.</p>
        </div>
        <div className="card cadence-empty">No sent accounts yet.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Follow-up cadence</h2>
        <p>The agent follows up on a schedule until you mark an account replied, won, or lost.</p>
      </div>

      {/* ── Cadence settings ── */}
      <div className="card">
        <h3>Cadence schedule</h3>
        <p className="sub">Days between touches, e.g. 3, 7, 14 — the last number is the final (breakup) email.</p>
        <div className="row cadence-settings-row">
          <input
            type="text"
            value={stepsInput}
            onChange={(e) => setStepsInput(e.target.value)}
            placeholder="3, 7, 14"
          />
          <button className="btn btn-secondary btn-sm" onClick={saveSteps}>
            Save
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid-4 cadence-stats">
        <div className="stat-card">
          <div className="num cadence-stat-active">{activeCount}</div>
          <div className="lbl">active</div>
        </div>
        <div className="stat-card">
          <div className="num cadence-stat-due">{dueCount}</div>
          <div className="lbl">due now</div>
        </div>
        <div className="stat-card">
          <div className="num cadence-stat-stopped">{stoppedCount}</div>
          <div className="lbl">replied / won / lost</div>
        </div>
        <div className="stat-card">
          <div className="num cadence-stat-completed">{completedCount}</div>
          <div className="lbl">completed</div>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="card">
        <div className="row-between cadence-controls-header">
          <div>
            <h3>Cadence run</h3>
            <p className="sub cadence-controls-sub">{dueCount} follow-up{dueCount === 1 ? "" : "s"} due now</p>
          </div>
          <div className="row">
            {running ? (
              <button className="btn btn-danger btn-sm" onClick={stop}>
                Stop
              </button>
            ) : (
              <button className="btn btn-primary" onClick={runDueFollowUps} disabled={busy || dueCount === 0}>
                ▶ Run due follow-ups
              </button>
            )}
          </div>
        </div>

        {/* Testing tool — there's no inbox, so this is how "due" follow-ups
            and replies get exercised without waiting on real calendar days. */}
        <div className="row-between cadence-controls-header">
          <div>
            <p className="sub cadence-controls-sub">
              No inbox is connected — simulate time passing to test due follow-ups and replies.
            </p>
          </div>
          <div className="row">
            <input
              type="number"
              min="1"
              value={fastForwardDays}
              onChange={(e) => setFastForwardDays(e.target.value)}
              disabled={busy}
              style={{ width: "4rem" }}
            />
            <button className="btn btn-secondary btn-sm" onClick={simulateTimePassing} disabled={busy}>
              ⏩ Simulate days passing
            </button>
          </div>
        </div>

        {running && (
          <div className="progress-row">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="run-progress-label">{progress}%</span>
          </div>
        )}

        {logs.length > 0 && (
          <div className="run-log-container">
            {logs.map((entry, index) => (
              <div key={`${entry.time}-${index}`} className="log-entry">
                <span className="log-time">{entry.time}</span>
                <span className={`log-msg ${entry.type}`}>{entry.msg}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Accounts ── */}
      <div className="card">
        <h3 className="cadence-list-heading">{sentAccounts.length} account{sentAccounts.length > 1 ? "s" : ""} in cadence</h3>

        {sentAccounts.map((account) => {
          const initialResult = runResults.find((result) => result.id === account.id);
          const touches = [
            ...(initialResult
              ? [{ step: 0, label: "Initial email", subject: initialResult.generatedEmail?.subject, body: initialResult.generatedEmail?.body, sentAt: initialResult.sentAt }]
              : []),
            ...followUps
              .filter((f) => f.accountId === account.id)
              .sort((a, b) => a.step - b.step)
              .map((f) => ({ step: f.step, label: `Follow-up ${f.step}`, subject: f.subject, body: f.body, sentAt: f.sentAt })),
          ];

          const tagClass = STATE_TAG_CLASS[account.cadenceState] || "tag-cyan";

          return (
            <div key={account.id} className="cadence-account-row">
              <div className="row-between">
                <div>
                  <strong className="cadence-company">{account.company}</strong>
                  <span className="cadence-contact">{account.contact} · {account.email}</span>
                </div>

                <div className="row cadence-actions">
                  <span className={`tag ${tagClass}`}>{STATE_LABELS[account.cadenceState] || "Active"}</span>
                  <span className="cadence-step-label">{account.cadenceStep || 0}/{cadenceSteps.length}</span>
                  <span className="cadence-due-label">{dueLabel(account)}</span>

                  <select
                    value={account.cadenceState === "completed" ? "active" : account.cadenceState || "active"}
                    onChange={(e) => setCadenceState(account.id, e.target.value)}
                    disabled={busy}
                  >
                    {STATE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{STATE_LABELS[opt]}</option>
                    ))}
                  </select>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleSendNow(account)}
                    disabled={busy || account.cadenceState !== "active" || account.cadenceStep >= cadenceSteps.length}
                  >
                    {sendingId === account.id ? "Sending..." : "Send now"}
                  </button>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setExpandedId((current) => (current === account.id ? null : account.id))}
                  >
                    {expandedId === account.id ? "Hide" : "History"}
                  </button>
                </div>
              </div>

              {expandedId === account.id && (
                <div className="cadence-history">
                  {touches.map((touch) => (
                    <div key={touch.step} className="email-preview cadence-touch-preview">
                      <div className="subject-line">{touch.label} — Subject: {touch.subject}</div>
                      {touch.body}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
