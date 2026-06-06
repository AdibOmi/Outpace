// ─── App.jsx ──────────────────────────────────────────────────────────────────
// Root component. Responsible for:
//   1. Persistent state (config, accounts, runResults, completedPages).
//   2. The sidebar and navigation.
//   3. Rendering the correct page component based on `page` state.
//
// All page-level UI lives in src/pages/. All helpers are in src/utils/.

import { useState, useEffect } from "react";
import { loadFromStorage, saveToStorage } from "./utils/helpers";

// ── Page components ──────────────────────────────────────────────────────────
import SetupPage    from "./pages/SetupPage";
import AccountsPage from "./pages/AccountsPage";
import RunPage      from "./pages/RunPage";
import FeedbackPage from "./pages/FeedbackPage";

// ── Styles ───────────────────────────────────────────────────────────────────
import "./App.css";

export default function App() {
  // Which page is currently active (matches nav item ids below)
  const [page, setPage] = useState("setup");

  // ── Persistent state (auto-saved to localStorage via useEffect) ──────────

  // The user's playbook config: service description, ICP, guides, templates
  const [config, setConfig] = useState(() =>
    loadFromStorage("outpace_config", {})
  );

  // The loaded list of accounts with their statuses
  const [accounts, setAccounts] = useState(() =>
    loadFromStorage("outpace_accounts", [])
  );

  // Results produced by the latest campaign run (passed to FeedbackPage)
  const [runResults, setRunResults] = useState(() =>
    loadFromStorage("outpace_runResults", [])
  );

  // Set of page ids the user has already completed (drives the green dots)
  const [completedPages, setCompletedPages] = useState(
    () => new Set(loadFromStorage("outpace_completedPages", []))
  );

  // ── Persist state changes to localStorage ────────────────────────────────
  useEffect(() => { saveToStorage("outpace_config", config); }, [config]);
  useEffect(() => { saveToStorage("outpace_accounts", accounts); }, [accounts]);
  useEffect(() => { saveToStorage("outpace_runResults", runResults); }, [runResults]);
  useEffect(() => {
    saveToStorage("outpace_completedPages", Array.from(completedPages));
  }, [completedPages]);

  // ── Navigation helpers ────────────────────────────────────────────────────

  /** Jump directly to a page (used by sidebar clicks). */
  const goTo = (targetPage) => setPage(targetPage);

  /**
   * Mark `from` as completed, then navigate to `to`.
   * Called by each page's "Continue" button.
   */
  const next = (from, to) => {
    setCompletedPages((prev) => new Set([...prev, from]));
    setPage(to);
  };

  // ── Sidebar navigation items ──────────────────────────────────────────────
  const navItems = [
    { id: "setup",    label: "Playbook setup"   },
    { id: "accounts", label: "Account list"     },
    { id: "run",      label: "Run campaign"     },
    { id: "feedback", label: "Review & feedback" },
  ];

  // ── Reset handler ─────────────────────────────────────────────────────────
  // Wipes all localStorage keys and resets all state back to defaults.
  const handleReset = () => {
    ["outpace_config", "outpace_accounts", "outpace_runResults", "outpace_completedPages"]
      .forEach((key) => localStorage.removeItem(key));

    setConfig({});
    setAccounts([]);
    setRunResults([]);
    setCompletedPages(new Set());
    setPage("setup");
  };

  return (
    <div className="app">

      {/* ── Sidebar ── */}
      <aside className="sidebar">

        {/* Logo / product name */}
        <div className="sidebar-logo">
          <h1>OUTPACE</h1>
          <p>SDR Agent - Phase 1</p>
        </div>

        {/* Navigation */}
        <div className="nav-section">
          <p className="nav-label">Workflow</p>
          {navItems.map((item) => (
            <div
              key={item.id}
              className={[
                "nav-item",
                page === item.id          ? "active" : "",
                completedPages.has(item.id) ? "done"   : "",
              ].join(" ").trim()}
              onClick={() => goTo(item.id)}
            >
              {/* Dot colour: accent (active) | green (done) | grey (default) */}
              <span className="dot" />
              {item.label}
            </div>
          ))}
        </div>

        {/* Push footer to the bottom */}
        <div className="sidebar-spacer" />

        {/* Phase info + reset button */}
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
            onNext={() => next("accounts", "run")}
          />
        )}

        {page === "run" && (
          <RunPage
            config={config}
            accounts={accounts}
            setAccounts={setAccounts}
            setRunResults={setRunResults}
          />
        )}

        {page === "feedback" && (
          <FeedbackPage results={runResults} />
        )}
      </main>
    </div>
  );
}
