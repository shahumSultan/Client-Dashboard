"""Read-only staff: sees what an admin sees, changes nothing."""
import re
import uuid

import pytest
import pytest_asyncio
from fastapi.routing import APIRoute

from app.main import app
from app.models.notification import Notification, NotificationType
from app.models.user import User, UserRole

pytestmark = pytest.mark.asyncio

# The only writes staff may make: their own inbox and profile.
STAFF_WRITABLE = {
    ("POST", "/api/v1/notifications/{notification_id}/read"),
    ("POST", "/api/v1/notifications/read-all"),
    ("PATCH", "/api/v1/users/me"),
}


@pytest_asyncio.fixture
async def staff(session):
    u = User(clerk_id=f"c_{uuid.uuid4().hex}", email=f"new-{uuid.uuid4().hex[:6]}@ec.com",
             full_name="New Hire", role=UserRole.STAFF)
    session.add(u)
    await session.commit()
    return u


def _write_routes():
    for route in app.routes:
        if not isinstance(route, APIRoute) or not route.path.startswith("/api/v1"):
            continue
        for method in route.methods - {"GET", "HEAD", "OPTIONS"}:
            yield method, route.path


async def test_every_write_endpoint_refuses_staff(api, staff):
    """Swept from the router, so a route added later is covered without a new test."""
    client = api(staff)
    checked = 0
    for method, path in _write_routes():
        if (method, path) in STAFF_WRITABLE:
            continue
        url = re.sub(r"\{[^}]+\}", "x", path).removeprefix("/api/v1")
        r = await client.request(method, url, json={})
        assert r.status_code == 403, f"{method} {path} -> {r.status_code}"
        checked += 1
    assert checked > 30  # the sweep actually found the API


async def test_staff_can_read_the_admin_panel(api, world, staff):
    client = api(staff)
    assert (await client.get("/admin/stats")).status_code == 200
    assert (await client.get("/admin/users")).status_code == 200
    assert (await client.get("/admin/requests")).status_code == 200
    # Every client's projects, like an admin — not scoped to one workspace.
    names = {p["name"] for p in (await client.get("/projects")).json()}
    assert {"Acme Automation", "Globex Pipeline"} <= names
    assert (await client.get(f"/projects/{world['proj_b'].id}")).status_code == 200
    assert (await client.get(f"/organizations/{world['org_a'].id}")).status_code == 200


async def test_staff_sees_onboarding_but_cannot_touch_it(api, world, staff):
    e = (await api(world["admin"]).post(
        "/engagements", json={"project_id": world["proj_a"].id}
    )).json()
    client = api(staff)
    assert (await client.get(f"/engagements/{e['id']}")).status_code == 200
    assert (await client.patch(f"/engagements/{e['id']}", json={"scope": "x"})).status_code == 403
    assert (await client.post(f"/engagements/{e['id']}/send")).status_code == 403


async def test_staff_can_clear_their_own_notifications(api, session, staff):
    n = Notification(user_id=staff.id, type=NotificationType.COMMENT_ADDED, title="hi")
    session.add(n)
    await session.commit()
    client = api(staff)
    assert (await client.post(f"/notifications/{n.id}/read")).status_code == 204
    assert (await client.post("/notifications/read-all")).status_code == 204
    assert (await client.patch("/users/me", json={"full_name": "New Hire"})).status_code == 200


async def test_staff_hear_about_client_activity(api, world, staff):
    r = await api(world["client_a"]).post(
        f"/comments/project/{world['proj_a'].id}",
        json={"target_type": "project", "body": "Quick question"},
    )
    assert r.status_code == 201, r.text
    bells = (await api(staff).get("/notifications")).json()
    assert any("Quick question" in (n.get("body") or "") for n in bells)


# ── Granting it ──────────────────────────────────────────────────────────────

async def test_admin_can_make_someone_staff(api, world, session):
    hire = User(clerk_id=f"c_{uuid.uuid4().hex}", email=f"hire-{uuid.uuid4().hex[:6]}@ec.com")
    session.add(hire)
    await session.commit()
    r = await api(world["admin"]).patch(f"/admin/users/{hire.id}/role", json={"role": "staff"})
    assert r.status_code == 200, r.text
    assert r.json()["role"] == "staff"


async def test_staff_cannot_promote_themselves_or_anyone(api, world, staff):
    client = api(staff)
    assert (await client.patch(f"/admin/users/{staff.id}/role", json={"role": "admin"})).status_code == 403
    assert (await client.patch(
        f"/admin/users/{world['client_a'].id}/role", json={"role": "client_member"}
    )).status_code == 403


async def test_admin_cannot_demote_themselves(api, world):
    r = await api(world["admin"]).patch(
        f"/admin/users/{world['admin'].id}/role", json={"role": "staff"}
    )
    assert r.status_code == 409


async def test_client_users_cannot_be_given_team_roles(api, world):
    r = await api(world["admin"]).patch(
        f"/admin/users/{world['client_a'].id}/role", json={"role": "staff"}
    )
    assert r.status_code == 409


async def test_unknown_roles_are_rejected_cleanly(api, world):
    r = await api(world["admin"]).patch(
        f"/admin/users/{world['client_a'].id}/role", json={"role": "superuser"}
    )
    assert r.status_code == 422


async def test_invitations_cannot_grant_staff(api, world):
    r = await api(world["admin"]).post("/invitations", json={
        "organization_id": world["org_a"].id, "email": "x@acme.com", "role": "staff",
    })
    assert r.status_code == 422
