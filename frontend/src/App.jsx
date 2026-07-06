// ─── App.jsx ──────────────────────────────────────────────────────────────────
// Root component. Responsible for:
//   1. Persistent state (config, accounts, runResults, completedPages).
//   2. The sidebar and navigation.
//   3. Rendering the correct page component based on `page` state.
//
// All page-level UI lives in src/pages/. All helpers are in src/utils/.

// Issues fixed:
// - Campaign numbering now uses a monotonic counter (never reuses numbers after delete)
// - Inline rename with pencil icon (no crash)

import { useState, useEffect, useRef } from "react";
import { loadFromStorage, saveToStorage } from "./utils/helpers";

// ── Page components ──────────────────────────────────────────────────────────
import SetupPage    from "./pages/SetupPage";
import AccountsPage from "./pages/AccountsPage";
import RunPage      from "./pages/RunPage";
import FeedbackPage from "./pages/FeedbackPage";

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

  // Rename state: which campaign is being edited, and the draft value
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef(null);

  // ── Persist state ─────────────────────────────────────────────────────────
  useEffect(() => { saveToStorage("outpace_config", config); }, [config]);
  useEffect(() => { saveToStorage("outpace_accounts", accounts); }, [accounts]);
  useEffect(() => { saveToStorage("outpace_runResults", runResults); }, [runResults]);
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
              updatedAt: new Date().toISOString(),
            }
          : campaign
      )
    );
  }, 150);
  return () => window.clearTimeout(saveTimer);
}, [feedback, config, accounts, runResults, activeCampaignId]);
//small 150 ms autosave debounce i.e. saves after 150 ms of no typing



  // ── Navigation ────────────────────────────────────────────────────────────
  const goTo = (targetPage) => setPage(targetPage);
  const next = (from, to) => {
    setCompletedPages((prev) => new Set([...prev, from]));
    setPage(to);
  };

  const navItems = [
    { id: "setup",    label: "Playbook setup"    },
    { id: "accounts", label: "Account list"      },
    { id: "run",      label: "Run campaign"      },
    { id: "feedback", label: "Review & feedback" },
  ];

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    [
      "outpace_config", "outpace_accounts", "outpace_runResults",
      "outpace_completedPages", "campaigns", "activeCampaignId",
      "campaignCounter", "config", "accounts", "runResults", "feedback",
    ].forEach((key) => localStorage.removeItem(key));

    setConfig({});
    setAccounts([]);
    setRunResults([]);
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
    feedback: {},
  };

  setCampaigns((prev) => [...prev, newCampaign]);
  setActiveCampaignId(newCampaign.id);

  // Keep the current playbook as the starting template.
  setConfig(newCampaign.config);

  // New campaigns must not inherit operational data.
  setAccounts([]);
  setRunResults([]);
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
    campaigns.find((c) => c.id === activeCampaignId)?.name || "No Campaign";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="app">

      {/* ── Sidebar ── */}
      <aside className="sidebar">

        <div className="sidebar-logo">
          <h1>OUTPACE</h1>
          <p>SDR Agent - Phase 1</p>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Active Campaign</div>
          <div className="active-campaign-box">{activeCampaignName}</div>
        </div>

        {/* Navigation */}
        <div className="nav-section">
          <p className="nav-label">Workflow</p>
          {navItems.map((item) => (
            <div
              key={item.id}
              className={[
                "nav-item",
                page === item.id            ? "active" : "",
                completedPages.has(item.id) ? "done"   : "",
              ].join(" ").trim()}
              onClick={() => goTo(item.id)}
            >
              <span className="dot" />
              {item.label}
            </div>
          ))}
        </div>

        {/* Campaign history */}
        <div className="sidebar-section">
          <div className="sidebar-label">Campaign History</div>

          <button className="new-campaign-btn" onClick={handleNewCampaign}>
            + New Campaign
          </button>

          <div className="campaign-history-list">
            {[...campaigns]
              .reverse()
              .map((campaign) => (
              //latest are now on top of list
              
              <div
                key={campaign.id}
                className={
                  campaign.id === activeCampaignId
                    ? "campaign-history-row active"
                    : "campaign-history-row"
                }
              >
                {renamingId === campaign.id ? (
                  /* ── Inline rename input ── */
                  <input
                    ref={renameInputRef}
                    className="campaign-rename-input"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => commitRename(campaign.id)}
                    onKeyDown={(e) => handleRenameKeyDown(e, campaign.id)}
                  />
                ) : (
                  /* ── Normal name button ── */
                  <button
                    className="campaign-history-name"
                    onClick={() => loadCampaign(campaign.id)}
                  >
                    <div>
                      <div>{campaign.name}</div>
                      <small>
                        {campaign.accounts?.length > 0
                          ? `${campaign.accounts.length} accounts`
                          : "0 accounts"}
                      </small>
                    </div>
                  </button>
                )}

                {/* Pencil rename button */}
                <button
                  className="campaign-rename-btn"
                  onClick={(e) => startRename(e, campaign)}
                  title="Rename campaign"
                >
                  ✎
                </button>

                {/* Delete button */}
                <button
                  className="campaign-delete-btn"
                  onClick={() => deleteCampaign(campaign.id)}
                  title="Delete campaign"
                >
                  ⨯
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-spacer" />

        <div className="sidebar-footer">
          <p className="sidebar-footer-text">
            Phase 1 of 3<br />
            Agents follow your methodology.<br />
            Phase 2 adds cadences + feedback loops.<br />
            Phase 3 adds prospecting.
          </p>
          <button
            className="btn btn-danger btn-sm sidebar-reset-btn"
            onClick={handleReset}
          >
            Reset Demo Data
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="main">
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
          />
        )}

        {page === "feedback" && (
          <FeedbackPage
            results={runResults}
            feedback={feedback}
            setFeedback={setFeedback}
          />
        )}
      </main>
    </div>
  );
}