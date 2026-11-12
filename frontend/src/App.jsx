// ─── App.jsx ──────────────────────────────────────────────────────────────────
// Root component. Responsible for:
//   1. Persistent state (config, accounts, runResults, completedPages).
//   2. The sidebar and navigation.
//   3. Rendering the correct page component based on `page` state.
//
// All page-level UI lives in src/pages/. All helpers are in src/utils/.

// Earlier fixes:
// - Campaign numbering now uses a monotonic counter (never reuses numbers after delete)
// - Inline rename with pencil icon (no crash)

import { useState, useEffect, useRef } from "react";
import { loadFromStorage, saveToStorage } from "./utils/helpers";
import { getBackendStatus } from "./utils/llmApi";
import { DEFAULT_CADENCE_STEPS, isFollowUpDue } from "./utils/cadence";
import { NavIcon, ChevronRight, CometLogo } from "./components/Icons";

// ── Page components ──────────────────────────────────────────────────────────
import SetupPage    from "./pages/SetupPage";
import AccountsPage from "./pages/AccountsPage";
import RunPage      from "./pages/RunPage";
import FeedbackPage from "./pages/FeedbackPage";
import CadencePage  from "./pages/CadencePage";

// ── Styles ───────────────────────────────────────────────────────────────────
import "./App.css";

