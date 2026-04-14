# 📚 EPQ Tutor Dashboard

A personal student management system for EPQ academic tutors — track session records, SA hours, EPQ milestone progress, and export formatted summaries for parents or marketing.

**Live app → [simonevo.github.io/epq-tutor-dashboard](https://simonevo.github.io/epq-tutor-dashboard/)**

---

## Features

- **Student dashboard** — card grid with urgency colour-coding (how long since last session), SA remaining hours, tags, and next scheduled sessions at a glance
- **Session logging** — record SA meetings, TA meetings, and theory classes; SA sessions auto-decrement the student's hour quota
- **EPQ milestone tracking** — 19-node progress bar (Intro → 文综 → 方法论 → … → 提交) per student
- **Custom tags** — filter students by tags you define yourself
- **Availability notes** — flag students who are paused for exams or other reasons
- **Supervisor (SA) management** — manage supervisors with background, direction, and SA type (英方SA / 中方SA)
- **Mind maps** — create and view Markmap-based mind maps per student, with fullscreen view and SVG/PNG export
- **AI report generation** — generate formatted parent-facing session and progress reports via an LLM API, with private notes always excluded
- **Session hour statistics** — summarise SA session hours across 英方SA students up to a chosen cutoff date, with copyable text output
- **Export** — generate a formatted, emoji-decorated summary for parents or marketing, with private notes automatically excluded
- **Private notes** — per student and per session; never appear in any export

## Changelog

### 2026-04-14

- **iCloud calendar sync** — session records are automatically published as an ICS file hosted on a secret GitHub Gist; subscribe once in Calendar.app and it stays updated. Gist ID is stored in the data repo (`config/calendar.json`) so it works across devices. Manual sync button and subscription URL also available in Settings.
- **AI Command Center** — natural language input on the Dashboard to create students or session records. Parses all ~20 student fields (name, grade, supervisor, tags, submission round, etc.), shows a preview before confirming, and stays on the Dashboard after creating a session (no forced navigation). Student names sent to the AI are anonymised as 学生A/B/C; results are decoded before saving.
- **AI model flexibility** — Settings page now accepts any OpenAI-compatible Base URL + model name (presets for 阿里云百炼, DeepSeek, OpenAI). Previously hard-coded to Qwen.
- **AI report caching** — generated session reports and progress reports are saved back to the student's JSON file (`generatedReport`, `generatedProgressReport`). Cached reports load instantly on revisit; editing a session invalidates its cache. Progress report cache is never auto-invalidated (manual "重新生成" button).
- **Weekly progress reminder (进度提醒)** — Dashboard button triggers an AI-generated tutor weekly report across all students. Students unchanged since last scan reuse cached status (only changed students send full data to the AI). Each report is archived to `reports/YYYY-MM-DD_HHmm.json` in the data repo; latest is also stored in `config/weekly_report.json` for fast reload. Student names are anonymised in the AI prompt and decoded in the output.
- **Delete student** — moved from the student detail page to the Edit page (less exposed), with a confirmation dialog.
- **UI localisation** — gender options display in Chinese (男/女/其他) while storing Male/Female/Other; "Taught Element Type" renamed to "理论课班期"; submission round fuzzy-matched from existing rounds by the AI Command Center.
- **Stability fix** — `fetchAll` no longer clears the student list when the GitHub API returns an empty response due to post-delete eventual consistency. Existing data is preserved until a non-empty response is received.

> **⚠️ AI prompt quality note:** The prompts feeding the AI Command Center and the weekly progress reminder are functional but not yet fully tuned. Edge cases (ambiguous availability notes, mixed Chinese/English inputs, alias leakage in summaries) may produce imperfect output. The overall system architecture is stable; prompt refinement is the main remaining work.

### 2026-04-13
- **SA type moved to Supervisor** — 英方SA / 中方SA is now a property of each Supervisor record (defaulting to 英方SA) rather than the student, reflecting that the type belongs to the supervisor, not the student
- **Session hour statistics filter** — the 统计课时 modal now correctly excludes 中方SA students by checking their assigned supervisor's type; only SA_MEETING sessions are counted (TA and theory sessions excluded)
- **SA hours calculation fix** — remaining SA hours in the statistics modal now derive entirely from a single filtered session list, eliminating a duplicate filter and intermediate rounding that caused small discrepancies
- **AI report SA remaining fix** — the remaining SA count shown in AI-generated session and progress reports now matches the green dot count on student cards (integer past-session count subtracted from quota, computed fresh from session records rather than the stale `saHoursUsed` field)

## Architecture

This project uses a two-repo design to keep code public and student data private:

| Repo | Purpose | Visibility |
|------|---------|------------|
| `epq-tutor-dashboard` (this repo) | React frontend, deployed via GitHub Pages | Public |
| [`epq-tutor-data`](https://github.com/SimonEvo/epq-tutor-data) | Student JSON data files | Private |

The app authenticates with a **GitHub Personal Access Token (PAT)** to read and write the data repo via the GitHub API. The PAT is stored in your browser's `localStorage` — it is your login password and never leaves your device.

```
Browser (GitHub Pages)
  └── src/lib/dataService.ts   ← all data access goes here
        └── GitHub REST API (Octokit)
              └── epq-tutor-data/ (private repo)
                    ├── students/{id}.json
                    └── config/tags.json
```

## Tech Stack

- **React 18** + **Vite** — framework and build tooling
- **Tailwind CSS** — styling
- **Zustand** — state management
- **React Router v6** (HashRouter) — client-side routing, compatible with GitHub Pages
- **Octokit** (`@octokit/rest`) — GitHub API client

## Getting Started (local development)

**Prerequisites:** Node.js 18+, a private GitHub repo for data (`epq-tutor-data`), a GitHub PAT with `repo` scope.

```bash
git clone https://github.com/SimonEvo/epq-tutor-dashboard.git
cd epq-tutor-dashboard
npm install
npm run dev
```

Open `http://localhost:5173/epq-tutor-dashboard/` and enter your PAT to log in.

## Commands

```bash
npm run dev        # Start local dev server
npm run build      # Type-check + production build
npm run deploy     # Build and push to GitHub Pages (gh-pages branch)
npm run lint       # ESLint
npm run typecheck  # TypeScript check only (no build)
```

## Deployment

The app is deployed to GitHub Pages from the `gh-pages` branch automatically by `npm run deploy`. No CI/CD setup required.

```bash
npm run deploy
```

## Privacy & Security

- Student data lives exclusively in your **private** GitHub repo — no third-party databases, no cloud SaaS storage
- The PAT is stored only in your browser's `localStorage` and sent only to the GitHub API
- Private notes fields are enforced to never appear in exported content at the data serialisation layer
- This repo (code) is public and contains no student data
