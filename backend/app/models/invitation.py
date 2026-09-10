import uuid
from datetime import datetime, timedelta
from app.core.time import utcnow
from sqlalchemy import String, DateTime, ForeignKey, Enum, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.user import UserRole

# Long enough that a client is not rushed, short enough that a stale link in an
# old inbox stops working.
INVITE_TTL_DAYS = 14


def default_expiry() -> datetime:
    return utcnow() + timedelta(days=INVITE_TTL_DAYS)


class Invitation(Base):
    """An admin-issued grant of access to one organization.

    Bound to an email address: the token alone is not enough, so a forwarded or
    leaked link cannot let a stranger into a client's workspace.
    """

    __tablename__ = "invitations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id: Mapped[str] = mapped_column(
        String, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    # Stored lower-cased; matching is exact against the user's Clerk email.
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, values_callable=lambda x: [e.value for e in x]),
        default=UserRole.CLIENT_MEMBER,
    )
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)

    expires_at: Mapped[datetime] = mapped_column(DateTime, default=default_expiry)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime)
    accepted_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime)

    invited_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    organization: Mapped["Organization"] = relationship("Organization")

    __table_args__ = (
        Index("ix_invitations_email", "email"),
        Index("ix_invitations_org", "organization_id"),
    )

    @property
    def is_pending(self) -> bool:
        return (
            self.accepted_at is None
            and self.revoked_at is None
            and self.expires_at > utcnow()
        )
