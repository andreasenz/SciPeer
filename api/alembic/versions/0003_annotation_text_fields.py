"""add quoted_text and page_num to annotations (idempotent upgrade for existing installs)

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-08
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ADD COLUMN IF NOT EXISTS — safe to re-run on clean installs where 0002
    # already created these columns.
    op.execute("""
        ALTER TABLE reviews.annotations
        ADD COLUMN IF NOT EXISTS quoted_text TEXT,
        ADD COLUMN IF NOT EXISTS page_num INTEGER
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE reviews.annotations
        DROP COLUMN IF EXISTS quoted_text,
        DROP COLUMN IF EXISTS page_num
    """)
