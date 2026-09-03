from datetime import datetime, timezone


def utcnow() -> datetime:
    """Current UTC time as a naive datetime.

    Equivalent to the deprecated `datetime.utcnow()`, but built on the
    timezone-aware API. The tzinfo is stripped because the ORM columns are
    `DateTime` (TIMESTAMP WITHOUT TIME ZONE) and asyncpg rejects aware
    datetimes for those columns.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)
