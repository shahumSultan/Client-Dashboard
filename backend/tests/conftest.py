"""Test harness for the API.

Auth is stubbed rather than mocked at the HTTP layer: `get_current_user` is
overridden to return a chosen User, so every route still runs its real
`require_admin` / `assert_project_access` logic against that identity. That is
the behaviour worth testing — Clerk's token verification is Clerk's problem.
"""
import os
import uuid

import pytest
import pytest_asyncio
from fastapi import Depends, Request
from httpx import AsyncClient, ASGITransport
from sqlalchemy import create_engine, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

os.environ.setdefault("DATABASE_URL", "postgresql://enigma:enigma_secret@postgres:5432/client_portal")
os.environ.setdefault("CLERK_SECRET_KEY", "sk_test_stub")
os.environ.setdefault("CLERK_JWT_ISSUER", "https://stub.clerk.accounts.dev")

from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.core.auth import get_current_user  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402
from app.models.organization import Organization  # noqa: E402
from app.models.project import Project, ProjectUpdate  # noqa: E402
from app.models.milestone import Milestone  # noqa: E402

TEST_DB = "client_portal_test"
_BASE = os.environ["DATABASE_URL"]
SYNC_ADMIN_URL = _BASE.replace("postgresql://", "postgresql+psycopg2://")
SYNC_TEST_URL = SYNC_ADMIN_URL.rsplit("/", 1)[0] + f"/{TEST_DB}"
ASYNC_TEST_URL = _BASE.replace("postgresql://", "postgresql+asyncpg://").rsplit("/", 1)[0] + f"/{TEST_DB}"


@pytest.fixture(scope="session")
def database():
    """Build the test database once, synchronously.

    Deliberately sync: asyncpg connections are bound to the loop that opened
    them, and a session-scoped async fixture would hand function-scoped tests
    connections from a dead loop.
    """
    admin = create_engine(SYNC_ADMIN_URL, isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        conn.execute(text(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
            f"WHERE datname = '{TEST_DB}' AND pid <> pg_backend_pid()"
        ))
        conn.execute(text(f'DROP DATABASE IF EXISTS "{TEST_DB}"'))
        conn.execute(text(f'CREATE DATABASE "{TEST_DB}"'))
    admin.dispose()

    schema = create_engine(SYNC_TEST_URL)
    Base.metadata.create_all(schema)
    schema.dispose()
    yield


@pytest_asyncio.fixture
async def engine(database):
    # One engine per test, so every connection belongs to that test's loop.
    eng = create_async_engine(ASYNC_TEST_URL, poolclass=None)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
async def session(engine):
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        yield s


@pytest_asyncio.fixture
async def world(session):
    """Two unrelated tenants plus an admin — the shape isolation bugs hide in."""
    org_a = Organization(name="Acme Law", slug=f"acme-{uuid.uuid4().hex[:6]}")
    org_b = Organization(name="Globex", slug=f"globex-{uuid.uuid4().hex[:6]}")
    session.add_all([org_a, org_b])
    await session.flush()

    admin = User(clerk_id=f"c_{uuid.uuid4().hex}", email=f"admin-{uuid.uuid4().hex[:6]}@ec.com",
                 full_name="EC Admin", role=UserRole.ADMIN)
    client_a = User(clerk_id=f"c_{uuid.uuid4().hex}", email=f"a-{uuid.uuid4().hex[:6]}@acme.com",
                    full_name="Acme Owner", role=UserRole.CLIENT_OWNER, organization_id=org_a.id)
    member_a = User(clerk_id=f"c_{uuid.uuid4().hex}", email=f"m-{uuid.uuid4().hex[:6]}@acme.com",
                    full_name="Acme Member", role=UserRole.CLIENT_MEMBER, organization_id=org_a.id)
    client_b = User(clerk_id=f"c_{uuid.uuid4().hex}", email=f"b-{uuid.uuid4().hex[:6]}@globex.com",
                    full_name="Globex Owner", role=UserRole.CLIENT_OWNER, organization_id=org_b.id)
    session.add_all([admin, client_a, member_a, client_b])
    await session.flush()

    proj_a = Project(organization_id=org_a.id, name="Acme Automation")
    proj_b = Project(organization_id=org_b.id, name="Globex Pipeline")
    session.add_all([proj_a, proj_b])
    await session.flush()

    ms_a = Milestone(project_id=proj_a.id, title="Acme discovery")
    ms_b = Milestone(project_id=proj_b.id, title="Globex discovery")
    upd_b = ProjectUpdate(project_id=proj_b.id, author_id=admin.id, content="Globex internal note")
    session.add_all([ms_a, ms_b, upd_b])

    await session.commit()
    return {
        "org_a": org_a, "org_b": org_b,
        "admin": admin, "client_a": client_a, "member_a": member_a, "client_b": client_b,
        "proj_a": proj_a, "proj_b": proj_b,
        "ms_a": ms_a, "ms_b": ms_b, "upd_b": upd_b,
    }


@pytest_asyncio.fixture
async def api(engine, session):
    """Returns a factory: `await api(user)` -> AsyncClient acting as that user."""
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def _get_db():
        async with maker() as s:
            yield s

    clients: list[AsyncClient] = []

    async def _current(request: Request, db: AsyncSession = Depends(get_db)) -> User:
        # Identity comes off the request, so two clients in one test stay
        # distinct. Re-read inside the request's own session: handing routes an
        # instance owned by the test session breaks the moment a route mutates
        # and commits it, and is not how production behaves.
        uid = request.headers["x-test-user"]
        result = await db.execute(select(User).where(User.id == uid))
        return result.scalar_one()

    app.dependency_overrides[get_db] = _get_db
    app.dependency_overrides[get_current_user] = _current

    def _as(user: User) -> AsyncClient:
        c = AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test/api/v1",
            headers={"X-Test-User": user.id},
        )
        clients.append(c)
        return c

    yield _as

    for c in clients:
        await c.aclose()
    app.dependency_overrides.clear()
