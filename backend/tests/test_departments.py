"""Departments: admins organise the team; employees can see how it is organised."""
import uuid

import pytest
import pytest_asyncio
from sqlalchemy import delete

from app.models.company import DEPARTMENT_COLOURS, Department, TeamMember
from app.models.user import User, UserRole
from app.schemas.company import Colour

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture(autouse=True)
async def clean(session):
    """The test database is shared across the session; departments are global."""
    for model in (Department, TeamMember):
        await session.execute(delete(model))
    await session.commit()


@pytest_asyncio.fixture
async def employee(session):
    u = User(clerk_id=f"c_{uuid.uuid4().hex}", email=f"e-{uuid.uuid4().hex[:6]}@ec.com",
             full_name="Ayla Engineer", role=UserRole.EMPLOYEE)
    session.add(u)
    await session.commit()
    return u


async def test_schema_colours_match_the_model():
    assert set(Colour.__args__) == set(DEPARTMENT_COLOURS)


async def test_admin_builds_a_department(api, world, employee):
    admin = api(world["admin"])
    r = await admin.post("/departments", json={
        "name": "  Engineering ", "colour": "blue", "lead_user_id": employee.id,
    })
    assert r.status_code == 201, r.text
    dept = r.json()
    assert dept["name"] == "Engineering"
    # The lead is a member without being added twice.
    assert dept["lead"]["user_id"] == employee.id
    assert [m["user_id"] for m in dept["members"]] == [employee.id]

    r = await admin.put(f"/departments/{dept['id']}/members/{world['admin'].id}")
    assert {m["user_id"] for m in r.json()["members"]} == {employee.id, world["admin"].id}
    # Adding again is harmless.
    r = await admin.put(f"/departments/{dept['id']}/members/{world['admin'].id}")
    assert len(r.json()["members"]) == 2

    # Removing the lead also clears the lead.
    r = await admin.delete(f"/departments/{dept['id']}/members/{employee.id}")
    body = r.json()
    assert body["lead"] is None and [m["user_id"] for m in body["members"]] == [world["admin"].id]


async def test_names_are_unique(api, world):
    admin = api(world["admin"])
    assert (await admin.post("/departments", json={"name": "Sales"})).status_code == 201
    assert (await admin.post("/departments", json={"name": "Sales"})).status_code == 409
    other = (await admin.post("/departments", json={"name": "Design"})).json()
    r = await admin.put(f"/departments/{other['id']}", json={"name": "Sales"})
    assert r.status_code == 409


async def test_only_team_accounts_can_be_members_or_leads(api, world):
    admin = api(world["admin"])
    dept = (await admin.post("/departments", json={"name": "Ops"})).json()
    r = await admin.put(f"/departments/{dept['id']}/members/{world['client_a'].id}")
    assert r.status_code == 422
    r = await admin.post("/departments", json={"name": "X", "lead_user_id": world["client_a"].id})
    assert r.status_code == 422
    r = await admin.put(f"/departments/{dept['id']}/members/nobody")
    assert r.status_code == 422


async def test_employees_read_departments_but_cannot_change_them(api, world, employee):
    admin = api(world["admin"])
    dept = (await admin.post("/departments", json={"name": "Engineering"})).json()
    await admin.put(f"/departments/{dept['id']}/members/{employee.id}")

    client = api(employee)
    listed = (await client.get("/departments")).json()
    assert [d["name"] for d in listed] == ["Engineering"]
    assert (await client.post("/departments", json={"name": "Mine"})).status_code == 403
    assert (await client.put(f"/departments/{dept['id']}", json={"name": "Renamed"})).status_code == 403
    assert (await client.delete(f"/departments/{dept['id']}")).status_code == 403
    assert (await client.put(f"/departments/{dept['id']}/members/{employee.id}")).status_code == 403


async def test_clients_never_see_departments(api, world):
    assert (await api(world["client_a"]).get("/departments")).status_code == 403


async def test_team_directory_shows_each_persons_departments(api, world, employee, session):
    admin = api(world["admin"])
    eng = (await admin.post("/departments", json={"name": "Engineering", "colour": "blue"})).json()
    await admin.put(f"/departments/{eng['id']}/members/{employee.id}")
    session.add_all([
        TeamMember(name="Ayla Engineer", email=employee.email, user_id=employee.id),
        TeamMember(name="Directory Only"),
    ])
    await session.commit()

    team = {m["name"]: m for m in (await admin.get("/company/team")).json()}
    assert team["Ayla Engineer"]["departments"] == [{"id": eng["id"], "name": "Engineering", "colour": "blue"}]
    assert team["Directory Only"]["departments"] == []


async def test_deleting_a_department_keeps_the_people(api, world, employee, session):
    admin = api(world["admin"])
    dept = (await admin.post("/departments", json={"name": "Temp"})).json()
    await admin.put(f"/departments/{dept['id']}/members/{employee.id}")
    assert (await admin.delete(f"/departments/{dept['id']}")).status_code == 204
    assert (await admin.get("/departments")).json() == []
    assert await session.get(User, employee.id) is not None


async def test_leaving_the_team_clears_department_seats(api, world, employee):
    """Review finding on #9: a lead turned client stayed listed, and the
    department could no longer be saved (the lead failed re-validation)."""
    admin = api(world["admin"])
    dept = (await admin.post("/departments", json={"name": "Sales", "lead_user_id": employee.id})).json()
    other = (await admin.post("/departments", json={"name": "Ops"})).json()
    await admin.put(f"/departments/{other['id']}/members/{employee.id}")

    r = await admin.patch(f"/admin/users/{employee.id}/role", json={"role": "client_member"})
    assert r.status_code == 200, r.text

    listed = {d["name"]: d for d in (await admin.get("/departments")).json()}
    assert listed["Sales"]["lead"] is None and listed["Sales"]["members"] == []
    assert listed["Ops"]["members"] == []
    r = await admin.put(f"/departments/{dept['id']}", json={"name": "Sales & Marketing"})
    assert r.status_code == 200, r.text


async def test_a_stray_row_never_shows_a_non_team_account(api, world, session, employee):
    """Defence in depth: even a membership row that escaped clean-up stays hidden."""
    from app.models.company import DepartmentMember
    admin = api(world["admin"])
    dept = (await admin.post("/departments", json={"name": "Design", "lead_user_id": employee.id})).json()
    session.add(DepartmentMember(department_id=dept["id"], user_id=world["client_a"].id))
    employee.is_active = False
    await session.commit()

    listed = (await admin.get("/departments")).json()[0]
    assert listed["members"] == [] and listed["lead"] is None
    # Still editable: the unchanged lead isn't re-validated.
    r = await admin.put(f"/departments/{dept['id']}", json={"name": "Design", "lead_user_id": employee.id})
    assert r.status_code == 200, r.text
