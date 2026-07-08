// ─── AccountsPage.jsx ─────────────────────────────────────────────────────────
// Step 2 of the workflow.
// The user imports accounts either by pasting CSV text or by adding them one
// by one via a manual form. A table shows all loaded accounts with their status.

import { useState } from "react";
import "./AccountsPage.css";

export default function AccountsPage({ accounts, setAccounts, setRunResults, setFollowUps, setFeedback, onNext }) {
  // Raw CSV text typed/pasted by the user
  const [csvText, setCsvText] = useState("");

  // Controls whether the manual-add form is visible
  const [showManual, setShowManual] = useState(false);

  // Holds the values for the manual-add form fields
  const [manualForm, setManualForm] = useState({
    company: "",
    contact: "",
    title: "",
    email: "",
    industry: "",
    notes: "",
  });

  // ── CSV parser ────────────────────────────────────────────────────────────
  // Expects the first row to be a header (skipped) and subsequent rows to
  // have columns: Company, Contact Name, Title, Email, Industry, Notes.
  
  const parseCSV = () => {
  const rows = csvText.trim().split("\n").filter(Boolean);

  if (rows.length <= 1) return;

  const parsed = rows
    .slice(1)
    .map((row) => {
      const cols = row
        .split(",")
        .map((cell) => cell.trim().replace(/^"|"$/g, ""));

      return {
        id: crypto.randomUUID(),
        company: cols[0] || "",
        contact: cols[1] || "",
        title: cols[2] || "",
        email: cols[3] || "",
        industry: cols[4] || "",
        notes: cols[5] || "",
        status: "pending",
      };
    })
    .filter((account) => account.company && account.email);

  if (!parsed.length) return;

  setAccounts((previousAccounts) => {
    const existingEmails = new Set(
      previousAccounts.map((account) =>
        account.email.trim().toLowerCase()
      )
    );

    const uniqueNewAccounts = parsed.filter((account) => {
      const normalizedEmail = account.email.trim().toLowerCase();

      if (existingEmails.has(normalizedEmail)) {
        return false;
      }

      existingEmails.add(normalizedEmail);
      return true;
    });

    return [...previousAccounts, ...uniqueNewAccounts];
  });

  setCsvText("");
};




  // ── Manual add ────────────────────────────────────────────────────────────
  // Appends a new account to the list and resets the form.
  const addManual = () => {
    if (!manualForm.company || !manualForm.email) return;

    setAccounts((prev) => [
      ...prev,
      { ...manualForm, id: Date.now(), status: "pending" },
    ]);

    // Reset form fields
    setManualForm({
      company: "",
      contact: "",
      title: "",
      email: "",
      industry: "",
      notes: "",
    });
    setShowManual(false);
  };

  // ── Status tag colour helper ──────────────────────────────────────────────
  // Maps an account status string to the matching CSS tag class.
  const statusTagClass = (status) => {
    const map = {
      sent: "tag-green",
      error: "tag-red",
      researching: "tag-amber",
    };
    return map[status] || "tag-cyan"; // default (pending) = cyan
  };

  return (
    <div>
      {/* ── Page header ── */}
      <div className="page-header">
        <h2>Account list</h2>
        <p>Add the accounts your agents will research and contact.</p>
      </div>

      {/* ── CSV import card ── */}
      <div className="card">
        <div className="row-between accounts-import-header">
          <div>
            <h3>Import CSV</h3>
            <p className="sub accounts-import-sub">
              Columns: Company, Contact Name, Title, Email, Industry, Notes
            </p>
          </div>
        </div>

        <textarea
          rows={4}
          placeholder={
            "Company,Contact Name,Title,Email,Industry,Notes\n" +
            "Acme Corp,Jane Smith,VP Sales,jane@acme.com,SaaS,Recent funding"
          }
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
        />

        <div className="accounts-import-actions">
          <button className="btn btn-secondary btn-sm" onClick={parseCSV}>
            Parse CSV
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowManual((v) => !v)}
          >
            {showManual ? "Close" : "+ Add manually"}
          </button>
        </div>
      </div>

      {/* ── Manual add form (conditionally shown) ── */}
      {showManual && (
        <div className="card">
          <div className="row-between" style={{ marginBottom: 12 }}>
            <h3>Add account</h3>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowManual(false)}
            >
              Close
            </button>
          </div>

          {/* Two-column grid for most fields */}
          <div className="grid-2 accounts-manual-fields">
            {["company", "contact", "title", "email", "industry"].map((fieldName) => (
              <div className="field" key={fieldName}>
                <label>{fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}</label>
                <input
                  type="text"
                  value={manualForm[fieldName]}
                  onChange={(e) =>
                    setManualForm((prev) => ({ ...prev, [fieldName]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>

          {/* Notes spans the full width */}
          <div className="field">
            <label>Notes / context</label>
            <input
              type="text"
              value={manualForm.notes}
              onChange={(e) =>
                setManualForm((prev) => ({ ...prev, notes: e.target.value }))
              }
            />
          </div>

          <button className="btn btn-primary btn-sm" onClick={addManual}>
            Add account
          </button>
        </div>
      )}

      {/* ── Accounts table ── */}
      {accounts.length > 0 && (
        <div className="card">
          <div className="row-between accounts-table-header">
            <h3>
              {accounts.length} account{accounts.length > 1 ? "s" : ""} loaded
            </h3>
            <button
              className="btn btn-danger btn-sm"
                  onClick={() => {
                  const confirmed = window.confirm(
                    "Are you sure you want to delete all accounts?"
                  );

                  if (!confirmed) return;

                  setAccounts([]);
                  setRunResults([]);
                  setFollowUps([]);
                  setFeedback({});
                  setCsvText("");
                }}
            >
              Clear all
            </button>
          </div>

          <table className="account-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Industry</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  {/* Company name + optional notes */}
                  <td>
                    <strong className="accounts-company-name">
                      {account.company}
                    </strong>
                    {account.notes && (
                      <div className="accounts-company-notes">
                        {account.notes}
                      </div>
                    )}
                  </td>

                  {/* Contact name + title */}
                  <td>
                    {account.contact}
                    <div className="accounts-contact-title">{account.title}</div>
                  </td>

                  {/* Email address */}
                  <td className="accounts-email">{account.email}</td>

                  {/* Industry tag */}
                  <td>
                    <span className="tag tag-purple">
                      {account.industry || "—"}
                    </span>
                  </td>

                  {/* Status tag — colour changes with status */}
                  <td>
                    <span className={`tag ${statusTagClass(account.status)}`}>
                      {account.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Continue button ── */}
      <div className="accounts-footer">
        <button
          className="btn btn-primary"
          disabled={accounts.length === 0}
          onClick={onNext}
        >
          Run campaign →
        </button>
      </div>
    </div>
  );
}
