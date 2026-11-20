"""Employees: on the Enigma-Cube team, kept away from clients and money.

They read the company profile, the team, departments, and policy/brand
documents. Everything client-facing, plus users, settings, bank accounts and
the restricted document categories, is admin-only. Their only writes are their
own inbox and profile, and tasks (see tests/test_tasks.py).
"""
import re
import uuid

import pytest
import pytest_asyncio
from fastapi.routing import APIRoute

from app.main import app
from app.models.notification import Notification, NotificationType
from app.models.user import User, UserRole

pytestmark = pytest.mark.asyncio

# The only writes an employee may make: their own inbox and profile.
EMPLOYEE_WRITABLE = {
    ("POST", "/api/v1/notifications/{notification_id}/read"),
    ("POST", "/api/v1/notifications/read-all"),
    ("PATCH", "/api/v1/users/me"),
}


@pytest_asyncio.fixture
async def employee(session):
    u = User(clerk_id=f"c_{uuid.uuid4().hex}", email=f"new-{uuid.uuid4().hex[:6]}@ec.com",
             full_name="New Hire", role=UserRole.EMPLOYEE)
    session.add(u)
    await session.commit()
    return u


def _write_routes():
    for route in app.routes:
        if not isinstance(route, APIRoute) or not route.path.startswith("/api/v1"):
            continue
        for method in route.methods - {"GET", "HEAD", "OPTIONS"}:
            yield method, route.path


async def test_every_other_write_endpoint_refuses_employees(api, employee):
    """Swept from the router, so a route added later is covered without a new test."""
    client = api(employee)
    checked = 0
    for method, path in _write_routes():
        # Tasks are theirs to work on; tests/test_tasks.py covers those rules.
        if (method, path) in EMPLOYEE_WRITABLE or path.startswith("/api/v1/tasks"):
            continue
        url = re.sub(r"\{[^}]+\}", "x", path).removeprefix("/api/v1")
        r = await client.request(method, url, json={})
        assert r.status_code == 403, f"{method} {path} -> {r.status_code}"
        checked += 1
    assert checked > 30  # the sweep actually found the API


async def test_employees_never_see_clients(api, world, employee):
    client = api(employee)
    for path in ("/admin/stats", "/admin/users", "/admin/requests", "/comments/inbox",
                 "/organizations", "/invitations"):
        assert (await client.get(path)).status_code == 403, path
    # Not every client's projects, as an admin gets - none at all.
    assert (await client.get("/projects")).json() == []
    assert (await client.get(f"/projects/{world['proj_b'].id}")).status_code == 403
    assert (await client.get(f"/organizations/{world['org_a'].id}")).status_code == 403
    assert (await client.get(f"/requests/project/{world['proj_a'].id}")).status_code == 403
    assert (await client.get(f"/comments/project/{world['proj_a'].id}")).status_code == 403


async def test_employees_cannot_open_onboarding_paperwork(api, world, employee):
    e = (await api(world["admin"]).post(
        "/engagements", json={"project_id": world["proj_a"].id}
    )).json()
    client = api(employee)
    assert (await client.get(f"/engagements/{e['id']}")).status_code == 404
    assert (await client.get("/engagements")).json() == []


async def test_employees_can_clear_their_own_notifications(api, session, employee):
    n = Notification(user_id=employee.id, type=NotificationType.COMMENT_ADDED, title="hi")
    session.add(n)
    await session.commit()
    client = api(employee)
    assert (await client.post(f"/notifications/{n.id}/read")).status_code == 204
    assert (await client.post("/notifications/read-all")).status_code == 204
    assert (await client.patch("/users/me", json={"full_name": "New Hire"})).status_code == 200


async def test_client_activity_rings_admins_not_employees(api, world, employee):
    r = await api(world["client_a"]).post(
        f"/comments/project/{world['proj_a'].id}",
        json={"target_type": "project", "body": "Quick question"},
    )
    assert r.status_code == 201, r.text
    bells = (await api(employee).get("/notifications")).json()
    assert not any("Quick question" in (n.get("body") or "") for n in bells)
    admin_bells = (await api(world["admin"]).get("/notifications")).json()
    assert any("Quick question" in (n.get("body") or "") for n in admin_bells)


