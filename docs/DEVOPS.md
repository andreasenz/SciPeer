# DevOps

---

## Environments

| Name | Purpose | Infrastructure |
|------|---------|---------------|
| `dev` | Local development | `docker-compose.yml` on developer machine |
| `staging` | Pre-production validation | Kubernetes namespace `scipeer-staging` |
| `production` | Live platform | Kubernetes namespace `scipeer-prod` |

`staging` mirrors `production` topology exactly. It is seeded with anonymised data and used for integration/smoke tests before every production promotion.

---

## Local Development

All local services run via Docker Compose. No cloud account is needed to develop.

```bash
# Start all services (API, frontend, PostgreSQL, Redis, MinIO, Meilisearch, Mailpit)
docker compose up

# Apply database migrations
docker compose exec api alembic upgrade head

# Run backend tests
docker compose exec api pytest

# Run a single test file
docker compose exec api pytest tests/reviews/test_coi.py

# Run frontend dev server (hot reload)
docker compose exec frontend npm run dev

# Lint backend
docker compose exec api ruff check .

# Type-check backend
docker compose exec api mypy .

# Lint + type-check frontend
docker compose exec frontend npm run lint
docker compose exec frontend npm run typecheck
```

**Mailpit** is available at `http://localhost:8025` for inspecting outbound emails in development.

**MinIO console** is available at `http://localhost:9001` (credentials in `.env.example`).

---

## Repository Layout (planned)

```
SciPeer/
├── api/                  # FastAPI backend
│   ├── alembic/          # Database migrations
│   ├── app/
│   │   ├── identity/     # Module: identity
│   │   ├── papers/       # Module: papers
│   │   ├── reviews/      # Module: reviews
│   │   ├── doi/          # Module: doi
│   │   ├── gamification/ # Module: gamification
│   │   └── notifications/# Module: notifications
│   └── tests/
├── frontend/             # Next.js frontend
├── infra/
│   ├── terraform/        # Cloud resource definitions
│   └── helm/             # Kubernetes workload charts
├── .gitea/workflows/     # CI/CD pipeline definitions
├── docker-compose.yml    # Local development
├── docs/                 # Architecture, stack, devops, mockups
├── CLAUDE.md
└── TODO.md
```

---

## Git Workflow

- **`main` is always deployable.** Direct pushes to `main` are disabled for non-trivial changes.
- **Feature branches** are required for any work that could break existing functionality:
  - Naming: `feature/<short-description>` or `fix/<short-description>`
  - Example: `feature/orcid-auth`, `fix/coi-depth-query`
- **Merge to `main`** only after: CI passes, smoke tests pass on staging, feature is stable.
- **Commit messages** follow Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.

---

## CI/CD Pipeline

Defined in `.gitea/workflows/ci.yml` (compatible with GitHub Actions syntax).

```
Push / PR
    │
    ├─► lint (ruff, mypy, eslint, tsc)
    ├─► unit tests (pytest, jest)
    ├─► integration tests (docker-compose, real PostgreSQL + Redis)
    │
    └─► [main branch only]
          │
          ├─► build Docker images
          ├─► push to container registry
          ├─► deploy to staging namespace
          ├─► smoke tests (HTTP health checks, critical path)
          └─► promote to production namespace
```

Images are tagged with the Git commit SHA. Production deployments use immutable SHA tags — never `latest`.

---

## Kubernetes

Each service (API, frontend, workers, MinIO, Redis, PostgreSQL, Meilisearch, Grafana stack) has a Helm chart under `infra/helm/`.

```bash
# Deploy to staging
helm upgrade --install scipeer ./infra/helm/scipeer \
  --namespace scipeer-staging \
  --values infra/helm/scipeer/values.staging.yaml

# Deploy to production
helm upgrade --install scipeer ./infra/helm/scipeer \
  --namespace scipeer-prod \
  --values infra/helm/scipeer/values.prod.yaml
```

**Horizontal Pod Autoscaler** is enabled for the API deployment (scale on CPU ≥ 70 % or memory ≥ 80 %). Minimum replicas: 2 in production.

---

## Infrastructure as Code

Cloud resources (DNS, managed object storage buckets, firewall rules) are managed with Terraform.

```bash
cd infra/terraform

# Preview changes
terraform plan -var-file=prod.tfvars

# Apply
terraform apply -var-file=prod.tfvars
```

Terraform state is stored in a remote backend (MinIO S3-compatible bucket or Terraform Cloud). Never store state locally.

---

## Secrets Management