export default function App() {
  const [page, setPage] = useState("setup");

  // ── Persistent state ──────────────────────────────────────────────────────
  const [config, setConfig] = useState(() =>
    loadFromStorage("outpace_config", {})
  );
  const [accounts, setAccounts] = useState(() =>
    loadFromStorage("outpace_accounts", [])
  );
  const [runResults, setRunResults] = useState(() =>
    loadFromStorage("outpace_runResults", [])
  );
  const [followUps, setFollowUps] = useState(() =>
    loadFromStorage("outpace_followUps", [])
  );
  const [completedPages, setCompletedPages] = useState(
    () => new Set(loadFromStorage("outpace_completedPages", []))
  );

  const [feedback, setFeedback] = useState(() => {
  const savedCampaigns = loadFromStorage("campaigns", []);
  const savedActiveId = localStorage.getItem("activeCampaignId");
  //direct JSON parse can crash the app
  //loadFromStorage is already safely handling corrupt JSON

  const activeCampaign = savedCampaigns.find(
    (campaign) => campaign.id === savedActiveId
  );

  return activeCampaign?.feedback || {};
});



  // ── Campaigns ─────────────────────────────────────────────────────────────
  const [campaigns, setCampaigns] = useState(() => {
    return loadFromStorage("campaigns", []);
  });

  const [activeCampaignId, setActiveCampaignId] = useState(() => {
    return localStorage.getItem("activeCampaignId") || null;
  });

  // Monotonic counter — never reset, never reused even after deletes
  const [campaignCounter, setCampaignCounter] = useState(() => {
  const storedCounter = parseInt(
    localStorage.getItem("campaignCounter") || "0",
    10
  );

  const highestExistingNumber = loadFromStorage("campaigns", []).reduce(
    (max, campaign) => Math.max(max, campaign.campaignNumber || 0),
    0
  );

  return Math.max(storedCounter, highestExistingNumber);
});

  // ── Backend status (AI key / SMTP configured) ─────────────────────────────
  const [backendStatus, setBackendStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const check = () =>
      getBackendStatus().then((status) => {
        if (!cancelled) setBackendStatus(status);
      });
    check();
    const interval = window.setInterval(check, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  // Rename state: which campaign is being edited, and the draft value
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef(null);

  // ── Persist state ─────────────────────────────────────────────────────────
  useEffect(() => { saveToStorage("outpace_config", config); }, [config]);
  useEffect(() => { saveToStorage("outpace_accounts", accounts); }, [accounts]);
  useEffect(() => { saveToStorage("outpace_runResults", runResults); }, [runResults]);
  useEffect(() => { saveToStorage("outpace_followUps", followUps); }, [followUps]);
  useEffect(() => {
    saveToStorage("outpace_completedPages", Array.from(completedPages));
  }, [completedPages]);
  useEffect(() => {
    localStorage.setItem("campaigns", JSON.stringify(campaigns));
  }, [campaigns]);


 useEffect(() => {
  if (activeCampaignId) {
    localStorage.setItem("activeCampaignId", activeCampaignId);
  } else {
    localStorage.removeItem("activeCampaignId");
  }
}, [activeCampaignId]);
//null state of a campaign will remove it 




useEffect(() => {
  if (!activeCampaignId) return;

  const saveTimer = window.setTimeout(() => {
    setCampaigns((prev) =>
      prev.map((campaign) =>
        campaign.id === activeCampaignId
          ? {
              ...campaign,
              feedback,
              config,
              accounts,
              results: runResults,
              followUps,
              updatedAt: new Date().toISOString(),
            }
          : campaign
      )
    );
  }, 150);
  return () => window.clearTimeout(saveTimer);
}, [feedback, config, accounts, runResults, followUps, activeCampaignId]);
//small 150 ms autosave debounce i.e. saves after 150 ms of no typing



  // ── Navigation ────────────────────────────────────────────────────────────
  const goTo = (targetPage) => setPage(targetPage);
  const next = (from, to) => {
    setCompletedPages((prev) => new Set([...prev, from]));
    setPage(to);
  };

  // What the agent is doing right now (set by the Run and Cadence pages).
  const [agentActivity, setAgentActivity] = useState(null);

  // ── Live progress shown under each workflow step ──────────────────────────
  const cadenceSteps = config.cadenceSteps?.length ? config.cadenceSteps : DEFAULT_CADENCE_STEPS;
  const briefFilled = ["serviceDescription", "icp", "researchGuide", "outreachGuide"].filter(
    (key) => config[key]?.trim()
  ).length;
  const pendingCount = accounts.filter((a) => a.status === "pending").length;
  const sentCount = accounts.filter((a) => a.status === "sent").length;
  const toReviewCount = runResults.filter((r) => !feedback[r.id]?.rating).length;
  const dueCount = accounts.filter((a) => isFollowUpDue(a, cadenceSteps)).length;
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  const navItems = [
    {
      id: "setup",
      label: "Brief the agent",
      meta: briefFilled === 4 ? "Brief complete" : `${briefFilled} of 4 required filled`,
    },
    {
      id: "accounts",
      label: "Add accounts",
      meta: accounts.length ? plural(accounts.length, "account") : "No accounts yet",
    },
    {
      id: "run",
      label: "Run outreach",
      meta: accounts.length ? `${sentCount} sent · ${pendingCount} waiting` : "Add accounts first",
    },
    {
      id: "feedback",
      label: "Review drafts",
      meta: runResults.length ? `${toReviewCount} to review` : "Nothing to review yet",
    },
    {
      id: "cadence",
      label: "Follow-ups",
      meta: sentCount ? `${dueCount} due now` : "Starts after first send",
    },
  ];

  const pageIndex = navItems.findIndex((item) => item.id === page);

  // Idle message: the single most useful next step.
  const idleHint =
    briefFilled < 4
      ? "Waiting for your brief"
      : accounts.length === 0
        ? "Brief received — add accounts to contact"
        : pendingCount > 0
          ? `Ready to contact ${plural(pendingCount, "account")}`
          : dueCount > 0
            ? `${plural(dueCount, "follow-up")} due`
            : "All caught up";

  const deliveryMode = config.deliveryMode || "simulate";
  const aiStatus = backendStatus?.ai;
  const aiChip = !backendStatus
    ? "Connecting…"
    : !backendStatus.online
      ? "Backend offline"
      : aiStatus?.configured
        ? aiStatus.model
        : "Demo AI";

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    [
      "outpace_config", "outpace_accounts", "outpace_runResults",
      "outpace_followUps", "outpace_completedPages", "campaigns",
      "activeCampaignId", "campaignCounter", "config", "accounts",
      "runResults", "feedback",
    ].forEach((key) => localStorage.removeItem(key));

    setConfig({});
    setAccounts([]);
    setRunResults([]);
    setFollowUps([]);
    setFeedback({});
    setCompletedPages(new Set());
    setCampaigns([]);
    setActiveCampaignId(null);
    setCampaignCounter(0);
    setPage("setup");
  };

  // ── New campaign ──────────────────────────────────────────────────────────
const handleNewCampaign = () => {
  const nextNumber = campaigns.length === 0 ? 1 : campaignCounter + 1;

  setCampaignCounter(nextNumber);

  const newCampaign = {
    id: crypto.randomUUID(),
    campaignNumber: nextNumber,
    name: `Campaign ${nextNumber}`,
    createdAt: new Date().toISOString(),
    config: { ...(config || {}) },
    accounts: [],
    results: [],
    followUps: [],
    feedback: {},
  };

  setCampaigns((prev) => [...prev, newCampaign]);
  setActiveCampaignId(newCampaign.id);

  // Keep the current playbook as the starting template.
  setConfig(newCampaign.config);

  // New campaigns must not inherit operational data.
  setAccounts([]);
  setRunResults([]);
  setFollowUps([]);
  setFeedback({});
  setCompletedPages(new Set());

  // Begin the new campaign from Step 1.
  setPage("setup");
};




  // ── Load campaign ─────────────────────────────────────────────────────────
const loadCampaign = (campaignId) => {
  const selected = campaigns.find((campaign) => campaign.id === campaignId);
  if (!selected) return;

  setActiveCampaignId(selected.id);
  setConfig(selected.config || {});
  setAccounts(selected.accounts || []);
  setRunResults(selected.results || []);
  setFollowUps(selected.followUps || []);
  setFeedback(selected.feedback || {});
};


  // ── Delete campaign ───────────────────────────────────────────────────────
  const deleteCampaign = (campaignId) => {
    if (!window.confirm("Delete this campaign? This cannot be undone.")) return;

    const updated = campaigns.filter((c) => c.id !== campaignId);
    setCampaigns(updated);
    if (updated.length === 0){
      setCampaignCounter(0);
    }
    
    if (campaignId === activeCampaignId) {
      const next = updated[0] || null;
      if (next) {
        loadCampaign(next.id);
      } else {
        setActiveCampaignId(null);
        setConfig({});
        setAccounts([]);
        setRunResults([]);
        setFollowUps([]);
        setFeedback({});
        setCompletedPages(new Set());
        setPage("setup");
      }
    }
  };

  // ── Rename campaign ───────────────────────────────────────────────────────
  const startRename = (e, campaign) => {
    e.stopPropagation();
    setRenamingId(campaign.id);
    setRenameValue(campaign.name);
    // Focus the input after render
    setTimeout(() => renameInputRef.current?.focus(), 0);
  };

  const commitRename = (campaignId) => {
    const trimmed = renameValue.trim();
    if (trimmed) {
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaignId ? { ...c, name: trimmed } : c))
      );
    }
    setRenamingId(null);
    setRenameValue("");
  };

  const handleRenameKeyDown = (e, campaignId) => {
    if (e.key === "Enter") commitRename(campaignId);
    if (e.key === "Escape") {
      setRenamingId(null);
      setRenameValue("");
    }
  };


  // ── Active campaign name ──────────────────────────────────────────────────
  const activeCampaignName =
    campaigns.find((c) => c.id === activeCampaignId)?.name || "No campaign";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="app">

      {/* ── Sidebar ── */}
      <aside className="sidebar">

        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <CometLogo />
          </span>
          <span className="brand-name">Outpace</span>
          <span className="brand-tag">AI SDR</span>
        </div>

        {/* Workflow — numbered because the steps happen in this order */}
        <nav aria-label="Workflow">
          <div className="sidebar-label">Workflow</div>
          <div className="steps">
            {navItems.map((item, index) => {
              const isDone = completedPages.has(item.id) && page !== item.id;
              return (
                <button
                  key={item.id}
                  className={[
                    "step-link",
                    page === item.id ? "active" : "",
                    isDone ? "done" : "",
                  ].join(" ").trim()}
                  aria-current={page === item.id ? "page" : undefined}
                  onClick={() => goTo(item.id)}
                >
                  <span className="step-icon">
                    <NavIcon id={item.id} />
                  </span>
                  <span className="step-text">
                    <span className="step-title">
                      <span className="visually-hidden">Step {index + 1}: </span>
                      {item.label}
                    </span>
                    <span className="step-meta">{item.meta}</span>
                  </span>
                  {isDone && <span className="step-done">Done</span>}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Campaigns */}
        <div>
          <div className="sidebar-label">
            Campaigns
            <button className="campaign-new-btn" onClick={handleNewCampaign}>
              + New
            </button>
          </div>

          {campaigns.length === 0 ? (
            <p className="campaign-empty">
              Your work is saved as you go. Start a new campaign to keep it separate.
            </p>
          ) : (
            <div className="campaign-history-list">
              {[...campaigns].reverse().map((campaign) => (
                <div
                  key={campaign.id}
                  className={
                    campaign.id === activeCampaignId
                      ? "campaign-history-row active"
                      : "campaign-history-row"
                  }
                >
                  {renamingId === campaign.id ? (
                    <input
                      ref={renameInputRef}
                      type="text"
                      className="campaign-rename-input"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(campaign.id)}
                      onKeyDown={(e) => handleRenameKeyDown(e, campaign.id)}
                    />
                  ) : (
                    <button
                      className="campaign-history-name"
                      onClick={() => loadCampaign(campaign.id)}
                    >
                      {campaign.name}
                      <small>
                        {campaign.accounts?.length || 0} account
                        {campaign.accounts?.length === 1 ? "" : "s"}
                      </small>
                    </button>
                  )}

                  <button
                    className="campaign-rename-btn"
                    onClick={(e) => startRename(e, campaign)}
                    title="Rename campaign"
                    aria-label={`Rename ${campaign.name}`}
                  >
                    ✎
                  </button>
                  <button
                    className="campaign-delete-btn"
                    onClick={() => deleteCampaign(campaign.id)}
                    title="Delete campaign"
                    aria-label={`Delete ${campaign.name}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sidebar-spacer" />

        {/* Connections */}
        <div>
          <div className="sidebar-label">Connections</div>
          <div className="system-status">
            <div className={`system-status-row ${aiStatus?.configured ? "ok" : "warn"}`}>
              <span className="dot" />
              {!backendStatus
                ? "Checking backend…"
                : !backendStatus.online
                  ? "Backend offline — using demo AI"
                  : aiStatus?.configured
                    ? `${aiStatus.provider === "gemini" ? "Gemini" : "Claude"} connected`
                    : "No AI key — using demo AI"}
            </div>
            <div className={`system-status-row ${backendStatus?.email ? "ok" : "warn"}`}>
              <span className="dot" />
              {backendStatus?.email
                ? `Sending as ${backendStatus.emailFrom}`
                : "Email sending not set up"}
            </div>
          </div>
        </div>

        <button className="sidebar-reset-btn" onClick={handleReset}>
          Reset all data
        </button>
      </aside>

      {/* ── Main content ── */}
      <main className="main">

        {/* Agent strip — what the agent is doing, on every page */}
        <div
          className={`agent-strip ${agentActivity ? "working" : "idle"}`}
          role="status"
          aria-live="polite"
        >
          {agentActivity ? (
            <span className="agent-dots" aria-hidden="true">
              <i /><i /><i />
            </span>
          ) : (
            <span className="agent-light" aria-hidden="true" />
          )}
          <span className="agent-state">{agentActivity ? "Working" : "Idle"}</span>
          <span className="agent-text">{agentActivity || idleHint}</span>
          <span className="agent-chips">
            <span className="agent-chip">{activeCampaignName}</span>
            <span className="agent-chip">{aiChip}</span>
            <span className={`agent-chip ${deliveryMode === "live" ? "live" : ""}`}>
              {deliveryMode === "simulate"
                ? "Simulated sends"
                : deliveryMode === "test"
                  ? "Test inbox"
                  : "Live sends"}
            </span>
          </span>
        </div>

        <div className="page">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span>{activeCampaignName}</span>
            <ChevronRight />
            <span aria-current="page">{navItems[pageIndex]?.label}</span>
            <span className="breadcrumb-step">
              Step {pageIndex + 1} of {navItems.length}
            </span>
          </nav>

          {page === "setup" && (
            <SetupPage
              config={config}
              setConfig={setConfig}
              onNext={() => next("setup", "accounts")}
            />
          )}

          {page === "accounts" && (
            <AccountsPage
              accounts={accounts}
              setAccounts={setAccounts}
              setRunResults={setRunResults}
              setFollowUps={setFollowUps}
              setFeedback={setFeedback}
              onNext={() => next("accounts", "run")}
            />
          )}

          {page === "run" && (
            <RunPage
              config={config}
              accounts={accounts}
              setAccounts={setAccounts}
              runResults={runResults}
              setRunResults={setRunResults}
              feedback={feedback}
              onAgentActivity={setAgentActivity}
              onAddAccounts={() => goTo("accounts")}
            />
          )}

          {page === "feedback" && (
            <FeedbackPage
              results={runResults}
              feedback={feedback}
              setFeedback={setFeedback}
            />
          )}

          {page === "cadence" && (
            <CadencePage
              config={config}
              setConfig={setConfig}
              accounts={accounts}
              setAccounts={setAccounts}
              runResults={runResults}
              followUps={followUps}
              setFollowUps={setFollowUps}
              feedback={feedback}
              onAgentActivity={setAgentActivity}
            />
          )}

          {/* Setup and Accounts have their own gated Continue buttons */}
          {(page === "run" || page === "feedback") && (
            <div className="page-next">
              <button
                className="btn btn-secondary"
                onClick={() =>
                  page === "run" ? next("run", "feedback") : next("feedback", "cadence")
                }
              >
                {page === "run" ? "Next: review drafts →" : "Next: follow-ups →"}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