# ── Granting it ──────────────────────────────────────────────────────────────

async def test_admin_can_make_someone_employee(api, world, session):
    hire = User(clerk_id=f"c_{uuid.uuid4().hex}", email=f"hire-{uuid.uuid4().hex[:6]}@ec.com")
    session.add(hire)
    await session.commit()
    r = await api(world["admin"]).patch(f"/admin/users/{hire.id}/role", json={"role": "employee"})
    assert r.status_code == 200, r.text
    assert r.json()["role"] == "employee"


async def test_employee_cannot_promote_themselves_or_anyone(api, world, employee):
    client = api(employee)
    assert (await client.patch(f"/admin/users/{employee.id}/role", json={"role": "admin"})).status_code == 403
    assert (await client.patch(
        f"/admin/users/{world['client_a'].id}/role", json={"role": "client_member"}
    )).status_code == 403


async def test_admin_cannot_demote_themselves(api, world):
    r = await api(world["admin"]).patch(
        f"/admin/users/{world['admin'].id}/role", json={"role": "employee"}
    )
    assert r.status_code == 409


async def test_client_users_cannot_be_given_team_roles(api, world):
    r = await api(world["admin"]).patch(
        f"/admin/users/{world['client_a'].id}/role", json={"role": "employee"}
    )
    assert r.status_code == 409


async def test_unknown_roles_are_rejected_cleanly(api, world):
    r = await api(world["admin"]).patch(
        f"/admin/users/{world['client_a'].id}/role", json={"role": "superuser"}
    )
    assert r.status_code == 422


async def test_invitations_cannot_grant_employee(api, world):
    r = await api(world["admin"]).post("/invitations", json={
        "organization_id": world["org_a"].id, "email": "x@acme.com", "role": "employee",
    })
    assert r.status_code == 422


# ── Team accounts and client invitations ─────────────────────────────────────

@pytest.mark.parametrize("role", [UserRole.ADMIN, UserRole.EMPLOYEE])
async def test_team_accounts_cannot_be_invited_as_clients(api, world, session, role):
    member = User(clerk_id=f"c_{uuid.uuid4().hex}", email=f"t-{uuid.uuid4().hex[:6]}@ec.com", role=role)
    session.add(member)
    await session.commit()
    r = await api(world["admin"]).post("/invitations", json={
        "organization_id": world["org_a"].id, "email": member.email.upper(),
    })
    assert r.status_code == 409


@pytest.mark.parametrize("role", [UserRole.ADMIN, UserRole.EMPLOYEE])
async def test_a_stray_invitation_never_converts_a_team_account(api, world, session, role):
    """Even if one exists - e.g. sent before the address joined the team."""
    from app.models.invitation import Invitation
    member = User(clerk_id=f"c_{uuid.uuid4().hex}", email=f"t-{uuid.uuid4().hex[:6]}@ec.com", role=role)
    invite = Invitation(organization_id=world["org_a"].id, email=member.email,
                        role=UserRole.CLIENT_OWNER, token=uuid.uuid4().hex)
    session.add_all([member, invite])
    await session.commit()

    me = (await api(member).get("/users/me")).json()
    assert me["role"] == role.value
    assert me["organization_id"] is None

    r = await api(member).post("/invitations/accept", json={"token": invite.token})
    assert r.status_code in (403, 409)  # employees are refused writes before it matters
    await session.refresh(member)
    assert member.role == role and member.organization_id is None


# ── Team invitations ─────────────────────────────────────────────────────────

async def _new_signup(session, email):
    """Someone who has just signed up: a client_member with no workspace yet."""
    u = User(clerk_id=f"c_{uuid.uuid4().hex}", email=email, full_name="Sam Hire")
    session.add(u)
    await session.commit()
    return u


