from __future__ import annotations
from datetime import datetime, timezone
from sqlalchemy import Float, ForeignKey, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.utils import generate_short_id


class Base(DeclarativeBase):
    pass

class ProjectRow(Base):
    __tablename__ = "projects"
    id: Mapped[str] = mapped_column(String(12), primary_key=True, default=generate_short_id)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
    reviews: Mapped[list["ReviewRow"]] = relationship(back_populates="project", cascade="all, delete-orphan")

class ReviewRow(Base):
    __tablename__ = "reviews"
    id: Mapped[str] = mapped_column(String(12), primary_key=True, default=generate_short_id)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=False)
    version: Mapped[str] = mapped_column(String(50), nullable=False, default="1.0")
    summary: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    files_changed: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
    project: Mapped["ProjectRow"] = relationship(back_populates="reviews")
    findings: Mapped[list["FindingRow"]] = relationship(back_populates="review", cascade="all, delete-orphan")

class FindingRow(Base):
    __tablename__ = "findings"
    id: Mapped[str] = mapped_column(String(12), primary_key=True, default=generate_short_id)
    review_id: Mapped[str] = mapped_column(ForeignKey("reviews.id"), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    evidence_chain: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    test_verification: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    suggestion: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="open")
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
    review: Mapped["ReviewRow"] = relationship(back_populates="findings")
