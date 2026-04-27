# CLAUDE.md

## Project Overview
EPQ student tutoring progress management system for a single tutor. Up to 30 students. Daily use for session records, SA hours, and EPQ milestone tracking. Occasional export for parents/marketing.

## Architecture
Two-repo design:
- `epq-tutor-dashboard` (this repo) — React frontend, deployed to GitHub Pages
- `epq-tutor-data` (private) — all student JSON data files

Frontend reads/writes via GitHub REST API (Octokit). Auth = GitHub PAT stored in localStorage.

## Tech Stack
React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui + Zustand + React Router v6 + Octokit

## Data Structure
See `epq-tutor-data/` for actual files:
- `students/{studentId}.json` — profile + all session records
- `config/tags.json` — global tag library
- `config/milestones.json` — EPQ milestone definitions (ordered)

## Commands
```bash
npm run dev        # localhost:5173
npm run deploy     # build + push to GitHub Pages
npm run lint
npm run typecheck
```
**After every code change: run `npm run deploy`. Verify on GitHub Pages URL, not localhost.**

## Hard Constraints
- `privateNotes` must NEVER appear in export output — filter at serialization layer in dataService.ts
- All GitHub API calls go through `src/lib/dataService.ts` only — components never call Octokit directly
- PAT only in localStorage — never log it, never in error messages
- SA session records are immutable after save (require explicit confirmation to edit)
- No server-side code in this repo — everything is static

## Completed Features
认证、数据层隔离、GitHub Pages 部署 / Dashboard 学生卡片、筛选排序、课时统计、AI 周报、AI 指令中心 / 新建&编辑学生、Brief Note 内联编辑、可用时间备注、标签系统 / Session 增删改查、三类 session、自动编号、筛选折叠、未开始 badge、SA 课时自动计算 / 单节课 AI 报告、进度报告 / EPQ 里程碑追踪、N/A 支持、进度百分比 / 个人日志内联编辑、导出排除 privateNotes / 思维导图创建编辑、全屏、导出 SVG/PNG / 督导列表&详情页 / ICS 日历生成、Secret Gist 订阅链接 / AI 配置、PAT 配置

## Current Status
### In Progress
- （开始新任务前填这里）

### Next Up
- （填这里）