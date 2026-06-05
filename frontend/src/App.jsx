import { useState, useRef, useCallback } from "react";
import "./App.css";

// ─── Helpers ───────────────────────────────────────────────────────────────
function now() {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}


// This function must be used when Claude API is present


// async function callClaude(systemPrompt, userPrompt) {
//   const res = await fetch("http://localhost:8000/api/claude", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       systemPrompt,
//       userPrompt,
//     }),
//   });

//   const data = await res.json();

//   if (!res.ok) {
//     throw new Error(data.detail || "Claude request failed");
//   }

//   return data.text;
// }




//Mock Claude

async function callClaude(systemPrompt, userPrompt) {
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const isEmailRequest = systemPrompt.includes("sales copywriter");

  if (isEmailRequest) {
    return JSON.stringify({
      subject: "Quick idea for your outbound workflow",
      body:
        "Hi there,\n\nNoticed your team is growing and likely handling more outbound work.\n\nUsually at this stage, personalization becomes harder to maintain without adding more SDR headcount.\n\nWe help teams use AI agents to research accounts and draft personalized outreach, so reps can spend more time selling instead of manually researching.\n\nWorth a quick 15-minute chat next week?\n\nBest,\nAdib",
    });
  }

  return JSON.stringify({
    pain_points: [
      "Manual prospect research",
      "Inconsistent email personalization",
    ],
    opportunity:
      "AI SDR agents can help the team scale outbound without increasing manual SDR workload.",
    angle:
      "Growth creates pressure to personalize outreach faster without adding more headcount.",
    tone_notes: "Keep the email short, direct, and relevant.",
  });
}


// ─── Page Components ───────────────────────────────────────────────────────

function SetupPage({ config, setConfig, onNext }) {
  const fileRef = useRef();
  const [fileNames, setFileNames] = useState({ research: null, outreach: null, accounts: null });

  const handleFile = (key) => (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setConfig(c => ({ ...c, [key]: ev.target.result }));
      setFileNames(n => ({ ...n, [key]: f.name }));
    };
    reader.readAsText(f);
  };

  const ready = config.researchGuide && config.outreachGuide && config.serviceDescription;

  return (
    <div>
      <div className="page-header">
        <h2>Upload your playbook</h2>
        <p>Your proven methodology becomes the agent's operating instructions.</p>
      </div>

      <div className="card">
        <h3>Your service & ICP</h3>
        <p className="sub">The agent needs to know what you sell and who you sell it to.</p>
        <div className="field">
          <label>What does your company do? (1–3 sentences)</label>
          <textarea rows={3} placeholder="We help mid-market SaaS companies build repeatable revenue by..." value={config.serviceDescription || ""} onChange={e => setConfig(c => ({ ...c, serviceDescription: e.target.value }))} />
        </div>
        <div className="field">
          <label>Ideal customer profile</label>
          <textarea rows={2} placeholder="B2B SaaS, Series A–C, 50–500 employees, no dedicated RevOps..." value={config.icp || ""} onChange={e => setConfig(c => ({ ...c, icp: e.target.value }))} />
        </div>
        <div className="field">
          <label>Your name & role (used in email signatures)</label>
          <input type="text" placeholder="Alex Kim, Founding AE at Acme" value={config.senderName || ""} onChange={e => setConfig(c => ({ ...c, senderName: e.target.value }))} />
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Research guide</h3>
          <p className="sub">Your guide for how to research an account</p>
          <div className="upload-zone" style={fileNames.research ? { borderStyle: "solid" } : {}} onClick={() => document.getElementById("res-input").click()}>
            <p>{fileNames.research ? `✓ ${fileNames.research}` : "Click to upload .txt or .md"}</p>
            {!fileNames.research && <p style={{ fontSize: 11, marginTop: 4, color: "var(--text3)" }}>or paste below</p>}
          </div>
          <input id="res-input" type="file" accept=".txt,.md" style={{ display: "none" }} onChange={handleFile("researchGuide")} />
          <textarea rows={5} style={{ marginTop: 10 }} placeholder="Research guide — paste here if not uploading a file..." value={config.researchGuide || ""} onChange={e => setConfig(c => ({ ...c, researchGuide: e.target.value }))} />
        </div>

        <div className="card">
          <h3>Outreach guide</h3>
          <p className="sub">Email structure, tone rules, what to avoid</p>
          <div className="upload-zone" style={fileNames.outreach ? { borderStyle: "solid" } : {}} onClick={() => document.getElementById("out-input").click()}>
            <p>{fileNames.outreach ? `✓ ${fileNames.outreach}` : "Click to upload .txt or .md"}</p>
            {!fileNames.outreach && <p style={{ fontSize: 11, marginTop: 4, color: "var(--text3)" }}>or paste below</p>}
          </div>
          <input id="out-input" type="file" accept=".txt,.md" style={{ display: "none" }} onChange={handleFile("outreachGuide")} />
          <textarea rows={5} style={{ marginTop: 10 }} placeholder="Outreach guide — paste here..." value={config.outreachGuide || ""} onChange={e => setConfig(c => ({ ...c, outreachGuide: e.target.value }))} />
        </div>
      </div>

      <div className="card">
        <h3>Email templates (optional)</h3>
        <p className="sub">Paste your best-performing templates — the agent learns your voice from these.</p>
        <textarea rows={6} placeholder="Template 1:\nSubject: ...\nBody: ..." value={config.templates || ""} onChange={e => setConfig(c => ({ ...c, templates: e.target.value }))} />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <button className="btn btn-primary" disabled={!ready} onClick={onNext}>
          Continue to accounts →
        </button>
      </div>
    </div>
  );
}

