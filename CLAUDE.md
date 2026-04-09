# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

EPQ student tutoring progress management system for a single academic tutor (TA). Manages up to 30 students, each with a unique EPQ research topic. The tutor uses this daily to track session records, SA hours, and EPQ milestone progress, and occasionally exports formatted summaries for parents or marketing.

---

## Architecture

### Two-Repo Design

| Repo | Purpose | Visibility |
|------|---------|------------|
| `epq-tutor-dashboard` (this repo) | React frontend + GitHub Pages | Public |
| `epq-tutor-data` | All student JSON data files | Private |

The frontend reads and writes student data by calling the **GitHub REST API** (via Octokit) against the private data repo. Authentication is a GitHub Personal Access Token (PAT) stored in `localStorage` — this is the user's "password" to the system.

### Tech Stack

- **React 18** + **Vite** — framework and build tool
- **Tailwind CSS** + **shadcn/ui** — styling and component library
- **Zustand** — global state management
- **React Router v6** — client-side routing
- **Octokit** (`@octokit/rest`) — GitHub API client for data persistence
- Deployed to **GitHub Pages** (static)

### Data Layer

All data lives as JSON files in the private `epq-tutor-data` repo. The data layer is intentionally isolated behind an abstraction (`src/lib/dataService.ts`) so the GitHub API can be swapped for a real backend later without touching UI code.

Key JSON structures:

```
epq-tutor-data/
  students/
    {studentId}.json    # One file per student (profile + all session records)
  config/
    tags.json           # Global tag library
    milestones.json     # EPQ milestone definitions (ordered)
```

### EPQ Milestones (Ordered)

Fixed sequence built into `config/milestones.json`. Each student tracks independent completion status per milestone:

```
问卷(如有) → Intro → 文综 → 方法论 → 结果 → 讨论 → 反思 → 结语 →
文献 → 摘要 → 表1 → 表2 → 表4 → 表5 → 表6 → 表7 → 表11 → 答辩 → 提交
```

"问卷" is optional — when marked N/A it is excluded from progress percentage calculation.

### Session Types

Three session types share one record schema: `SA_MEETING`, `TA_MEETING`, `THEORY`. SA sessions auto-decrement the student's remaining SA hours. The `transcript` field accepts plain text (paste from Zoom); file upload and API ingestion are reserved for future extension.

### Export / Share

The export function generates formatted text (with emoji) from a student's public-facing data. The `privateNotes` field on both student profiles and session records is **always excluded** from export output — enforce this at the serialization layer, not the UI layer.

---

## Commands

```bash
# Install dependencies
npm install

# Start dev server (localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Deploy to GitHub Pages
npm run deploy        # runs: vite build && gh-pages -d dist

# Lint
npm run lint

# Type-check
npm run typecheck
```

> **Workflow:** After every code change, always run `npm run deploy` to push the updated build to GitHub Pages. The user verifies changes via the live GitHub Pages URL, not locally.

---

## Key Design Constraints

- **No server-side code** in this repo. Everything is static. All dynamic behavior goes through the GitHub API.
- **`privateNotes` must never appear in export output.** This is a hard requirement — student data must be sanitizable before sharing with parents or marketing.
- **SA hour tracking** is used for payroll verification. Session records that decrement SA hours must be immutable after saving (or require explicit edit confirmation).
- **Data layer isolation**: all GitHub API calls must go through `src/lib/dataService.ts`. Components never call Octokit directly.
- **PAT is the only credential.** It is stored in `localStorage` under a fixed key. Never log it, never include it in error messages, never send it anywhere except GitHub API headers.

---

## Planned Extension Points

These are not built in v1 but the code should not foreclose them:

- Session transcript: `transcript` field is plain text → later extend to support file upload or Zoom API ingestion
- Data backend: `dataService.ts` abstracts GitHub API → can be reimplemented against a self-hosted REST API
- Export format: plain text → later extend to PDF or shareable link
- Auth: PAT in localStorage → later support OAuth or server-side sessions
- Mobile: responsive layout from day one, no mobile-specific features required yet
