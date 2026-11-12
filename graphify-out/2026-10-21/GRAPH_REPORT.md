# Graph Report - Outpace  (2026-08-12)

## Corpus Check
- 57 files · ~118,128 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 372 nodes · 500 edges · 31 communities (27 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `39e8a8da`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- server.cjs
- frontend/src/pages/CadencePage.jsx
- devDependencies
- frontend/package.json
- Outpace-remove-claude-1784783014/frontend/src/pages/CadencePage.jsx
- Codebase Design
- helper.js
- backend/main.py
- stop-server.sh
- Outpace-remove-claude-1784783014/backend/main.py
- dependencies
- start-server.sh
- Visual Companion Guide
- HTML Report Format
- devDependencies
- Outpace-remove-claude-1784783014/frontend/package.json
- Writing Plans
- Outpace — Agentic SDR
- Outpace — Agentic SDR
- Brainstorming Ideas Into Designs
- Frontend Design
- React + Vite
- React + Vite
- dependencies
- CLAUDE.md
- spec-document-reviewer-prompt.md
- plan-document-reviewer-prompt.md

## God Nodes (most connected - your core abstractions)
1. `handleRequest()` - 14 edges
2. `Visual Companion Guide` - 12 edges
3. `Writing Plans` - 11 edges
4. `Outpace — Agentic SDR` - 11 edges
5. `Outpace — Agentic SDR` - 11 edges
6. `startServer()` - 10 edges
7. `CadencePage()` - 9 edges
8. `CadencePage()` - 9 edges
9. `handleUpgrade()` - 8 edges
10. `CSS Classes Available` - 8 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `loadFromStorage()`  [EXTRACTED]
  Outpace-remove-claude-1784783014/frontend/src/App.jsx → Outpace-remove-claude-1784783014/frontend/src/utils/helpers.js
- `App()` --calls--> `saveToStorage()`  [EXTRACTED]
  Outpace-remove-claude-1784783014/frontend/src/App.jsx → Outpace-remove-claude-1784783014/frontend/src/utils/helpers.js
- `CadencePage()` --calls--> `computeNextFollowUpDate()`  [EXTRACTED]
  Outpace-remove-claude-1784783014/frontend/src/pages/CadencePage.jsx → Outpace-remove-claude-1784783014/frontend/src/utils/cadence.js
- `CadencePage()` --calls--> `isFollowUpDue()`  [EXTRACTED]
  Outpace-remove-claude-1784783014/frontend/src/pages/CadencePage.jsx → Outpace-remove-claude-1784783014/frontend/src/utils/cadence.js
- `CadencePage()` --calls--> `parseCadenceSteps()`  [EXTRACTED]
  Outpace-remove-claude-1784783014/frontend/src/pages/CadencePage.jsx → Outpace-remove-claude-1784783014/frontend/src/utils/cadence.js

## Import Cycles
- None detected.

## Communities (31 total, 4 thin omitted)

### Community 0 - "server.cjs"
Cohesion: 0.06
Nodes (56): bootstrapPage(), brandMarkup(), broadcast(), browserLauncherForPlatform(), chmodOwnerOnly(), clients, companionUrl(), computeAcceptKey() (+48 more)

### Community 1 - "frontend/src/pages/CadencePage.jsx"
Cohesion: 0.13
Nodes (23): App(), AccountsPage(), CadencePage(), STATE_LABELS, STATE_OPTIONS, STATE_TAG_CLASS, FeedbackPage(), RunPage() (+15 more)

### Community 2 - "devDependencies"
Cohesion: 0.11
Nodes (19): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, @types/react, @types/react-dom (+11 more)

### Community 3 - "frontend/package.json"
Cohesion: 0.13
Nodes (14): dependencies, react, react-dom, react, react-dom, name, private, scripts (+6 more)

### Community 4 - "Outpace-remove-claude-1784783014/frontend/src/pages/CadencePage.jsx"
Cohesion: 0.13
Nodes (23): App(), AccountsPage(), CadencePage(), STATE_LABELS, STATE_OPTIONS, STATE_TAG_CLASS, FeedbackPage(), RunPage() (+15 more)

### Community 5 - "Codebase Design"
Cohesion: 0.09
Nodes (21): 1. In-process, 2. Local-substitutable, 3. Remote but owned (Ports & Adapters), 4. True external (Mock), Deepening, Dependency categories, Seam discipline, Testing strategy: replace, don't layer (+13 more)

### Community 6 - "helper.js"
Cohesion: 0.42
Nodes (7): connect(), nextReconnectDelay(), reloadAfterRecovery(), sessionKey(), setStatus(), showTombstone(), websocketUrl()

### Community 7 - "backend/main.py"
Cohesion: 0.33
Nodes (6): call_claude(), ClaudeRequest, home(), BaseModel, get, post

### Community 8 - "stop-server.sh"
Cohesion: 0.43
Nodes (4): command_has_server_id(), is_brainstorm_server(), mark_stopped(), stop-server.sh script

### Community 9 - "Outpace-remove-claude-1784783014/backend/main.py"
Cohesion: 0.33
Nodes (6): call_claude(), ClaudeRequest, home(), BaseModel, get, post

### Community 10 - "dependencies"
Cohesion: 0.50
Nodes (3): dependencies, lucide-react, lucide-react

### Community 16 - "Visual Companion Guide"
Cohesion: 0.10
Nodes (19): Browser Events Format, Cards (visual designs), Cleaning Up, CSS Classes Available, Design Tips, File Naming, How It Works, Mock elements (wireframe building blocks) (+11 more)

### Community 17 - "HTML Report Format"
Cohesion: 0.10
Nodes (18): Call-graph collapse, Candidate card, Cross-section (good for layered shallowness), Diagram patterns, Hand-built boxes-and-arrows (when Mermaid's layout fights you), Header, HTML Report Format, Mass diagram (good for "interface as wide as implementation") (+10 more)

### Community 18 - "devDependencies"
Cohesion: 0.11
Nodes (19): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, @types/react, @types/react-dom (+11 more)

### Community 19 - "Outpace-remove-claude-1784783014/frontend/package.json"
Cohesion: 0.13
Nodes (14): dependencies, react, react-dom, react, react-dom, name, private, scripts (+6 more)

### Community 20 - "Writing Plans"
Cohesion: 0.17
Nodes (11): Bite-Sized Task Granularity, Execution Handoff, File Structure, No Placeholders, Overview, Plan Document Header, Scope Check, Self-Review (+3 more)

### Community 21 - "Outpace — Agentic SDR"
Cohesion: 0.17
Nodes (11): Architecture, Current Status, Demo / Screenshots, Key Features, Outpace — Agentic SDR, Overview, Roadmap: Three Development Phases, Roadmap / What's Next (+3 more)

### Community 22 - "Outpace — Agentic SDR"
Cohesion: 0.17
Nodes (11): Architecture, Current Status, Demo / Screenshots, Key Features, Outpace — Agentic SDR, Overview, Roadmap: Three Development Phases, Roadmap / What's Next (+3 more)

### Community 23 - "Brainstorming Ideas Into Designs"
Cohesion: 0.25
Nodes (7): After the Design, Anti-Pattern: "This Is Too Simple To Need A Design", Brainstorming Ideas Into Designs, Checklist, Process Flow, The Process, Visual Companion

### Community 24 - "Frontend Design"
Cohesion: 0.29
Nodes (6): Design principles, Frontend Design, Ground it in the subject, More on writing in design, Process: brainstorm, explore, plan, critique, build, critique again, Restraint and self-critique

### Community 25 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

### Community 26 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

### Community 27 - "dependencies"
Cohesion: 0.50
Nodes (3): dependencies, lucide-react, lucide-react

## Knowledge Gaps
- **161 isolated node(s):** `crypto`, `http`, `fs`, `path`, `OPCODES` (+156 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `Outpace-remove-claude-1784783014/frontend/package.json`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `frontend/package.json`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `crypto`, `http`, `fs` to the rest of the system?**
  _161 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `server.cjs` be split into smaller, more focused modules?**
  _Cohesion score 0.060496067755595885 - nodes in this community are weakly interconnected._
- **Should `frontend/src/pages/CadencePage.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1349206349206349 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `frontend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._