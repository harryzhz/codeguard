"""Initial tables: projects, reviews, findings

Revision ID: 001
Revises:
Create Date: 2026-03-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "projects",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("name", sa.String(255), unique=True, nullable=False),
        sa.Column("repo_url", sa.Text, nullable=False),
        sa.Column("api_key", sa.String(255), unique=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "reviews",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column(
            "project_id",
            sa.CHAR(36),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("commit_sha", sa.String(255), nullable=False),
        sa.Column("branch", sa.String(255), server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "findings",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column(
            "review_id",
            sa.CHAR(36),
            sa.ForeignKey("reviews.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("file", sa.Text, nullable=False),
        sa.Column("line", sa.Integer, nullable=False),
        sa.Column("rule", sa.String(255), nullable=False),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("snippet", sa.Text, server_default=""),
        sa.Column("meta", sa.JSON, nullable=True),
        sa.Column("status", sa.String(20), server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("findings")
    op.drop_table("reviews")
    op.drop_table("projects")
