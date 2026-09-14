import uuid
from datetime import datetime

from sqlalchemy import (
    String, DateTime, Integer, LargeBinary, Boolean, ForeignKey, Index, text,
)
from sqlalchemy.orm import Mapped, mapped_column, deferred

from app.core.time import utcnow
from app.database import Base


class CompanyLetterhead(Base):
    """The company's own stationery, printed behind generated documents.

    Append-only. An agreement signed on one letterhead has to keep rendering on
    that letterhead after a new one is uploaded, so replacing a letterhead
    retires the old row instead of overwriting it - the same reasoning as
    EngagementDocument: the bytes must live exactly as long as the signature
    that refers to them.

    Kept in the database rather than object storage for that reason and one
    more: object storage is optional here, and uploads 503 when STORAGE_* is
    unset. Stationery that only sometimes exists would be worse than none.
    """

    __tablename__ = "company_letterheads"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(50), nullable=False)   # image/png | image/jpeg
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    width_px: Mapped[int] = mapped_column(Integer, nullable=False)
    height_px: Mapped[int] = mapped_column(Integer, nullable=False)
    # Content-addressed. This is what an engagement pins at send time, and what
    # the print view asks for by name, so a signed document is reproducible.
    sha256: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    # Deferred so listing letterheads never drags the image along with it.
    data: Mapped[bytes] = deferred(mapped_column(LargeBinary, nullable=False))
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    retired_at: Mapped[datetime | None] = mapped_column(DateTime)
    uploaded_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    __table_args__ = (
        # At most one current letterhead. Keyed on the boolean rather than on
        # `retired_at IS NULL`, because Postgres treats NULLs as distinct: a
        # unique index over them would not enforce the invariant at all.
        # Declared here and not only in the migration - the tests build their
        # schema with Base.metadata.create_all and never run migrations.
        Index(
            "uq_company_letterhead_current",
            "is_current",
            unique=True,
            postgresql_where=text("is_current"),
        ),
    )
