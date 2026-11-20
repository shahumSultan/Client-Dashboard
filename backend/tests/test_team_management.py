"""Managing team accounts from Company -> Team: roles, access, the waiting list.

Joining or leaving the team keeps the directory and departments in step, so
they always describe the team as it is.
"""
import uuid

import pytest
import pytest_asyncio
from sqlalchemy import delete

from app.models.company import Department, TeamMember
from app.models.user import User, UserRole

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture(autouse=True)
async def clean(session):
    for model in (Department, TeamMember):
        await session.execute(delete(model))
    await session.commit()


async def _user(session, role=UserRole.CLIENT_MEMBER, **kw):
    u = User(clerk_id=f"c_{uuid.uuid4().hex}", email=f"u-{uuid.uuid4().hex[:6]}@ec.com",
             full_name="Sam Person", role=role, **kw)
    session.add(u)
    await session.commit()
    return u


def _entry(team, user):
    return next((m for m in team if m["user_id"] == user.id), None)


async def test_adding_a_waiting_signup_to_the_team(api, world, session):
    waiting = await _user(session)
    admin = api(world["admin"])
    listed = {u["id"] for u in (await admin.get("/admin/users/waiting")).json()}
    assert waiting.id in listed
    # Clients and team accounts are never "waiting".
    assert world["client_a"].id not in listed and world["admin"].id not in listed

    r = await admin.patch(f"/admin/users/{waiting.id}/role", json={"role": "employee"})
    assert r.status_code == 200, r.text
    assert waiting.id not in {u["id"] for u in (await admin.get("/admin/users/waiting")).json()}
    entry = _entry((await admin.get("/company/team")).json(), waiting)
    assert entry and entry["is_active"]
    assert entry["account"] == {"role": "employee", "is_active": True, "avatar_url": None}


async def test_team_rows_carry_the_account_behind_them(api, world, session):
    session.add(TeamMember(name="No Login"))
    await session.commit()
    team = (await api(world["admin"]).get("/company/team")).json()
    assert next(m for m in team if m["name"] == "No Login")["account"] is None


async def test_removing_access_signs_them_out_and_keeps_the_history(api, world, session):
    employee = await _user(session)
    admin = api(world["admin"])
    await admin.patch(f"/admin/users/{employee.id}/role", json={"role": "employee"})
    dept = (await admin.post("/departments", json={"name": "Ops", "lead_user_id": employee.id})).json()

    r = await admin.patch(f"/admin/users/{employee.id}/access", json={"active": False})
    assert r.status_code == 200 and r.json()["is_active"] is False

    assert (await api(employee).get("/users/me")).status_code == 403
    entry = _entry((await admin.get("/company/team")).json(), employee)
    assert entry["is_active"] is False and entry["account"]["is_active"] is False
    ops = next(d for d in (await admin.get("/departments")).json() if d["id"] == dept["id"])
    assert ops["lead"] is None and ops["members"] == []

    # Restoring brings the directory entry back, without duplicating it.
    r = await admin.patch(f"/admin/users/{employee.id}/access", json={"active": True})
    assert r.json()["is_active"] is True
    team = (await admin.get("/company/team")).json()
    assert sum(1 for m in team if m["user_id"] == employee.id) == 1
    assert _entry(team, employee)["is_active"] is True
    assert (await api(employee).get("/users/me")).status_code == 200


async def test_access_rules(api, world, session):
    admin = api(world["admin"])
    r = await admin.patch(f"/admin/users/{world['admin'].id}/access", json={"active": False})
    assert r.status_code == 409
    assert (await admin.patch("/admin/users/nobody/access", json={"active": False})).status_code == 404
    employee = await _user(session, role=UserRole.EMPLOYEE)
    for who in (employee, world["client_a"]):
        r = await api(who).patch(f"/admin/users/{world['member_a'].id}/access", json={"active": False})
        assert r.status_code == 403
        assert (await api(who).get("/admin/users/waiting")).status_code == 403


async def test_a_client_account_can_have_its_access_removed(api, world, session):
    member = await _user(session, role=UserRole.CLIENT_MEMBER, organization_id=world["org_a"].id)
    r = await api(world["admin"]).patch(f"/admin/users/{member.id}/access", json={"active": False})
    assert r.status_code == 200
    assert (await api(member).get("/projects")).status_code == 403


async def test_a_linked_entry_cannot_be_deleted_while_they_have_access(api, world, session):
    employee = await _user(session, role=UserRole.EMPLOYEE)
    admin = api(world["admin"])
    await admin.patch(f"/admin/users/{employee.id}/role", json={"role": "client_member"})
    await admin.patch(f"/admin/users/{employee.id}/role", json={"role": "employee"})
    entry = _entry((await admin.get("/company/team")).json(), employee)
    assert (await admin.delete(f"/company/team/{entry['id']}")).status_code == 409
    await admin.patch(f"/admin/users/{employee.id}/access", json={"active": False})
    assert (await admin.delete(f"/company/team/{entry['id']}")).status_code == 204


async def test_editing_a_linked_entry_keeps_its_link_and_status(api, world, session):
    employee = await _user(session, role=UserRole.CLIENT_MEMBER)
    admin = api(world["admin"])
    await admin.patch(f"/admin/users/{employee.id}/role", json={"role": "employee"})
    entry = _entry((await admin.get("/company/team")).json(), employee)
    r = await admin.put(f"/company/team/{entry['id']}", json={
        "name": "Sam P.", "title": "Engineer", "user_id": None, "is_active": False,
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["title"] == "Engineer"
    assert body["user_id"] == employee.id and body["is_active"] is True
    assert body["account"]["role"] == "employee"


async def test_moving_to_a_client_role_marks_them_former(api, world, session):
    employee = await _user(session, role=UserRole.CLIENT_MEMBER)
    admin = api(world["admin"])
    await admin.patch(f"/admin/users/{employee.id}/role", json={"role": "employee"})
    await admin.patch(f"/admin/users/{employee.id}/role", json={"role": "client_member"})
    entry = _entry((await admin.get("/company/team")).json(), employee)
    assert entry["is_active"] is False
