# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**SciPeer** — a free, open, community-reviewed scientific paper platform. Researchers submit papers, the community reviews them (0–5 score), and accepted papers receive a DataCite DOI. See `docs/superpowers/specs/2026-06-08-scipeer-design.md` for the full design spec.

> Note: the HTML mockup uses the name "OpenScholar" — the canonical project name is **SciPeer**.

---

## UI Contract

**`docs/mockup/openscholar-app.html` is the authoritative UI reference.** Every new feature, visual change, or component must respect the design system defined there. Before building any UI, open the mockup and verify the target interaction already exists or is consistent with what is there.

### Design tokens (CSS variables in the mockup)
| Token | Value | Use |
|-------|-------|-----|
| `--primary` | `#1e4fcd` | Buttons, active states, links |
| `--bg` | `#eef1f6` | Page background (dot-grid) |
| `--surface` | `#ffffff` | Cards, panels, topbar |
| `--surface2` | `#f6f8fb` | Hover backgrounds, secondary surfaces |
| `--border` | `#e2e8f0` | All borders |
| `--ink` | `#0f1b2d` | Primary text |
| `--ink2` | `#475569` | Secondary text |
| `--ink3` | `#94a3b8` | Muted text, placeholders |
| `--green` | `#0f9d58` | Published/accepted states |
| `--amber` | `#d98a0e` | Warnings, urgency |
| `--red` | `#d23b3b` | Reject, mandatory items |
| `--purple` | `#7c3aed` | Discipline chips |

### Typography
- **Headings / titles:** `Fraunces` serif (class `.serif`)
- **Body / UI:** `Public Sans` sans-serif
- **Icons:** Tabler Icons (`ti-*` classes, CDN `tabler-icons` iconfont)

### Four main views (single-page navigation)
1. **Feed / Dashboard** (`view-dash`) — paper grid with urgency beacon, discipline filters
2. **Submit & Graph Check** (`view-submit`) — co-author graph visualisation + COI check panel
3. **Review Workspace** (`view-review`) — split manuscript viewer + review hub with score bars and comment threads
4. **Profile & Karma** (`view-profile`) — gauge, contribution stats, badges, XP feed, review-debt tracker

---

## Task Tracking

All planned and completed work is tracked in **`TODO.md`** at the repository root.

- Before starting any new feature or task: add it to `TODO.md` under `## Planned`.
- When a task is finished: move it to `## Done` and add the completion date.
- Do not batch task updates — mark a task done as soon as it is finished.

---

## Git Workflow

- **Everything is on GitHub.** Commit and push regularly.
- **Feature branches:** Any work that could break existing functionality must be developed on a dedicated branch named `feature/<short-description>` or `fix/<short-description>`.
- **Merging:** Merge into `main` only when the feature is stable and tested.
- **Main is always deployable.** Never push directly to `main` for non-trivial changes.

---

## Architecture Constraints (hard rules — never violate)

- **No auto-increment IDs.** All primary keys are UUID v7 (RFC 9562). No `SERIAL`, `BIGSERIAL`, or `IDENTITY` columns anywhere.
- **Stateless API.** No in-process state that survives a pod restart. Sessions live in Redis/JWT only.
- **No cross-module table joins.** Modules (`identity`, `papers`, `reviews`, `doi`, `gamification`, `notifications`) own their PostgreSQL schema namespace. Cross-module data access goes through service interfaces.
- **Files never on disk.** All uploaded files (PDFs, source) go to object storage (MinIO/S3-compatible). Only URLs are stored in the database.
- **Background work is async.** Long-running or side-effect operations (DOI minting, email, ORCID sync) run as Redis Streams consumers in separate worker processes — never blocking the request path.

---

## Stack at a Glance

| Layer | Default | Paid swap |
|-------|---------|-----------|
| Backend | Python 3.12 + FastAPI | — |
| Database | PostgreSQL 16 | Neon, Supabase, AWS RDS |
| Object storage | MinIO (S3-compatible) | AWS S3, GCS, R2 |
| Cache / streams | Redis 7 | Upstash, ElastiCache |
| Search | Meilisearch | Algolia, Typesense |
| Frontend | Next.js 15 | Vercel, Netlify |
| Auth | ORCID OAuth2 + JWT RS256 | — |
| DOI | DataCite REST API | Crossref (same interface) |
| Infra | Docker + K3s + Terraform + Helm | GKE / EKS / AKS |
| CI/CD | Gitea Actions | GitHub Actions, GitLab CI |
| Observability | Grafana + Prometheus + Loki + Tempo | Datadog, Grafana Cloud |

Swap paths share the same interface — changing provider requires only configuration, not code rewrites.
