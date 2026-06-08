# SciPeer — Platform Design Spec

**Date:** 2026-06-08
**Status:** Approved

---

## 1. Problem Statement

Publishing in Q1 journals is slow (months to years) and expensive (APCs in the thousands). Researchers without institutional backing are effectively excluded. SciPeer provides a free, open, community-reviewed venue where papers can be submitted, reviewed, revised, and assigned a DOI — entirely driven by the research community itself.

---

## 2. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Researcher identity | ORCID OAuth2 only | Trusted external identity; author graph pre-populated from ORCID works |
| DOI provider | DataCite | Standard for preprints/repos; free tier; REST API; abstracted via interface |
| Deployment model | Cloud-agnostic / portable | Docker + Kubernetes + Terraform; operator chooses target |
| COI graph depth | Configurable per field, default 2 hops | Mirrors real journal practice; stored as adjacency table + recursive CTE |
| File formats | PDF required, LaTeX/source optional | Inclusive for all researchers; richer processing when source available |
| Reputation model | Weighted scores | Reviewer reputation influences acceptance weighting; discourages low-effort reviews |
| Architecture style | Modular monolith | Operationally simple; module boundaries enable future extraction |
| Primary key type | UUID v7 | Time-ordered, globally unique, shard-safe — no auto-increment anywhere |

---

## 3. Architecture

### 3.1 Module Map

```
┌─────────────────────────────────────────────────────────┐
│                     API Service (FastAPI)                │
│                                                         │
│  ┌──────────┐  ┌─────────┐  ┌─────────┐  ┌──────────┐ │
│  │ identity │  │ papers  │  │ reviews │  │   doi    │ │
│  └──────────┘  └─────────┘  └─────────┘  └──────────┘ │
│  ┌──────────────────┐  ┌───────────────────────────┐   │
│  │   gamification   │  │      notifications        │   │
│  └──────────────────┘  └───────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
         │              │              │
    PostgreSQL      MinIO/S3       Redis 7
    (+ partitions)  (files)        (cache + streams)
         │
    Meilisearch
    (search index)
```

### 3.2 Module Responsibilities

| Module | Schema namespace | Responsibilities |
|--------|-----------------|-----------------|
| `identity` | `identity.*` | ORCID OAuth2, JWT issuance/refresh, user profiles, ORCID works sync |
| `papers` | `papers.*` | Submission, versioning, file metadata, status FSM, field categories |
| `reviews` | `reviews.*` | COI check, score collection, acceptance logic, co-author graph |
| `doi` | `doi.*` | DataCite integration, DOI reservation, minting on publish |
| `gamification` | `gamification.*` | Reputation scores, weighted vote calc, badges, nudge triggers |
| `notifications` | `notifications.*` | Async email/in-app via Redis Streams consumers |

Cross-module calls go through Python service interfaces — never direct table joins across namespaces.

### 3.3 ID Strategy

All primary keys are **UUID v7** (RFC 9562). UUID v7 is time-ordered (first 48 bits = Unix ms timestamp), making it:
- Index-friendly (monotonically increasing, low page splits)
- Globally unique without a central sequence
- Shard-safe (can be used as a consistent hash key)

No table in the system uses `SERIAL`, `BIGSERIAL`, or any auto-increment type.

### 3.4 Sharding Strategy

PostgreSQL declarative range partitioning on UUID prefix is applied from day one to all high-volume tables (`papers.submissions`, `reviews.scores`, `gamification.events`). When a single PostgreSQL node saturates:

1. Enable the **Citus** extension — tables become distributed with zero application changes.
2. The `shard_key` column (equal to the entity's UUID v7) is the distribution column.
3. Read replicas are added before sharding; sharding is the last resort.

### 3.5 Co-Author Graph & COI Algorithm

```sql
-- Adjacency table (reviews schema)
CREATE TABLE reviews.coauthor_edges (
    author_id     UUID NOT NULL,  -- references identity.users
    coauthor_id   UUID NOT NULL,
    source_work   TEXT,           -- ORCID work identifier
    synced_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (author_id, coauthor_id)
);

-- COI check: is candidate_reviewer within max_depth hops of any paper author?
WITH RECURSIVE coi_graph AS (
    SELECT author_id, coauthor_id, 1 AS depth
    FROM reviews.coauthor_edges
    WHERE author_id = ANY(:paper_author_ids)
    UNION ALL
    SELECT e.author_id, e.coauthor_id, g.depth + 1
    FROM reviews.coauthor_edges e
    JOIN coi_graph g ON e.author_id = g.coauthor_id
    WHERE g.depth < :max_depth
)
SELECT EXISTS (
    SELECT 1 FROM coi_graph WHERE coauthor_id = :candidate_reviewer_id
) AS has_conflict;
```

`max_depth` is stored per field category in `papers.field_categories(coi_depth)`, default `2`.

### 3.6 Paper Lifecycle FSM

```
DRAFT ──(submit)──► UNDER_REVIEW ──(3+ accepts, 0 mandatory open)──► CAMERA_READY ──(DOI minted)──► PUBLISHED
                         │
                    (mandatory revision requested)
                         │
                         ▼
                  REVISION_REQUESTED ──(author resubmits)──► UNDER_REVIEW
                         │
                    (reject threshold)
                         ▼
                      REJECTED
```

Rules:
- Paper stays in `DRAFT` for a minimum of **7 days** (configurable).
- Transition to `CAMERA_READY` requires: ≥ 3 reviewers with weighted score ≥ 3 (weak accept or above), no open mandatory revision comments.
- Transition to `REJECTED` triggers when: ≥ 2 reviewers submit weighted score ≤ 1 (strong reject) and no revision round is in progress, OR the paper has been in `UNDER_REVIEW` / `REVISION_REQUESTED` for > 180 days with insufficient reviewers (configurable).
- DOI is **reserved** at `CAMERA_READY` and **minted** (made public) at `PUBLISHED`.
- All state transitions are logged with timestamp and actor in `papers.status_history`.

### 3.7 Review Scoring & Reputation Weighting

Raw score scale:

| Score | Label |
|-------|-------|
| 0 | Strong reject |
| 1 | Reject |
| 2 | Weak reject |
| 3 | Weak accept |
| 4 | Accept |
| 5 | Strong accept |

Acceptance threshold: weighted score ≥ 3 counts as an accepting vote.

Effective score: `raw_score × reviewer_weight`

Reviewer weight is derived from `gamification.reputation_scores.normalized_weight` (range 0.5–2.0, default 1.0 for new reviewers). Weight increases with: number of completed reviews, low retraction/downvote rate on suggestions, acceptance rate calibration.

### 3.8 Scalability Constraints (hard rules)

- No `SERIAL` / `BIGSERIAL` / `IDENTITY` columns anywhere.
- No application-level global counters or sequences.
- No in-process state that survives a pod restart (stateless API).
- All file references are object storage URLs — no files on the API filesystem.
- Background jobs run as separate worker pods consuming Redis Streams — not in-process threads.

---

## 4. Stack Summary

| Layer | Default (open-source) | Paid swap path |
|-------|----------------------|----------------|
| Backend runtime | Python 3.12 + FastAPI | — |
| Database | PostgreSQL 16 (self-hosted) | Neon, Supabase, AWS RDS |
| DB sharding | Citus extension | AWS Aurora Distributed, CockroachDB |
| Object storage | MinIO | AWS S3, GCS, Cloudflare R2 |
| Cache + streams | Redis 7 (self-hosted) | Upstash, AWS ElastiCache |
| Search | Meilisearch | Algolia, Typesense Cloud |
| Frontend | Next.js 15 (self-hosted) | Vercel, Netlify |
| Auth | ORCID OAuth2 + JWT (RS256) | — |
| Email | Postal (self-hosted SMTP) | SendGrid, Resend, AWS SES |
| DOI | DataCite REST API | Crossref (same interface) |
| Container runtime | Docker + K3s / any K8s | GKE, EKS, AKS |
| IaC | Terraform + Helm | Pulumi (same concepts) |
| CI/CD | Gitea Actions | GitHub Actions, GitLab CI |
| Observability | Grafana + Prometheus + Loki + Tempo | Datadog, Grafana Cloud |
| Secrets | Sealed Secrets + K8s Secrets | HashiCorp Vault, AWS Secrets Manager |

---

## 5. DevOps Overview

### Environments
- `dev`: docker-compose, hot reload, Mailpit for email preview
- `staging`: K8s namespace, mirrors prod topology, seeded with anonymised data
- `production`: K8s namespace, separate secrets, HPA enabled

### CI/CD Pipeline
```
lint → unit tests → integration tests (docker-compose) → build image
→ push to registry → deploy staging → smoke tests → promote production
```

### Observability
OpenTelemetry SDK in the API service exports to:
- Prometheus (metrics scrape)
- Loki (structured JSON logs)
- Tempo (distributed traces)

All visualised in Grafana dashboards.

### Backup
- PostgreSQL: daily `pg_dump` + continuous WAL archiving to MinIO/S3; 30-day retention
- MinIO: bucket replication to secondary location

### Scaling Path
1. Add PostgreSQL read replica (read-heavy load)
2. Add API pod replicas via HPA (CPU/memory triggers)
3. Enable Citus sharding (write-heavy DB load)
4. Extract hot module to standalone service (if one module dominates CPU)

---

## 6. Out of Scope (v1)

- Paid access tiers / APC fees
- PDF rendering / LaTeX compilation in-browser
- Real-time collaborative editing
- Mobile native apps
- Federation with other preprint servers (arXiv, bioRxiv)