function AccountsPage({ accounts, setAccounts, onNext }) {
  const [csvText, setCsvText] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ company: "", contact: "", title: "", email: "", industry: "", notes: "" });

  const parseCSV = () => {
    const rows = csvText.trim().split("\n").filter(Boolean);
    const parsed = rows.slice(1).map((row, i) => {
      const cols = row.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
      return { id: Date.now() + i, company: cols[0] || "", contact: cols[1] || "", title: cols[2] || "", email: cols[3] || "", industry: cols[4] || "", notes: cols[5] || "", status: "pending" };
    }).filter(a => a.company);
    if (parsed.length) setAccounts(parsed);
  };

  const addManual = () => {
    if (!manualForm.company || !manualForm.email) return;
    setAccounts(a => [...a, { ...manualForm, id: Date.now(), status: "pending" }]);
    setManualForm({ company: "", contact: "", title: "", email: "", industry: "", notes: "" });
    setShowManual(false);
  };



  return (
    <div>
      <div className="page-header">
        <h2>Account list</h2>
        <p>Add the accounts your agents will research and contact.</p>
      </div>

      <div className="card">
        <div className="row-between" style={{ marginBottom: 16 }}>
          <div>
            <h3>Import CSV</h3>
            <p className="sub" style={{ margin: 0 }}>Columns: Company, Contact Name, Title, Email, Industry, Notes</p>
          </div>
          
        </div>
        <textarea rows={4} placeholder={"Company,Contact Name,Title,Email,Industry,Notes\nAcme Corp,Jane Smith,VP Sales,jane@acme.com,SaaS,Recent funding"} value={csvText} onChange={e => setCsvText(e.target.value)} />
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={parseCSV}>Parse CSV</button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowManual(v => !v)}
            >
            {showManual ? "Close" : "+ Add manually"}
            </button>
        </div>
      </div>

      {showManual && (
        <div className="card">
          <h3>Add account</h3>
          <div className="grid-2" style={{ marginTop: 12 }}>
            {["company", "contact", "title", "email", "industry"].map(f => (
              <div className="field" key={f}>
                <label>{f.charAt(0).toUpperCase() + f.slice(1)}</label>
                <input type="text" value={manualForm[f]} onChange={e => setManualForm(m => ({ ...m, [f]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div className="field">
            <label>Notes / context</label>
            <input type="text" value={manualForm.notes} onChange={e => setManualForm(m => ({ ...m, notes: e.target.value }))} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={addManual}>Add account</button>
        </div>
      )}

      {accounts.length > 0 && (
        <div className="card">
          <div className="row-between" style={{ marginBottom: 16 }}>
            <h3>{accounts.length} account{accounts.length > 1 ? "s" : ""} loaded</h3>
            <button className="btn btn-danger btn-sm" onClick={() => setAccounts([])}>Clear all</button>
          </div>
          <table className="account-table">
            <thead>
              <tr>
                <th>Company</th><th>Contact</th><th>Email</th><th>Industry</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(a => (
                <tr key={a.id}>
                  <td><strong style={{ fontSize: 13 }}>{a.company}</strong>{a.notes && <div style={{ color: "var(--text3)", fontSize: 11, marginTop: 2 }}>{a.notes}</div>}</td>
                  <td>{a.contact}<div style={{ color: "var(--text3)", fontSize: 11 }}>{a.title}</div></td>
                  <td style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{a.email}</td>
                  <td><span className="tag tag-purple">{a.industry || "—"}</span></td>
                  <td><span className={`tag ${a.status === "sent" ? "tag-green" : a.status === "error" ? "tag-red" : a.status === "researching" ? "tag-amber" : "tag-cyan"}`}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <button className="btn btn-primary" disabled={accounts.length === 0} onClick={onNext}>
          Run campaign →
        </button>
      </div>
    </div>
  );
}

function RunPage({ config, accounts, setAccounts, setRunResults }) {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState(0);
  const [activePreview, setActivePreview] = useState(null);
  const [done, setDone] = useState(false);
  const abortRef = useRef(false);

  const addLog = (msg, type = "") => {
    setLogs(l => [...l, { time: now(), msg, type }]);
  };

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

  const runCampaign = async () => {
    abortRef.current = false;
    setRunning(true);
    setDone(false);
    setLogs([]);
    setResults([]);
    setProgress(0);

    const pending = accounts.filter(a => a.status === "pending");
    if (!pending.length) { addLog("No pending accounts.", "err"); setRunning(false); return; }

    addLog(`Starting campaign — ${pending.length} accounts`, "info");

    for (let i = 0; i < pending.length; i++) {
      if (abortRef.current) { addLog("Campaign stopped by user.", "err"); break; }
      const acct = pending[i];
      setAccounts(prev => prev.map(a => a.id === acct.id ? { ...a, status: "researching" } : a));

      try {
        // Step 1: Research
        addLog(`[${acct.company}] Researching account...`);
        const researchRaw = await callClaude(RESEARCH_SYSTEM,
          `Account: ${acct.company}\nContact: ${acct.contact} (${acct.title})\nIndustry: ${acct.industry}\nNotes: ${acct.notes}\nEmail: ${acct.email}`
        );
        let research;
        try { research = JSON.parse(researchRaw.replace(/```json|```/g, "").trim()); }
        catch { research = { angle: researchRaw.slice(0, 200), pain_points: [], opportunity: "", tone_notes: "" }; }
        addLog(`[${acct.company}] Research complete — angle: "${research.angle?.slice(0, 60)}..."`, "ok");

        // Step 2: Draft email
        addLog(`[${acct.company}] Drafting personalised email...`);
        const emailRaw = await callClaude(EMAIL_SYSTEM,
          `Contact: ${acct.contact}, ${acct.title} at ${acct.company}\nIndustry: ${acct.industry}\nResearch brief:\n${JSON.stringify(research, null, 2)}`
        );
        let email;
        try { email = JSON.parse(emailRaw.replace(/```json|```/g, "").trim()); }
        catch { email = { subject: "Following up", body: emailRaw }; }
        addLog(`[${acct.company}] Email drafted — subject: "${email.subject}"`, "ok");

  
        // Step 3: "Send" (demo mode: simulated send)
        addLog(`[${acct.company}] Sending to ${acct.email}...`);

          await new Promise(r => setTimeout(r, 600));

         const newResult = {
            ...acct,
            research,
            generatedEmail: email,
            sentAt: new Date().toISOString()
          };

          setAccounts(prev =>
            prev.map(a =>
              a.id === acct.id ? { ...a, status: "sent" } : a
            )
          );

          setResults(prev => [...prev, newResult]);
          if (setRunResults) {
              setRunResults(prev => [...prev, newResult]);
            }

          addLog(`[${acct.company}] ✓ Sent successfully`, "ok");
      } catch (err) {
        setAccounts(prev => prev.map(a => a.id === acct.id ? { ...a, status: "error" } : a));
        addLog(`[${acct.company}] ✗ Error: ${err.message}`, "err");
      }

      setProgress(Math.round(((i + 1) / pending.length) * 100));
    }
    addLog(`Campaign complete ...`);
    setRunning(false);
    setDone(true);
  };

  const stop = () => { abortRef.current = true; };

  const sent = accounts.filter(a => a.status === "sent").length;
  const errors = accounts.filter(a => a.status === "error").length;
  const pending = accounts.filter(a => a.status === "pending").length;

  return (
    <div>
      <div className="page-header">
        <h2>Run campaign</h2>
        <p>The agent will research each account, draft a personalised email, and send automatically.</p>
      </div>

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="stat-card"><div className="num" style={{ color: "var(--text2)" }}>{pending}</div><div className="lbl">pending</div></div>
        <div className="stat-card"><div className="num" style={{ color: "var(--accent3)" }}>{sent}</div><div className="lbl">sent</div></div>
        <div className="stat-card"><div className="num" style={{ color: "var(--danger)" }}>{errors}</div><div className="lbl">errors</div></div>
      </div>

      <div className="card">
        <div className="row-between" style={{ marginBottom: 16 }}>
          <div>
            <h3>Campaign controls</h3>
            <p className="sub" style={{ margin: 0 }}>Phase 1 — research, draft, and send</p>
          </div>
          <div className="row">
            {running
              ? <button className="btn btn-danger btn-sm" onClick={stop}>Stop</button>
              : <button className="btn btn-primary" onClick={runCampaign} disabled={pending === 0}>
                  {done ? "Re-run pending" : "▶ Start campaign"}
                </button>
            }
          </div>
        </div>

        {(running || done) && (
          <div className="progress-row">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text2)", minWidth: 36 }}>{progress}%</span>
          </div>
        )}

        <div className="status-bar">
          <div className={`status-dot ${running ? "working" : done ? "done" : "idle"}`} />
          <span>{running ? "Agent working..." : done ? `Done — ${sent} sent` : "Ready to run"}</span>
        </div>

        {logs.length > 0 && (
          <div style={{ marginTop: 14, maxHeight: 220, overflowY: "auto", background: "var(--bg)", borderRadius: "var(--r)", padding: "10px 14px" }}>
            {logs.map((l, i) => (
              <div key={i} className="log-entry">
                <span className="log-time">{l.time}</span>
                <span className={`log-msg ${l.type}`}>{l.msg}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Results — {results.length} email{results.length > 1 ? "s" : ""} sent</h3>
          {results.map((r, i) => (
            <div key={r.id} style={{ marginBottom: 12, borderBottom: i < results.length - 1 ? "1px solid var(--border)" : "none", paddingBottom: 12 }}>
              <div className="row-between">
                <div>
                  <strong style={{ fontSize: 13 }}>{r.company}</strong>
                  <span style={{ color: "var(--text3)", fontSize: 12, marginLeft: 10 }}>{r.contact} · {r.email}</span>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setActivePreview(activePreview === r.id ? null : r.id)}>
                  {activePreview === r.id ? "Hide" : "View email"}
                </button>
              </div>
              {r.research?.angle && (
                <p style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)", marginTop: 6 }}>
                  Angle: {r.research.angle}
                </p>
              )}
              {activePreview === r.id && r.email && (
                <div className="email-preview" style={{ marginTop: 10 }}>
                  <div className="subject-line">Subject: {r.generatedEmail.subject}</div>
                  {r.generatedEmail.body}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FeedbackPage({ results }) {
  const [feedback, setFeedback] = useState({});

  if (!results.length) return (
    <div>
      <div className="page-header"><h2>Feedback</h2><p>Run a campaign first — then review and annotate each email here.</p></div>
      <div className="card" style={{ color: "var(--text3)", fontFamily: "var(--mono)", fontSize: 13, textAlign: "center", padding: 48 }}>No results yet.</div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h2>Review & feedback</h2>
        <p>Annotate each email. Your feedback trains Phase 2 agents to self-improve.</p>
      </div>
      {results.map(r => (
        <div className="card" key={r.id}>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <div>
              <strong>{r.company}</strong>
              <span style={{ fontSize: 12, color: "var(--text3)", marginLeft: 8 }}>{r.contact}</span>
            </div>
            <div className="row">
              {["✓ Good", "~ OK", "✗ Poor"].map(label => (
                <button key={label} className="btn btn-secondary btn-sm"
                  style={feedback[r.id]?.rating === label ? { borderColor: "var(--accent)", color: "var(--accent)" } : {}}
                  onClick={() => setFeedback(f => ({ ...f, [r.id]: { ...f[r.id], rating: label } }))}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {r.email && (
            <div className="email-preview" style={{ marginBottom: 10 }}>
              <div className="subject-line">Subject: {r.email.subject}</div>
              {r.email.body}
            </div>
          )}
          <div className="field" style={{ marginBottom: 0 }}>
            <label>What should the agent do differently?</label>
            <textarea rows={2} placeholder="E.g. Lead with the ROI angle, not the pain point. Subject line too long. Missing CTA." value={feedback[r.id]?.notes || ""} onChange={e => setFeedback(f => ({ ...f, [r.id]: { ...f[r.id], notes: e.target.value } }))} />
          </div>
        </div>
      ))}
      <div style={{ marginTop: 8, fontFamily: "var(--mono)", fontSize: 12, color: "var(--text3)" }}>
        Feedback is stored in-session. In Phase 2, this trains the agent's refinement loop automatically.
      </div>
    </div>
  );
}

// ─── Root App ──────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("setup");
  const [config, setConfig] = useState({});
  const [accounts, setAccounts] = useState([]);
  const [results, setResults] = useState([]);
  const [completedPages, setCompletedPages] = useState(new Set());

  const goTo = (p) => setPage(p);
  const next = (from, to) => {
    setCompletedPages(s => new Set([...s, from]));
    setPage(to);
  };

  const syncResults = (updatedAccounts) => {
    setAccounts(updatedAccounts);
  };

  const [runResults, setRunResults] = useState([]);

  const nav = [
    { id: "setup", label: "Playbook setup" },
    { id: "accounts", label: "Account list" },
    { id: "run", label: "Run campaign" },
    { id: "feedback", label: "Review & feedback" },
  ];

  return (
    <>
      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <h1>OUTPACE</h1>
            <p>SDR Agent - Phase 1</p>
          </div>
          <div className="nav-section">
            <p className="nav-label">Workflow</p>
            {nav.map(n => (
              <div key={n.id} className={`nav-item${page === n.id ? " active" : ""}${completedPages.has(n.id) ? " done" : ""}`} onClick={() => goTo(n.id)}>
                <span className="dot" />
                {n.label}
              </div>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)" }}>
            <p style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)", lineHeight: 1.6 }}>
              Phase 1 of 3<br />
              Agents follow your methodology.<br />
              Phase 2 adds cadences + feedback loops.<br />
              Phase 3 adds prospecting.
            </p>
          </div>
        </aside>
        <main className="main">
          {page === "setup" && <SetupPage config={config} setConfig={setConfig} onNext={() => next("setup", "accounts")} />}
          {page === "accounts" && <AccountsPage accounts={accounts} setAccounts={setAccounts} onNext={() => next("accounts", "run")} />}
          {page === "run" && (
              <RunPage
                config={config}
                accounts={accounts}
                setAccounts={setAccounts}
                setRunResults={setRunResults}
              />
            )}
          {page === "feedback" && <FeedbackPage results={runResults} />}
        </main>
      </div>
    </>
  );
}
