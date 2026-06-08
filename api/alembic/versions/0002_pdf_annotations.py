"""add pdf annotations table

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-08
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "annotations",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column(
            "submission_id",
            sa.UUID(),
            sa.ForeignKey("papers.submissions.id"),
            nullable=False,
        ),
        sa.Column(
            "reviewer_id",
            sa.UUID(),
            sa.ForeignKey("identity.users.id"),
            nullable=False,
        ),
        sa.Column("quoted_text", sa.Text(), nullable=True),
        sa.Column("page_num", sa.Integer(), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        schema="reviews",
    )
    op.create_index(
        "ix_annotations_submission_id",
        "annotations",
        ["submission_id"],
        schema="reviews",
    )


def downgrade() -> None:
    op.drop_index("ix_annotations_submission_id", table_name="annotations", schema="reviews")
    op.drop_table("annotations", schema="reviews")
