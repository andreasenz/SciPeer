# Technology Stack

All defaults are open-source and self-hostable. Every layer has a documented paid swap path that requires only configuration changes — no code rewrites. The swap path is possible because each integration is hidden behind an interface or an environment-variable-configured client.

---

## Backend

| Component | Default | Paid / managed swap |
|-----------|---------|---------------------|
| Language | Python 3.12 | — |
| Web framework | [FastAPI](https://fastapi.tiangolo.com/) | — |
| ASGI server | [Uvicorn](https://www.uvicorn.org/) + [Gunicorn](https://gunicorn.org/) | — |
| Data validation | [Pydantic v2](https://docs.pydantic.dev/) | — |
| DB migrations | [Alembic](https://alembic.sqlalchemy.org/) | — |
| ORM | [SQLAlchemy 2.0](https://www.sqlalchemy.org/) (async) | — |
| Task/worker | Redis Streams consumers (custom) | — |

**Why FastAPI:** auto-generated OpenAPI docs, native async, familiar to the scientific Python community.

---

## Database

| Component | Default | Paid / managed swap |
|-----------|---------|---------------------|
| Primary store | [PostgreSQL 16](https://www.postgresql.org/) (self-hosted) | Neon, Supabase, AWS RDS, Azure Database for PostgreSQL |
| Horizontal sharding | [Citus extension](https://www.citusdata.com/download/) (added when needed) | Citus Cloud, CockroachDB (wire-compatible), AWS Aurora Distributed |
| UUID v7 generation | [`uuid-ossp`](https://www.postgresql.org/docs/current/uuid-ossp.html) or app-level (`python-ulid` / `uuid7`) | — |

PostgreSQL is chosen for: native UUID support, declarative partitioning, recursive CTEs (co-author graph), JSONB for flexible metadata, and Citus compatibility.

---

## Object Storage

| Component | Default | Paid / managed swap |
|-----------|---------|---------------------|
| Object store | [MinIO](https://min.io/) (self-hosted, S3-compatible) | AWS S3, Google Cloud Storage, Cloudflare R2, Backblaze B2 |
| Client | [boto3](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html) with custom endpoint URL | Same client, different `endpoint_url` |

Swap is one environment variable change: `S3_ENDPOINT_URL`. No code change.

---

## Cache and Message Bus

| Component | Default | Paid / managed swap |
|-----------|---------|---------------------|
| Cache | [Redis 7](https://redis.io/) (self-hosted) | Upstash Redis, AWS ElastiCache, Redis Cloud |
| Async event bus | Redis Streams | Same (Streams is a Redis native feature) |
| Rate limiting | Redis + [slowapi](https://github.com/laurentS/slowapi) | — |

Redis Streams is used for all inter-module async events (see Architecture). Consumer groups ensure at-least-once delivery and horizontal worker scaling.

---

## Search

| Component | Default | Paid / managed swap |
|-----------|---------|---------------------|
| Full-text search | [Meilisearch](https://www.meilisearch.com/) (self-hosted) | Meilisearch Cloud, Algolia, Typesense Cloud, OpenSearch Serverless |
| Client | `meilisearch-python` | Algolia Python client (different interface, thin adapter needed) |

Meilisearch is indexed with: paper title, abstract, authors, keywords, field category, DOI, status.

---

## Frontend

| Component | Default | Paid / managed swap |
|-----------|---------|---------------------|
| Framework | [Next.js 15](https://nextjs.org/) (React, self-hosted via Docker) | Vercel, Netlify |
| Styling | CSS variables (matching mockup tokens) + CSS Modules | — |
| Icons | [Tabler Icons](https://tabler.io/icons) (`@tabler/icons-react`) | — |
| Fonts | Google Fonts: Fraunces + Public Sans | Self-hosted font files |
| HTTP client | [TanStack Query](https://tanstack.com/query) + native `fetch` | — |

The frontend is SSR for paper detail pages (SEO / DOI indexing) and CSR for the dashboard and review workspace.

---

## Authentication

| Component | Default | Notes |
|-----------|---------|-------|
| Identity provider | [ORCID OAuth2](https://info.orcid.org/documentation/api-tutorials/api-tutorial-get-and-authenticated-orcid-id/) | Required — no email-only login |
| Token format | JWT RS256 (short-lived access + refresh) | Stateless; verified with public key |
| Session storage | Refresh token in HttpOnly cookie; access token in memory | — |

ORCID iD is the canonical user identifier stored in `identity.users.orcid_id`.

---

## Email

| Component | Default | Paid / managed swap |
|-----------|---------|---------------------|
| SMTP server | [Postal](https://postal.atech.media/) (self-hosted) | SendGrid, Resend, AWS SES, Mailgun |
| Dev preview | [Mailpit](https://mailpit.axllent.org/) (docker-compose only) | — |
| Abstraction | `Mailer` interface — `send(to, subject, html)` | Swap SMTP config only |

---

## DOI Minting

| Component | Default | Paid / managed swap |
|-----------|---------|---------------------|
| Registrar | [DataCite REST API](https://support.datacite.org/docs/api) | Crossref (requires a `DOIProvider` adapter) |
| Abstraction | `DOIProvider` interface — `reserve(metadata)` / `mint(doi)` | Swap adapter class + credentials |

DOIs are **reserved** when a paper reaches `CAMERA_READY` and **published** (made resolvable) when it reaches `PUBLISHED`.

---

## Infrastructure and Operations

| Component | Default | Paid / managed swap |
|-----------|---------|---------------------|
| Container runtime | Docker | — |
| Orchestration | [K3s](https://k3s.io/) (self-hosted, lightweight Kubernetes) | GKE, EKS, AKS, DigitalOcean DOKS |
| IaC — resources | [Terraform](https://www.terraform.io/) | [Pulumi](https://www.pulumi.com/) (same concepts, TypeScript/Python) |
| IaC — workloads | [Helm 3](https://helm.sh/) charts | — |
| Container registry | [Gitea Container Registry](https://docs.gitea.com/usage/packages/container) | GitHub Container Registry, AWS ECR, Docker Hub |
| CI/CD | [Gitea Actions](https://docs.gitea.com/usage/actions/overview) | GitHub Actions, GitLab CI (workflow syntax compatible) |

---

## Observability

| Component | Default | Paid / managed swap |
|-----------|---------|---------------------|
| Metrics | [Prometheus](https://prometheus.io/) | Grafana Cloud (managed Prometheus) |
| Logs | [Loki](https://grafana.com/oss/loki/) | Grafana Cloud Logs, Datadog Logs |
| Traces | [Tempo](https://grafana.com/oss/tempo/) | Grafana Cloud Traces, Datadog APM |
| Dashboards | [Grafana](https://grafana.com/oss/grafana/) | Grafana Cloud |
| Instrumentation | [OpenTelemetry Python SDK](https://opentelemetry.io/docs/languages/python/) | Same SDK, different exporter endpoint |

All four tools run in the same Kubernetes namespace and are pre-configured to talk to each other. Switching to Datadog requires only changing the OTel exporter endpoint and credentials.

---

## Secrets Management

| Component | Default | Paid / managed swap |
|-----------|---------|---------------------|
| K8s secrets | [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets) (GitOps-safe) | HashiCorp Vault, AWS Secrets Manager, Doppler |
| Local dev | `.env` file (never committed) | — |
