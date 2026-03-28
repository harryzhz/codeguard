"""Change reviews.version from VARCHAR to INTEGER with auto-increment per project

Revision ID: 002
Revises: 001
Create Date: 2026-03-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Assign sequential version numbers to existing rows per project (by created_at)
    op.execute("""
        UPDATE reviews SET version = sub.row_num::text
        FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) AS row_num
            FROM reviews
        ) sub
        WHERE reviews.id = sub.id
    """)

    # Change column type from VARCHAR to INTEGER
    op.alter_column(
        "reviews",
        "version",
        type_=sa.Integer,
        postgresql_using="version::integer",
        nullable=False,
    )

    # Add unique constraint on (project_id, version)
    op.create_unique_constraint("uq_reviews_project_version", "reviews", ["project_id", "version"])


def downgrade() -> None:
    op.drop_constraint("uq_reviews_project_version", "reviews", type_="unique")
    op.alter_column(
        "reviews",
        "version",
        type_=sa.String(50),
        postgresql_using="version::text",
        nullable=False,
    )
