---
title: QA Automater — Visual Design System Specification
created: 2026-08-09
status: final
version: 1.0
brand: QA Automater
---

# QA Automater — Visual Design System (DESIGN.md)

## 1. Brand & Style Guide

QA Automater is an elite AI-powered SaaS platform that bridges the gap between human user stories, frontend AST source code, and production-ready Playwright tests. The visual aesthetic is **Dark-Tech Premium**, utilizing sleek glassmorphic surfaces, subtle neon gradients, crisp micro-interactions, and high-contrast monospace code blocks to inspire speed, confidence, and precision.

---

## 2. Color System (Tailored HSL & Dark Mode Tokens)

| Token Name | Color Code / HSL | Usage & Purpose |
|---|---|---|
| `--bg-app` | `#0A0D14` | Deep obsidian background for maximum focus and visual comfort |
| `--bg-card` | `rgba(17, 24, 39, 0.75)` | Translucent glassmorphic card container with backdrop blur |
| `--bg-card-border` | `rgba(255, 255, 255, 0.08)` | Subtle 1px borders providing structure without visual noise |
| `--primary-indigo` | `#6366F1` | Brand primary — used for key CTA buttons, active tabs, and focus states |
| `--primary-purple` | `#8B5CF6` | AI accent gradient — highlights AI test generation & AST locator mapping |
| `--accent-emerald` | `#10B981` | Success indicator — passing tests, active connections, and ready locators |
| `--accent-amber` | `#F59E0B` | Warning indicator — unmapped locators, pending scans, or rate limits |
| `--accent-rose` | `#F43F5E` | Error status — failed assertions, broken locators, or API errors |
| `--text-main` | `#F9FAFB` | Primary body and heading text |
| `--text-muted` | `#9CA3AF` | Secondary labels, timestamps, and breadcrumbs |

---

## 3. Typography & Font Hierarchy

- **Heading Font:** `'Outfit', sans-serif` — Modern, bold, geometric headings.
- **Body UI Font:** `'Inter', sans-serif` — Clean, ultra-legible UI labels and form elements.
- **Code & AST Font:** `'JetBrains Mono', 'Fira Code', monospace` — Accurate code rendering for Playwright tests, AST selectors, and JSON payloads.

| Type Scale | Size / Line Height | Weight | Usage |
|---|---|---|---|
| Display Heading | `2rem (32px) / 1.2` | Bold (700) | Top-level dashboard headers |
| Section Heading | `1.25rem (20px) / 1.4` | SemiBold (600) | Card titles, section headers |
| Body Text | `0.875rem (14px) / 1.5` | Regular (400) | Standard UI labels, descriptions |
| Code Snippet | `0.8125rem (13px) / 1.6` | Medium (500) | Playwright test scripts, locators |

---

## 4. Glassmorphism & Elevation

- **Card Glass Surface:** `background: rgba(17, 24, 39, 0.75); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08); shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5)`
- **Hover Micro-animations:** `transform: translateY(-2px); border-color: rgba(99, 102, 241, 0.4); transition: all 0.2s ease`
- **Glow Accents:** `box-shadow: 0 0 20px rgba(139, 92, 246, 0.25)` on active AI action buttons.

---

## 5. Key UI Components Specification

1. **Header & Navigation Bar:**
   * Left: QA Automater logo with glowing violet spark icon + active workspace dropdown (`Org: Acme Corp`).
   * Center: Live status indicator pill (`PostgreSQL + pgvector: Connected`, `BullMQ Workers: Healthy`).
   * Right: GitHub connected repo status + Clerk User Profile Avatar.

2. **Repository & AST Locator Tree Card:**
   * Interactive component tree showing AST scan results (e.g. `LoginForm.tsx` → `data-testid="login-email"`, `button[type="submit"]`).
   * Instant search filter for locators & components.

3. **AI Playwright Test Code Studio:**
   * Split view: Left side maps user story steps to UI locators; Right side displays live Playwright TypeScript test file with syntax highlighting, copy button, and single-click export.

4. **Export & Pull Request Modal:**
   * Select export target (`Playwright TS/JS`, `ZIP Artifact`, `GitHub PR`).
   * Configuration options: `include playwright.config.ts`, `include CI pipeline workflow`.
