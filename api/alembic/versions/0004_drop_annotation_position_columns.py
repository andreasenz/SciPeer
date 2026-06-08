"""drop x_pct and y_pct from annotations (replaced by quoted_text/page_num)

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-08
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE reviews.annotations
        DROP COLUMN IF EXISTS x_pct,
        DROP COLUMN IF EXISTS y_pct
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE reviews.annotations
        ADD COLUMN IF NOT EXISTS x_pct DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS y_pct DOUBLE PRECISION
    """)
