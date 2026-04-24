import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class OnboardingData(Base):
    __tablename__ = "onboarding_data"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id: Mapped[str] = mapped_column(String, ForeignKey("organizations.id"), unique=True, nullable=False)
    current_step: Mapped[int] = mapped_column(Integer, default=1)
    completed: Mapped[bool] = mapped_column(default=False)

    # Step 1: Business Info
    business_type: Mapped[str | None] = mapped_column(String(100))
    team_size: Mapped[str | None] = mapped_column(String(50))
    primary_contact_name: Mapped[str | None] = mapped_column(String(255))
    primary_contact_phone: Mapped[str | None] = mapped_column(String(50))
    timezone: Mapped[str | None] = mapped_column(String(100))

    # Step 2: Integrations (stored as JSON)
    integrations: Mapped[dict | None] = mapped_column(JSON)  # {google_analytics: {...}, callrail: {...}}

    # Step 3: Goals
    goals: Mapped[list | None] = mapped_column(JSON)  # list of goal strings
    kpis: Mapped[list | None] = mapped_column(JSON)

    # Step 4: Notes / additional
    notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization: Mapped["Organization"] = relationship("Organization")
