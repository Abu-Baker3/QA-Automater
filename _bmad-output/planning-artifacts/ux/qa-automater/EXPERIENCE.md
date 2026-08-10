---
title: QA Automater — User Experience & Interaction Specification
created: 2026-08-09
status: final
version: 1.0
brand: QA Automater
---

# QA Automater — User Experience (EXPERIENCE.md)

## 1. Information Architecture & Navigation

The QA Automater Web Application is structured as an interactive 5-tab workspace:

1. **Dashboard Overview (`/`)**: High-level platform metrics (Scanned Repositories, Total Mapped Locators, Generated Playwright Tests, Active BullMQ Queue Depth) and recent test generation jobs.
2. **Repositories & AST Scanners (`/repositories`)**: Connect GitHub repositories via GitHub App, trigger AST repository scans, and view extracted React/Vue component trees.
3. **UI Locator Knowledge Base (`/locators`)**: Searchable database of extracted frontend locators (`data-testid`, `aria-label`, CSS selectors) mapped to component paths.
4. **AI Test Studio (`/studio`)**: Coached test creation interface where user stories are automatically mapped to AST locators, generating production-grade Playwright tests.
5. **Export & CI Pipeline (`/export`)**: Artifact downloader (ZIP) and GitHub PR creator with Playwright config and GitHub Actions CI workflow generators.

---

## 2. Key User Journeys

### Journey 1: Connect Repository & Trigger AST Locator Scan
- **User:** Alex, Senior QA Lead.
- **Goal:** Ingest a React repository and automatically extract all interactive UI locators.
- **Steps:**
  1. Alex clicks **"Connect GitHub Repository"** in Dashboard.
  2. Selects `acme-inc/frontend-app` from the connected GitHub App repository list.
  3. Clicks **"Run AST Locator Scan"**.
  4. BullMQ `scan-jobs` queue triggers the AST Scan Worker; live progress stepper displays scanning phases (`Clone` → `AST Parse` → `Locator Extraction` → `Vector Indexing`).
  5. Scan completes in 4.2 seconds; 48 UI locators are indexed into `pgvector`.

### Journey 2: Map User Story & Generate Playwright Test
- **User:** Alex, Senior QA Lead.
- **Goal:** Convert a feature acceptance story into a Playwright test script.
- **Steps:**
  1. Alex navigates to **AI Test Studio**.
  2. Enters User Story: *"Given a user on /login, when they enter valid credentials and submit, then they are redirected to /dashboard."*
  3. Clicks **"Generate Playwright Test"**.
  4. AI Worker retrieves relevant AST locators (`#email`, `#password`, `[data-testid="submit-btn"]`) via `pgvector` RAG.
  5. The Playwright TS code editor displays the generated test file in real time with line-by-line syntax highlighting and edit capabilities.

---

## 3. Accessibility & Responsiveness Floor

- **Keyboard Navigation:** Full tab ring focus indicators (`outline: 2px solid #6366F1`) on all interactive buttons, inputs, and tab switches.
- **Screen Reader Support:** ARIA labels on code copy triggers, status indicators, and modal close triggers.
- **Responsive Layout:** Fluid layout adapting gracefully from desktop (1920px widescreen) down to mobile browsers (375px viewport).
