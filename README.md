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
- **Export** — generate a formatted, emoji-decorated summary for parents or marketing, with private notes automatically excluded
- **Private notes** — per student and per session; never appear in any export

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
