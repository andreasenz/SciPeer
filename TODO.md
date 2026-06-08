# SciPeer — Task Tracker

Add new tasks under **Planned** before starting work.
Move to **Done** with a completion date when finished.

---

## Bugfixes

- [x] 2026-06-08 — BUG-1: ORCID login gives credentials error — surface real error, add startup warning, document sandbox setup
- [x] 2026-06-08 — BUG-2: Cannot upload PDFs — wire file input + FormData in submit page, add uploadPdf/submit to api.ts, fix MinIO public URL (S3_PUBLIC_ENDPOINT_URL)
- [x] 2026-06-08 — BUG-3: Review page left panel shows actual PDF via MinIO presigned URL in iframe
- [x] 2026-06-08 — BUG-4: Review page gates submission on COI check; conflict/unauthenticated banners shown
- [x] 2026-06-08 — BUG-5: Review submission UI: score selector + mandatory/suggested comment drafting with pending queue, real POST to backend
- [x] 2026-06-08 — BUG-6: All pages load real data from backend (feed, my-papers, my-reviews); added GET /papers/my and GET /reviews/my endpoints

---

## Planned

- [ ] Kubernetes Helm charts
- [ ] Terraform IaC for cloud resources
- [ ] CI/CD pipeline (GitHub Actions — partial: workflow exists, needs secrets)
- [ ] Grafana + Prometheus + Loki + Tempo observability stack

---

## Done

- [x] 2026-06-08 — Brainstorm and design SciPeer platform (spec at `docs/superpowers/specs/2026-06-08-scipeer-design.md`)
- [x] 2026-06-08 — Create `CLAUDE.md` with project guidance
- [x] 2026-06-08 — Create `TODO.md` task tracker
- [x] 2026-06-08 — Create `docs/ARCHITECTURE.md`
- [x] 2026-06-08 — Create `docs/STACK.md`
- [x] 2026-06-08 — Create `docs/DEVOPS.md`
- [x] 2026-06-08 — Initialise GitHub repository and push initial commit
- [x] 2026-06-08 — Scaffold backend project (FastAPI modular monolith, Alembic, COI tests all passing)
- [x] 2026-06-08 — Scaffold frontend project (Next.js 15 App Router, 4 views matching mockup)
- [x] 2026-06-08 — Docker Compose for local development (all 7 services running)
- [x] 2026-06-08 — ORCID OAuth2 integration: login redirect, code exchange, JWT RS256, refresh token, ORCID works coauthor sync
- [x] 2026-06-08 — Paper submission flow: create, PDF upload to MinIO, submit for review (DRAFT→UNDER_REVIEW)
- [x] 2026-06-08 — Co-author graph + COI check: recursive CTE, ORCID sync, create_coauthor_edge service
- [x] 2026-06-08 — Review scoring and acceptance logic: submit score/comment, vote, resolve, weighted avg, FSM transitions
- [x] 2026-06-08 — DataCite DOI integration: create_or_mint_doi triggered on PUBLISHED (skips gracefully without credentials)
- [x] 2026-06-08 — Reputation / karma system: XP awards, logarithmic weight calculation, event log
- [x] 2026-06-08 — Async notifications: Redis Streams producers on status change + review submit; worker consumes
- [x] 2026-06-08 — Meilisearch integration: index on paper create, search endpoint, filterable by status
