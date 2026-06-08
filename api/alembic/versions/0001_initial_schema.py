"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-06-08
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── schemas ───────────────────────────────────────────────────────────────
    for schema in ("identity", "papers", "reviews", "doi", "gamification", "notifications"):
        op.execute(f"CREATE SCHEMA IF NOT EXISTS {schema}")

    # ── identity.users ────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("orcid_id", sa.String(19), nullable=False, unique=True),
        sa.Column("display_name", sa.Text(), nullable=False),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("affiliation", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        schema="identity",
    )

    # ── papers.field_categories ───────────────────────────────────────────────
    op.create_table(
        "field_categories",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False, unique=True),
        sa.Column("slug", sa.String(120), nullable=False, unique=True),
        sa.Column("coi_depth", sa.SmallInteger(), nullable=False, server_default="2"),
        sa.Column("min_draft_days", sa.SmallInteger(), nullable=False, server_default="7"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        schema="papers",
    )

    # ── papers.submissions (partitioned by UUID prefix) ───────────────────────
    op.execute("""
        CREATE TABLE papers.submissions (
            id UUID NOT NULL,
            title TEXT NOT NULL,
            abstract TEXT NOT NULL,
            field_category_id UUID NOT NULL
                REFERENCES papers.field_categories(id),
            status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
            pdf_url TEXT NOT NULL,
            source_url TEXT,
            submitted_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (id)
        ) PARTITION BY RANGE (id)
    """)
    op.execute("CREATE TABLE papers.submissions_default PARTITION OF papers.submissions DEFAULT")

    op.create_table(
        "submission_authors",
        sa.Column("submission_id", sa.UUID(), sa.ForeignKey("papers.submissions.id"), primary_key=True),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("identity.users.id"), primary_key=True),
        sa.Column("position", sa.Integer(), nullable=False),
        schema="papers",
    )

    op.create_table(
        "status_history",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("submission_id", sa.UUID(), sa.ForeignKey("papers.submissions.id"), nullable=False),
        sa.Column("from_status", sa.String(30), nullable=True),
        sa.Column("to_status", sa.String(30), nullable=False),
        sa.Column("actor_id", sa.UUID(), sa.ForeignKey("identity.users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        schema="papers",
    )

    # ── reviews.coauthor_edges ────────────────────────────────────────────────
    op.create_table(
        "coauthor_edges",
        # No FK — graph seeded from ORCID; users may not be registered yet
        sa.Column("author_id", sa.UUID(), primary_key=True),
        sa.Column("coauthor_id", sa.UUID(), primary_key=True),
        sa.Column("source_work", sa.Text(), nullable=True),
        sa.Column("synced_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        schema="reviews",
    )

    # ── reviews.scores (partitioned) ─────────────────────────────────────────
    op.execute("""
        CREATE TABLE reviews.scores (
            id UUID NOT NULL,
            submission_id UUID NOT NULL REFERENCES papers.submissions(id),
            reviewer_id UUID NOT NULL REFERENCES identity.users(id),
            raw_score SMALLINT NOT NULL CHECK (raw_score >= 0 AND raw_score <= 5),
            submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (id),
            UNIQUE (submission_id, reviewer_id)
        ) PARTITION BY RANGE (id)
    """)
    op.execute("CREATE TABLE reviews.scores_default PARTITION OF reviews.scores DEFAULT")

    op.create_table(
        "comments",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("submission_id", sa.UUID(), sa.ForeignKey("papers.submissions.id"), nullable=False),
        sa.Column("reviewer_id", sa.UUID(), sa.ForeignKey("identity.users.id"), nullable=False),
        sa.Column("comment_type", sa.String(20), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("is_resolved", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("upvotes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("downvotes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        schema="reviews",
    )

    # ── doi.assignments ───────────────────────────────────────────────────────
    op.create_table(
        "assignments",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("submission_id", sa.UUID(), sa.ForeignKey("papers.submissions.id"), nullable=False, unique=True),
        sa.Column("doi", sa.Text(), unique=True, nullable=True),
        sa.Column("doi_status", sa.String(20), nullable=False, server_default="'pending'"),
        sa.Column("datacite_response", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        schema="doi",
    )

    # ── gamification.reputation_scores ────────────────────────────────────────
    op.create_table(
        "reputation_scores",
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("identity.users.id"), primary_key=True),
        sa.Column("normalized_weight", sa.Numeric(4, 2), nullable=False, server_default="1.00"),
        sa.Column("total_reviews", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_xp", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        schema="gamification",
    )

    # ── gamification.events (partitioned) ────────────────────────────────────
    op.execute("""
        CREATE TABLE gamification.events (
            id UUID NOT NULL,
            user_id UUID NOT NULL REFERENCES identity.users(id),
            event_type VARCHAR(60) NOT NULL,
            xp_delta INTEGER NOT NULL DEFAULT 0,
            metadata JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (id)
        ) PARTITION BY RANGE (id)
    """)
    op.execute("CREATE TABLE gamification.events_default PARTITION OF gamification.events DEFAULT")

    # ── notifications.notifications ───────────────────────────────────────────
    op.create_table(
        "notifications",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("identity.users.id"), nullable=False),
        sa.Column("notification_type", sa.String(60), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        schema="notifications",
    )

    # ── indexes ───────────────────────────────────────────────────────────────
    op.create_index("ix_submissions_status", "submissions", ["status"], schema="papers")
    op.create_index("ix_submissions_field", "submissions", ["field_category_id"], schema="papers")
    op.create_index("ix_coauthor_edges_coauthor", "coauthor_edges", ["coauthor_id"], schema="reviews")
    op.create_index("ix_gamification_events_user", "events", ["user_id"], schema="gamification")
    op.create_index("ix_notifications_user", "notifications", ["user_id", "is_read"], schema="notifications")


def downgrade() -> None:
    for schema in ("notifications", "gamification", "doi", "reviews", "papers", "identity"):
        op.execute(f"DROP SCHEMA IF EXISTS {schema} CASCADE")