async def test_team_invite_makes_an_employee_and_lists_them(api, world, session):
    email = f"hire-{uuid.uuid4().hex[:6]}@ec.com"
    r = await api(world["admin"]).post("/company/team/invitations", json={"email": email.upper()})
    assert r.status_code == 201, r.text
    invite = r.json()
    assert invite["organization_id"] is None and invite["role"] == "employee"
    pending = (await api(world["admin"]).get("/company/team/invitations")).json()
    assert invite["id"] in {i["id"] for i in pending}

    # The join page names the team, not a client.
    preview = (await api(world["admin"]).get(f"/invitations/preview?token={invite['token']}")).json()
    assert preview["organization_name"] is None

    hire = await _new_signup(session, email)

    r = await api(hire).post("/invitations/accept", json={"token": invite["token"]})
    assert r.status_code == 200, r.text
    me = (await api(hire).get("/users/me")).json()
    assert me["role"] == "employee" and me["organization_id"] is None

    team = (await api(world["admin"]).get("/company/team")).json()
    assert any(m["user_id"] == hire.id and m["email"] == email for m in team)


async def test_signing_up_with_an_invited_address_joins_the_team(api, world, session):
    email = f"hire-{uuid.uuid4().hex[:6]}@ec.com"
    await api(world["admin"]).post("/company/team/invitations", json={"email": email, "role": "admin"})
    hire = await _new_signup(session, email)
    me = (await api(hire).get("/users/me")).json()  # auto-accept runs here
    assert me["role"] == "admin"


async def test_accepting_links_an_existing_directory_entry(api, world, session):
    from app.models.company import TeamMember
    email = f"hire-{uuid.uuid4().hex[:6]}@ec.com"
    entry = TeamMember(name="Listed Before Invite", email=email.upper())
    session.add(entry)
    await session.commit()
    await api(world["admin"]).post("/company/team/invitations", json={"email": email})
    hire = await _new_signup(session, email)
    await api(hire).get("/users/me")
    await session.refresh(entry)
    assert entry.user_id == hire.id
    team = (await api(world["admin"]).get("/company/team")).json()
    assert sum(1 for m in team if (m["email"] or "").lower() == email) == 1


async def test_reinviting_returns_the_live_invite_with_the_new_role(api, world):
    email = f"hire-{uuid.uuid4().hex[:6]}@ec.com"
    a = (await api(world["admin"]).post("/company/team/invitations", json={"email": email})).json()
    b = (await api(world["admin"]).post(
        "/company/team/invitations", json={"email": email, "role": "admin"}
    )).json()
    assert a["id"] == b["id"] and b["role"] == "admin"


async def test_team_invites_refuse_clients_team_members_and_client_roles(api, world, employee):
    admin = api(world["admin"])
    r = await admin.post("/company/team/invitations", json={"email": world["client_a"].email})
    assert r.status_code == 409
    r = await admin.post("/company/team/invitations", json={"email": employee.email})
    assert r.status_code == 409
    r = await admin.post("/company/team/invitations", json={"email": "x@ec.com", "role": "client_owner"})
    assert r.status_code == 422


async def test_a_client_cannot_redeem_a_team_invite(api, world, session):
    from app.models.invitation import Invitation
    invite = Invitation(organization_id=None, email=world["client_a"].email,
                        role=UserRole.EMPLOYEE, token=uuid.uuid4().hex)
    session.add(invite)
    await session.commit()
    r = await api(world["client_a"]).post("/invitations/accept", json={"token": invite.token})
    assert r.status_code == 409
    await session.refresh(world["client_a"])
    assert world["client_a"].role == UserRole.CLIENT_OWNER


async def test_only_admins_manage_team_invites(api, world, employee):
    for who in (employee, world["client_a"]):
        client = api(who)
        assert (await client.get("/company/team/invitations")).status_code == 403
        assert (await client.post("/company/team/invitations", json={"email": "x@ec.com"})).status_code == 403


async def test_the_database_rejects_a_team_role_on_a_client_invite(session, world):
    from sqlalchemy.exc import IntegrityError
    from app.models.invitation import Invitation
    session.add(Invitation(organization_id=world["org_a"].id, email="x@acme.com",
                           role=UserRole.EMPLOYEE, token=uuid.uuid4().hex))
    with pytest.raises(IntegrityError):
        await session.commit()
    await session.rollback()