**Never commit secrets.** Use `.env.example` to document required variables; copy to `.env` locally.

In Kubernetes, secrets are managed with [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets):

```bash
# Encrypt a secret for GitOps-safe storage
kubectl create secret generic scipeer-api \
  --from-literal=ORCID_CLIENT_SECRET=<value> \
  --dry-run=client -o yaml \
  | kubeseal --format yaml > infra/helm/scipeer/templates/sealed-secret.yaml
```

Sealed secrets can be committed to the repository — only the cluster's controller can decrypt them.

**Required secrets per environment:**

| Variable | Description |
|----------|-------------|
| `ORCID_CLIENT_ID` | ORCID OAuth2 app client ID |
| `ORCID_CLIENT_SECRET` | ORCID OAuth2 app client secret |
| `JWT_PRIVATE_KEY` | RS256 private key for JWT signing |
| `JWT_PUBLIC_KEY` | RS256 public key for JWT verification |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `S3_ENDPOINT_URL` | MinIO / S3-compatible endpoint |
| `S3_ACCESS_KEY` | Object storage access key |
| `S3_SECRET_KEY` | Object storage secret key |
| `DATACITE_USERNAME` | DataCite API username |
| `DATACITE_PASSWORD` | DataCite API password |
| `DATACITE_PREFIX` | Assigned DOI prefix (e.g. `10.12345`) |
| `SMTP_HOST` / `SMTP_PORT` | Outbound email server |

---

## Observability

The observability stack (Grafana, Prometheus, Loki, Tempo) is deployed as a Helm sub-chart.

**Access in production:**
```bash
kubectl port-forward svc/grafana 3000:3000 -n scipeer-prod
# Open http://localhost:3000
```

**Key dashboards to set up:**
- API request latency (p50 / p95 / p99)
- Error rate by endpoint
- Redis Streams consumer lag (worker backlog)
- PostgreSQL query latency and connection pool usage
- Background worker throughput (DOI minting, ORCID sync, emails)

**Alerting rules (Prometheus):**
- Error rate > 1 % over 5 min → PagerDuty / email
- Worker stream lag > 1000 messages → warning
- PostgreSQL replication lag > 30 s → critical
- Disk usage > 80 % → warning

---

## Database Migrations

Migrations are managed with Alembic and run automatically in the CI deploy step before the new API version starts.

```bash
# Create a new migration
docker compose exec api alembic revision --autogenerate -m "add_paper_status_history"

# Apply all pending migrations
docker compose exec api alembic upgrade head

# Roll back one migration (emergency only)
docker compose exec api alembic downgrade -1
```

**Rules:**
- Migrations are always forward-only in production. Design them to be non-destructive (add columns before removing old ones, use `nullable` before `NOT NULL`).
- Never modify a migration that has already been applied to production.

---

## Backup and Recovery

### PostgreSQL

| Task | Method | Schedule |
|------|--------|----------|
| Logical backup | `pg_dump` → MinIO | Daily at 02:00 UTC |
| Point-in-time recovery | WAL archiving via `pgBackRest` → MinIO | Continuous |
| Retention | 30 days for logical dumps; 7 days WAL | — |

```bash
# Manual logical backup
pg_dump $DATABASE_URL | gzip | mc pipe scipeer-backups/postgres/$(date +%Y%m%d).sql.gz
```

### MinIO (Object Storage)

Bucket replication is configured to a secondary MinIO instance or cloud storage bucket. Verify replication health weekly.

### Recovery targets

| Scenario | Target RTO | Target RPO |
|----------|-----------|-----------|
| Single pod crash | < 1 min (K8s restart) | 0 |
| Database node failure | < 15 min (replica promotion) | < 5 min |
| Full cluster loss | < 2 hours (Terraform + Helm redeploy) | < 24 h (daily dump) |

---

## Scaling Runbook

Execute in order — do not skip steps.

1. **API is slow (high latency):** Add API pod replicas (`kubectl scale deployment scipeer-api --replicas=N`). HPA handles this automatically if configured.
2. **Database is slow (read-heavy):** Add a PostgreSQL read replica; route read queries via `DATABASE_REPLICA_URL`.
3. **Database is slow (write-heavy):** Enable Citus on the existing PostgreSQL cluster; no application code changes required.
4. **Worker backlog growing:** Scale worker deployments (`doi-worker`, `notification-worker`, `gamification-worker`) independently.
5. **Single module dominates CPU:** Extract that module to its own FastAPI service; the existing service interface becomes an HTTP call.
