# Architecture

SciPeer is a **modular monolith**: one deployable API process with six internal modules, each owning a dedicated PostgreSQL schema namespace. Modules communicate through explicit Python service interfaces — never through cross-schema SQL joins. This keeps operational complexity low while preserving clean boundaries that allow extracting a module as a standalone service later.

---

## Module Map

```
┌─────────────────────────────────────────────────────────────┐
│                    API Service (FastAPI)                     │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ identity │  │  papers  │  │ reviews  │  │   doi    │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│  ┌────────────────────┐  ┌──────────────────────────────┐  │
│  │    gamification    │  │        notifications         │  │
│  └────────────────────┘  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
          │                  │                  │
     PostgreSQL 16       MinIO / S3         Redis 7
     (+ partitions)      (file storage)    (cache + streams)
          │
     Meilisearch
     (full-text search)
```

### Module responsibilities

| Module | Schema | Responsibilities |
|--------|--------|-----------------|
| `identity` | `identity.*` | ORCID OAuth2 login, JWT issuance/refresh, user profiles, periodic ORCID works sync |
| `papers` | `papers.*` | Submission, versioning, file metadata, field categories, paper status FSM |
| `reviews` | `reviews.*` | COI check, co-author graph, score collection, weighted acceptance logic, comment threads |
| `doi` | `doi.*` | DataCite REST integration, DOI reservation on camera-ready, DOI minting on publish |
| `gamification` | `gamification.*` | Reputation scores, reviewer weight calculation, badges, nudge triggers, review-debt tracker |
| `notifications` | `notifications.*` | Redis Streams consumers for email and in-app alerts |

---

## ID Strategy

**All primary keys are UUID v7** (RFC 9562, time-ordered). UUID v7 embeds a 48-bit Unix millisecond timestamp in the high bits, which means:

- B-tree indexes stay nearly sequential → low page splits, good write performance
- No central sequence or auto-increment → safe across multiple writers and shards
- The UUID itself is the shard key

**Hard rule: no `SERIAL`, `BIGSERIAL`, or `IDENTITY` column exists anywhere in the schema.**

---

## Sharding Strategy

PostgreSQL **declarative range partitioning** on UUID prefix is applied from day one to high-write tables:

- `papers.submissions`
- `reviews.scores`
- `gamification.events`

Partitioning is invisible to application code. When a single node saturates:

1. **Add a read replica** — offloads read traffic with zero schema changes.
2. **Enable Citus** — the extension turns partitioned tables into distributed tables. The distribution column is the UUID v7 primary key. Application code does not change.
3. **Extract a module** — if one module dominates CPU or I/O, it can be extracted to its own service; the interface boundary is already defined.

---

## Co-Author Graph and COI Algorithm

The conflict-of-interest check prevents a reviewer from being assigned to a paper if they are within `max_depth` co-authorship hops of any of the paper's authors.

```sql
-- Adjacency table (reviews schema)
CREATE TABLE reviews.coauthor_edges (
    author_id    UUID NOT NULL,   -- identity.users PK
    coauthor_id  UUID NOT NULL,
    source_work  TEXT,            -- ORCID work identifier
    synced_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (author_id, coauthor_id)
);

-- COI check: depth-limited BFS
WITH RECURSIVE coi_graph AS (
    SELECT author_id, coauthor_id, 1 AS depth
    FROM   reviews.coauthor_edges
    WHERE  author_id = ANY(:paper_author_ids)
  UNION ALL
    SELECT e.author_id, e.coauthor_id, g.depth + 1
    FROM   reviews.coauthor_edges e
    JOIN   coi_graph g ON e.author_id = g.coauthor_id
    WHERE  g.depth < :max_depth
)
SELECT EXISTS (
    SELECT 1 FROM coi_graph WHERE coauthor_id = :candidate_reviewer_id
) AS has_conflict;
```

`max_depth` is stored in `papers.field_categories(coi_depth)` and defaults to **2**. Field admins can adjust it per discipline.

---

## Paper Lifecycle (FSM)

```
DRAFT ──(submit)──► UNDER_REVIEW ──(3+ weighted accepts, 0 open mandatory)──► CAMERA_READY ──(DOI minted)──► PUBLISHED
                          │
                    (mandatory revision)
                          ↓
                   REVISION_REQUESTED ──(author resubmits)──► UNDER_REVIEW
                          │
                    (reject threshold)
                          ↓
                       REJECTED
```

**Transition rules:**

| Transition | Condition |
|-----------|-----------|
| `DRAFT → UNDER_REVIEW` | Paper has been in `DRAFT` for ≥ 7 days (configurable) |
| `UNDER_REVIEW → CAMERA_READY` | ≥ 3 reviewers with weighted score ≥ 3 ("weak accept") **and** zero open mandatory comments |
| `UNDER_REVIEW → REVISION_REQUESTED` | Any reviewer submits a mandatory comment |
| `REVISION_REQUESTED → UNDER_REVIEW` | Author marks all mandatory comments as resolved and resubmits |
| `UNDER_REVIEW → REJECTED` | ≥ 2 reviewers with weighted score ≤ 1 ("reject") and no open revision round; or paper exceeds 180-day stale timeout |
| `CAMERA_READY → PUBLISHED` | DOI successfully minted by DataCite |

All transitions are appended to `papers.status_history` with timestamp and actor UUID.

---

## Review Scoring and Reputation Weighting

**Score scale:**

| Score | Meaning |
|-------|---------|
| 0 | Strong reject |
| 1 | Reject |
| 2 | Weak reject |
| 3 | Weak accept |
| 4 | Accept |
| 5 | Strong accept |

**Weighted score:** `effective_score = raw_score × reviewer_weight`

`reviewer_weight` is stored in `gamification.reputation_scores.normalized_weight` (range **0.5 – 2.0**, default **1.0** for new reviewers). It increases with review volume, low downvote rate on comments, and calibration accuracy against final outcomes.

---

## File Storage

- All uploaded files (PDF, LaTeX/source) are stored in **MinIO** (or any S3-compatible backend).
- The database stores only the object URL + metadata (size, mime type, checksum).
- **No files are ever written to the API container filesystem.**
- Bucket layout: `scipeer-papers/{paper_id}/v{version}/{filename}`

---

## Async Workers

Background operations run as **separate worker pods** consuming Redis Streams — never blocking the request path:

| Stream | Consumer | Action |
|--------|----------|--------|
| `paper.status_changed` | `doi-worker` | Reserve / mint DOI via DataCite |
| `paper.status_changed` | `notification-worker` | Send email/in-app alerts |
| `review.submitted` | `gamification-worker` | Recalculate reputation weights |
| `orcid.sync_requested` | `orcid-worker` | Fetch works and update co-author graph |

---

## Scalability Constraints (hard rules)

These rules must never be violated. They are what makes the system shardable and horizontally scalable from day one.

1. No auto-increment IDs — UUID v7 only.
2. No global in-process counters or sequences.
3. API pods are stateless — no local state survives a restart.
4. No files on the container filesystem — object storage only.
5. No synchronous calls to external APIs (DataCite, ORCID) in the request path — always delegate to a worker via Redis Streams.
6. No cross-module SQL joins — service interfaces only.
