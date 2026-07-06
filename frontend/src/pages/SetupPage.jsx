// Step 1 of the workflow.
// This page collects what the company does, who they sell to (ICP),
// sender info, research methodology, outreach methodology
// succesful email templates (optional)

// Basically teaching the agent how the client sells before allowing it to generate outreach



import { useRef, useState } from "react";
import "./SetupPage.css";

export default function SetupPage({ config, setConfig, onNext }) {
  // Track which files have been uploaded (for the upload-zone label)
  // Config is the shared data object for the entire app (service description, templates, etc)
  const [fileNames, setFileNames] = useState({
    research: null,
    outreach: null,
  });

  //using these to avoid DOM access (React way is less fragile)
  const researchInputRef = useRef(null);
  const outreachInputRef = useRef(null);


  // ── File upload handler ──────────────────────────────────────────────────
  // Reads the chosen file as plain text and stores it in the shared `config`.
  // `key` is the config field to update ("researchGuide" or "outreachGuide").
  
  const handleFile = (configKey, fileNameKey) => (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // to allow larger files 
  const allowedTypes = ["text/plain", "text/markdown"];
  const allowedExtensions = [".txt", ".md"];
  const hasAllowedExtension = allowedExtensions.some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  );

  if (!allowedTypes.includes(file.type) && !hasAllowedExtension) {
    alert("Please upload only .txt or .md files.");
    e.target.value = "";
    return;
  }

  if (file.size > 500000) {
    alert("File is too large. Please upload a file under 500KB.");
    e.target.value = "";
    return;
  }


    const reader = new FileReader();
    reader.onload = (ev) => {
      setConfig((prev) => ({
        ...prev,
        [configKey]: ev.target.result,
      }));

      setFileNames((prev) => ({
        ...prev,
        [fileNameKey]: file.name,
      }));
    };
    reader.readAsText(file);
  };
  // e.g user uploads research-guide.txt, the text (not the file) is stored in config.researchGuide


  // The Continue button requires these four fields
  const ready =
    config.researchGuide && config.outreachGuide && config.serviceDescription && config.icp;



  return (
    <div>
      {/* ── Page header ── */}
      <div className="page-header">
        <h2>Upload your playbook</h2>
        <p>Your proven methodology becomes the agent's operating instructions.</p>
      </div>

      {/* ── Service & ICP card ── */}
      <div className="card">
        <h3>Your service &amp; ICP</h3>
        <p className="sub">The agent needs to know what you sell and who you sell it to.</p>

        <div className="field">
          <label>What does your company do? (1–3 sentences)</label>
          <textarea
            rows={3}
            placeholder="We help mid-market SaaS companies build repeatable revenue by..."
            value={config.serviceDescription || ""}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, serviceDescription: e.target.value }))
            }
          />
        </div>

        <div className="field">
          <label>Ideal customer profile</label>
          <textarea
            rows={2}
            placeholder="B2B SaaS, Series A–C, 50–500 employees, no dedicated RevOps..."
            value={config.icp || ""}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, icp: e.target.value }))
            }
          />
        </div>

        <div className="field">
          <label>Your name &amp; role (used in email signatures)</label>
          <input
            type="text"
            placeholder="Alex Kim, Founding AE at Acme"
            value={config.senderName || ""}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, senderName: e.target.value }))
            }
          />
        </div>
      </div>

      {/* ── Guide upload cards (side by side) ── */}
      <div className="grid-2">

        {/* Research guide */}
        <div className="card">
          <h3>Research guide</h3>
          <p className="sub">Your guide for how to research an account</p>

          {/* Clicking the zone triggers the hidden file input */}
          <div
            className={`upload-zone${fileNames.research ? " filled" : ""}`}
           onClick={() => researchInputRef.current?.click()}
          >
            <p>
              {fileNames.research
                ? `✓ ${fileNames.research}`
                : "Click to upload .txt or .md"}
            </p>
            {!fileNames.research && (
              <p className="upload-hint">or paste below</p>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref = {researchInputRef}
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            className="hidden-input"
            onChange={handleFile("researchGuide", "research")}
          />

          <textarea
            rows={5}
            className="guide-textarea"
            placeholder="Research guide — paste here if not uploading a file..."
            value={config.researchGuide || ""}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, researchGuide: e.target.value }))
            }
          />
        </div>

        {/* Outreach guide */}
        <div className="card">
          <h3>Outreach guide</h3>
          <p className="sub">Email structure, tone rules, what to avoid</p>

          <div
            className={`upload-zone${fileNames.outreach ? " filled" : ""}`}
            onClick={() => outreachInputRef.current?.click()}
          >
            <p>
              {fileNames.outreach
                ? `✓ ${fileNames.outreach}`
                : "Click to upload .txt or .md"}
            </p>
            {!fileNames.outreach && (
              <p className="upload-hint">or paste below</p>
            )}
          </div>

         <input
            ref={outreachInputRef}
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            className="hidden-input"
            onChange={handleFile("outreachGuide", "outreach")}
          />

          <textarea
            rows={5}
            className="guide-textarea"
            placeholder="Outreach guide — paste here..."
            value={config.outreachGuide || ""}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, outreachGuide: e.target.value }))
            }
          />
        </div>
      </div>

      {/* ── Optional email templates ── */}
      <div className="card">
        <h3>Email templates (optional)</h3>
        <p className="sub">
          Paste your best-performing templates — the agent learns your voice from these.
        </p>
        <textarea
          rows={6}
          placeholder={"Template 1:\nSubject: ...\nBody: ..."}
          value={config.templates || ""}
          onChange={(e) =>
            setConfig((prev) => ({ ...prev, templates: e.target.value }))
          }
        />
      </div>

      {/* ── Continue button ── */}
      <div className="setup-footer">
        <button
          className="btn btn-primary"
          disabled={!ready}
          onClick={onNext}
        >
          Continue to accounts →
        </button>
      </div>
    </div>
  );
}
