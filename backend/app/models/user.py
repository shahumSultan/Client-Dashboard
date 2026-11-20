import uuid
from datetime import datetime
from app.core.time import utcnow
from sqlalchemy import String, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"             # Enigma-Cube team - full control
    # Enigma-Cube team, not an admin: works on tasks and reads company basics,
    # never sees clients. Was "staff" (read-only everywhere) before 2026-11.
    EMPLOYEE = "employee"
    CLIENT_OWNER = "client_owner"
    CLIENT_MEMBER = "client_member"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    clerk_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)  # Clerk user ID
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, values_callable=lambda x: [e.value for e in x]),
        default=UserRole.CLIENT_MEMBER,
    )
    organization_id: Mapped[str | None] = mapped_column(String, ForeignKey("organizations.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_seen: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="users")
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="user")


TEAM_ROLES = (UserRole.ADMIN, UserRole.EMPLOYEE)


def is_team(user: "User") -> bool:
    """An Enigma-Cube account of any kind, as opposed to a client.

    Team accounts never belong to a client workspace. This does NOT mean the
    account can see clients - that is `sees_all_clients`.
    """
    return user.role in TEAM_ROLES


def sees_all_clients(user: "User") -> bool:
    """Reads every client's workspace rather than one. Admins only.

    Employees are on the team but kept away from client data, so they fail
    both this and the per-organization check.
    """
    return user.role == UserRole.ADMIN
