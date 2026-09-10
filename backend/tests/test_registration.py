"""Self-serve signup: the first thing a new client touches."""
import uuid

import pytest
from app.models.user import User, UserRole

pytestmark = pytest.mark.asyncio


async def _fresh_user(session) -> User:
    u = User(clerk_id=f"c_{uuid.uuid4().hex}", email=f"new-{uuid.uuid4().hex[:6]}@acme.com",
             role=UserRole.CLIENT_MEMBER)
    session.add(u)
    await session.commit()
    await session.refresh(u)
    return u


async def test_registration_creates_and_claims_the_workspace(api, world, session):
    user = await _fresh_user(session)
    r = await api(user).post("/users/me/register", json={
        "full_name": "Dana Reed", "company_name": "Northwind Trading",
    })
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["role"] == "client_owner"
    assert body["organization_id"]
    assert body["full_name"] == "Dana Reed"


async def test_same_company_name_gets_a_distinct_slug(api, world, session):
    """Two clients may share a name; the slug carries uniqueness."""
    slugs = set()
    for _ in range(2):
        user = await _fresh_user(session)
        r = await api(user).post("/users/me/register", json={
            "full_name": "Someone", "company_name": "Acme Law",
        })
        assert r.status_code == 201, r.text
        org = await api(user).get(f"/organizations/{r.json()['organization_id']}")
        slugs.add(org.json()["slug"])
    assert len(slugs) == 2, f"slug collision: {slugs}"


async def test_registering_twice_is_rejected(api, world):
    """client_a already has an organization — this must not mint a second."""
    r = await api(world["client_a"]).post("/users/me/register", json={
        "full_name": "Acme Owner", "company_name": "Another Co",
    })
    assert r.status_code == 409


async def test_company_name_is_required(api, world, session):
    user = await _fresh_user(session)
    r = await api(user).post("/users/me/register", json={
        "full_name": "Dana", "company_name": "   ",
    })
    assert r.status_code in (201, 422)
    if r.status_code == 201:
        pytest.fail("blank company name created a workspace")


async def test_new_client_sees_an_empty_portal_not_someone_elses(api, world, session):
    user = await _fresh_user(session)
    await api(user).post("/users/me/register", json={
        "full_name": "Dana", "company_name": "Northwind",
    })
    projects = await api(user).get("/projects")
    assert projects.status_code == 200
    assert projects.json() == []
