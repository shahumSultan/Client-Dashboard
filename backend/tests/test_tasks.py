"""The task board: who may do what, ordering, history, and bells."""
import uuid
from datetime import timedelta

import pytest
import pytest_asyncio
from sqlalchemy import delete, select

from app.core.time import utcnow
from app.models.company import Department
from app.models.notification import Notification
from app.models.task import Task
from app.models.user import User, UserRole

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture(autouse=True)
async def clean(session):
    for model in (Task, Department):
        await session.execute(delete(model))
    await session.commit()


async def _employee(session, name="Ayla Employee"):
    u = User(clerk_id=f"c_{uuid.uuid4().hex}", email=f"e-{uuid.uuid4().hex[:6]}@ec.com",
             full_name=name, role=UserRole.EMPLOYEE)
    session.add(u)
    await session.commit()
    return u


@pytest_asyncio.fixture
async def ayla(session):
    return await _employee(session, "Ayla Employee")


@pytest_asyncio.fixture
async def bilal(session):
    return await _employee(session, "Bilal Employee")


async def _task(client, **kw):
    r = await client.post("/tasks", json={"title": "Write the brief", **kw})
    assert r.status_code == 201, r.text
    return r.json()


async def _dept(admin, name, lead=None, members=()):
    """A department via the API; returns its id. The lead joins it too."""
    r = await admin.post("/departments", json={"name": name, "lead_user_id": lead.id if lead else None})
    assert r.status_code == 201, r.text
    dept_id = r.json()["id"]
    for m in members:
        await admin.put(f"/departments/{dept_id}/members/{m.id}")
    return dept_id


async def _bells(session, user):
    rows = await session.execute(select(Notification).where(Notification.user_id == user.id))
    return list(rows.scalars())


# ── Access ───────────────────────────────────────────────────────────────────

async def test_clients_never_see_tasks(api, world):
    client = api(world["client_a"])
    assert (await client.get("/tasks")).status_code == 403
    assert (await client.post("/tasks", json={"title": "x"})).status_code == 403


async def test_employee_creates_and_runs_their_own_task(api, world, ayla):
    me = api(ayla)
    t = await _task(me, priority="high", due_date="2026-12-01")
    assert t["creator"]["user_id"] == ayla.id and t["status"] == "todo"
    assert t["can_edit"] is True and t["can_delete"] is False

    r = await me.patch(f"/tasks/{t['id']}", json={"title": "Write the client brief", "status": "in_progress"})
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "in_progress"


async def test_employees_see_only_their_departments_and_their_own(api, world, ayla, bilal):
    admin = api(world["admin"])
    design = await _dept(admin, "Design", members=[ayla])
    sales = await _dept(admin, "Sales", members=[bilal])
    in_design = await _task(admin, title="Design task", department_id=design)
    in_sales = await _task(admin, title="Sales task", department_id=sales)
    assigned = await _task(admin, title="Assigned to Ayla", assignee_id=ayla.id)
    loose = await _task(admin, title="No department")
    own = await _task(api(ayla), title="Ayla filed this")

    me = api(ayla)
    seen = {t["title"]: t for t in (await me.get("/tasks")).json()}
    assert set(seen) == {"Design task", "Assigned to Ayla", "Ayla filed this"}
    assert all(t["can_edit"] for t in seen.values())

    # Another department's task (or an unrelated one) doesn't exist for her.
    for hidden in (in_sales, loose):
        assert (await me.get(f"/tasks/{hidden['id']}")).status_code == 404
        assert (await me.patch(f"/tasks/{hidden['id']}", json={"title": "x"})).status_code == 404
        assert (await me.post(f"/tasks/{hidden['id']}/comments", json={"body": "hi"})).status_code == 404
        assert (await me.get(f"/tasks/{hidden['id']}/activity")).status_code == 404
    # Filtering by someone else's department doesn't reveal it either.
    assert (await me.get(f"/tasks?department_id={sales}")).json() == []

    # What she can see, she can work on.
    for t in (in_design, assigned, own):
        assert (await me.patch(f"/tasks/{t['id']}", json={"priority": "high"})).status_code == 200


async def test_employees_file_tasks_only_under_their_own_departments(api, world, ayla, bilal):
    admin = api(world["admin"])
    design = await _dept(admin, "Design", members=[ayla])
    sales = await _dept(admin, "Sales", members=[bilal])
    me = api(ayla)
    assert (await me.post("/tasks", json={"title": "x", "department_id": sales})).status_code == 403
    t = await _task(me, department_id=design)
    assert (await me.patch(f"/tasks/{t['id']}", json={"department_id": sales})).status_code == 403


async def test_only_admins_and_department_leads_assign(api, world, session, ayla, bilal):
    admin = api(world["admin"])
    carol = await _employee(session, "Carol Lead")
    design = await _dept(admin, "Design", lead=carol, members=[ayla])
    sales = await _dept(admin, "Sales", members=[bilal])

    # A plain member can't assign - not even herself.
    me = api(ayla)
    assert (await me.post("/tasks", json={"title": "x", "department_id": design, "assignee_id": ayla.id})).status_code == 403
    t = await _task(me, department_id=design)
    assert t["can_assign"] is False
    assert (await me.patch(f"/tasks/{t['id']}", json={"assignee_id": ayla.id})).status_code == 403

    # The lead assigns within her department, to its members only.
    lead = api(carol)
    seen = (await lead.get(f"/tasks/{t['id']}")).json()
    assert seen["can_assign"] is True
    r = await lead.patch(f"/tasks/{t['id']}", json={"assignee_id": ayla.id})
    assert r.status_code == 200 and r.json()["assignee"]["user_id"] == ayla.id
    assert (await lead.patch(f"/tasks/{t['id']}", json={"assignee_id": bilal.id})).status_code == 422
    assert (await lead.patch(f"/tasks/{t['id']}", json={"assignee_id": None})).status_code == 200
    r = await lead.post("/tasks", json={"title": "y", "department_id": design, "assignee_id": ayla.id})
    assert r.status_code == 201
    # Not in a department she doesn't lead, nor on a task with no department.
    assert (await lead.post("/tasks", json={"title": "z", "assignee_id": carol.id})).status_code == 403

    # An admin assigns anyone, anywhere.
    r = await admin.post("/tasks", json={"title": "w", "department_id": sales, "assignee_id": ayla.id})
    assert r.status_code == 201 and r.json()["can_assign"] is True


async def test_employees_see_only_colleagues_and_admins(api, world, session, ayla, bilal):
    from app.models.company import TeamMember
    admin = api(world["admin"])
    carol = await _employee(session, "Carol Colleague")
    await _dept(admin, "Design", members=[ayla, carol])
    await _dept(admin, "Sales", members=[bilal])
    for u in (ayla, bilal, carol, world["admin"]):
        session.add(TeamMember(name=u.full_name, email=u.email, user_id=u.id))
    session.add(TeamMember(name="Adviser Without Login"))
    await session.commit()

    team = {m["name"] for m in (await api(ayla).get("/company/team")).json()}
    # Her department, plus the admins (other test files add admins of their own).
    assert {"Ayla Employee", "Carol Colleague", "EC Admin"} <= team
    assert "Bilal Employee" not in team and "Adviser Without Login" not in team
    depts = [d["name"] for d in (await api(ayla).get("/departments")).json()]
    assert depts == ["Design"]
    # Admins see everyone and every department.
    everyone = {m["name"] for m in (await admin.get("/company/team")).json()}
    assert {"Bilal Employee", "Adviser Without Login"} <= everyone
    assert len((await admin.get("/departments")).json()) == 2


async def test_an_employee_in_no_department_sees_only_their_own(api, world, ayla, bilal):
    admin = api(world["admin"])
    sales = await _dept(admin, "Sales", members=[bilal])
    await _task(admin, title="Sales work", department_id=sales)
    await _task(admin, title="For Ayla", assignee_id=ayla.id)
    assert [t["title"] for t in (await api(ayla).get("/tasks")).json()] == ["For Ayla"]
    assert (await api(ayla).get("/departments")).json() == []


async def test_only_admins_delete_and_link_client_projects(api, world, ayla):
    me = api(ayla)
    t = await _task(me)
    assert (await me.delete(f"/tasks/{t['id']}")).status_code == 403
    r = await me.post("/tasks", json={"title": "x", "project_id": world["proj_a"].id})
    assert r.status_code == 403
    assert (await me.patch(f"/tasks/{t['id']}", json={"project_id": world["proj_a"].id})).status_code == 403

    admin = api(world["admin"])
    r = await admin.patch(f"/tasks/{t['id']}", json={"project_id": world["proj_a"].id})
    assert r.status_code == 200
    assert r.json()["project"]["label"].endswith("· Acme Automation")
    # The employee sees the label, not just an id.
    seen = (await me.get(f"/tasks/{t['id']}")).json()
    assert seen["project"]["label"] == r.json()["project"]["label"]
    assert (await admin.delete(f"/tasks/{t['id']}")).status_code == 204


async def test_assignees_must_be_on_the_team(api, world):
    admin = api(world["admin"])
    r = await admin.post("/tasks", json={"title": "x", "assignee_id": world["client_a"].id})
    assert r.status_code == 422
    r = await admin.post("/tasks", json={"title": "x", "department_id": "nope"})
    assert r.status_code == 422


# ── Board order ──────────────────────────────────────────────────────────────

async def _column(client, status):
    return [t["title"] for t in (await client.get(f"/tasks?status={status}")).json()]


async def test_new_cards_go_on_top_and_moves_land_where_dropped(api, world):
    admin = api(world["admin"])
    a = await _task(admin, title="A")
    b = await _task(admin, title="B")
    c = await _task(admin, title="C")
    assert await _column(admin, "todo") == ["C", "B", "A"]

    # Move A between C and B.
    r = await admin.post(f"/tasks/{a['id']}/move", json={"status": "todo", "after_id": c["id"]})
    assert r.status_code == 200
    assert await _column(admin, "todo") == ["C", "A", "B"]

    # Move B to the top of In progress, then C under it.
    await admin.post(f"/tasks/{b['id']}/move", json={"status": "in_progress"})
    await admin.post(f"/tasks/{c['id']}/move", json={"status": "in_progress", "after_id": b["id"]})
    assert await _column(admin, "in_progress") == ["B", "C"]
    assert await _column(admin, "todo") == ["A"]

    # A card that has left the column can't be dropped under.
    r = await admin.post(f"/tasks/{a['id']}/move", json={"status": "todo", "after_id": c["id"]})
    assert r.status_code == 422


async def test_repeated_drops_in_one_spot_renumber_the_column(api, world):
    admin = api(world["admin"])
    top = await _task(admin, title="top")
    bottom = await _task(admin, title="bottom")
    await admin.post(f"/tasks/{top['id']}/move", json={"status": "todo"})  # top above bottom
    titles = ["top", "bottom"]
    # Keep inserting directly under "top" until floats run out of room.
    for i in range(70):
        t = await _task(admin, title=f"n{i}")
        await admin.post(f"/tasks/{t['id']}/move", json={"status": "todo", "after_id": top["id"]})
        titles.insert(1, f"n{i}")
    assert await _column(admin, "todo") == titles


async def test_done_sets_completed_and_old_done_cards_drop_off(api, world, session):
    admin = api(world["admin"])
    t = await _task(admin)
    r = await admin.post(f"/tasks/{t['id']}/move", json={"status": "done"})
    assert r.json()["completed_at"] is not None
    r = await admin.post(f"/tasks/{t['id']}/move", json={"status": "in_review"})
    assert r.json()["completed_at"] is None

    old = await _task(admin, title="Long done", status="done")
    row = await session.get(Task, old["id"])
    row.completed_at = utcnow() - timedelta(days=45)
    await session.commit()
    assert "Long done" not in [x["title"] for x in (await admin.get("/tasks")).json()]
    assert "Long done" in [x["title"] for x in (await admin.get("/tasks?all_done=true")).json()]


async def test_archiving_hides_a_task(api, world):
    admin = api(world["admin"])
    t = await _task(admin)
    await admin.patch(f"/tasks/{t['id']}", json={"is_archived": True})
    assert (await admin.get("/tasks")).json() == []
    assert len((await admin.get("/tasks?archived=true")).json()) == 1


async def test_filters(api, world, ayla):
    admin = api(world["admin"])
    await _task(admin, title="Mine", assignee_id=world["admin"].id, priority="urgent")
    await _task(admin, title="Hers", assignee_id=ayla.id)
    await _task(admin, title="Nobody's", description="needs an owner")
    titles = lambda r: sorted(t["title"] for t in r.json())
    assert titles(await admin.get("/tasks?assignee=me")) == ["Mine"]
    assert titles(await admin.get(f"/tasks?assignee={ayla.id}")) == ["Hers"]
    assert titles(await admin.get("/tasks?assignee=none")) == ["Nobody's"]
    assert titles(await admin.get("/tasks?priority=urgent")) == ["Mine"]
    assert titles(await admin.get("/tasks?q=owner")) == ["Nobody's"]


# ── History and bells ────────────────────────────────────────────────────────

async def test_every_change_is_recorded(api, world, ayla):
    admin = api(world["admin"])
    t = await _task(admin, assignee_id=ayla.id)
    await admin.patch(f"/tasks/{t['id']}", json={
        "title": "New title", "priority": "high", "due_date": "2026-12-24",
    })
    await admin.post(f"/tasks/{t['id']}/move", json={"status": "in_review"})
    await api(ayla).post(f"/tasks/{t['id']}/comments", json={"body": "Looks good"})

    history = (await admin.get(f"/tasks/{t['id']}/activity")).json()
    kinds = [h["kind"] for h in reversed(history)]
    assert kinds == ["created", "assigned", "edited", "priority", "due", "status", "comment"]
    status = next(h for h in history if h["kind"] == "status")
    assert status["data"] == {"from": "todo", "to": "in_review"}
    assert status["actor"]["name"] == "EC Admin"
    assert next(h for h in history if h["kind"] == "assigned")["data"]["to"] == "Ayla Employee"


async def test_bells_go_to_the_people_involved_but_not_the_actor(api, world, session, ayla, bilal):
    admin = api(world["admin"])
    # Same department, so Bilal can see (and comment on) Ayla's task.
    design = await _dept(admin, "Design", members=[ayla, bilal])
    t = await _task(admin, assignee_id=ayla.id, department_id=design)
    bells = await _bells(session, ayla)
    assert [b.type.value for b in bells] == ["task_assigned"]
    assert bells[0].link == f"/admin/tasks?task={t['id']}"
    assert await _bells(session, world["admin"]) == []  # never rings yourself

    # Ayla moves it: the creator hears, Ayla doesn't.
    await api(ayla).post(f"/tasks/{t['id']}/move", json={"status": "in_progress"})
    assert [b.type.value for b in await _bells(session, world["admin"])] == ["task_status"]
    assert len(await _bells(session, ayla)) == 1

    # Bilal comments on a colleague's task: both people involved hear.
    await api(bilal).post(f"/tasks/{t['id']}/comments", json={"body": "Need a hand?"})
    assert "task_comment" in [b.type.value for b in await _bells(session, ayla)]
    assert "task_comment" in [b.type.value for b in await _bells(session, world["admin"])]
    assert await _bells(session, bilal) == []

    # Reassigning rings the new assignee.
    await admin.patch(f"/tasks/{t['id']}", json={"assignee_id": bilal.id})
    assert [b.type.value for b in await _bells(session, bilal)] == ["task_assigned"]


async def test_comments_can_be_removed_by_their_author_or_an_admin(api, world, ayla, bilal):
    design = await _dept(api(world["admin"]), "Design", members=[ayla, bilal])
    t = await _task(api(world["admin"]), department_id=design)
    c = (await api(ayla).post(f"/tasks/{t['id']}/comments", json={"body": "First"})).json()
    assert c["can_delete"] is True and c["author"]["name"] == "Ayla Employee"
    assert (await api(bilal).delete(f"/tasks/{t['id']}/comments/{c['id']}")).status_code == 403
    assert (await api(ayla).delete(f"/tasks/{t['id']}/comments/{c['id']}")).status_code == 204
    c2 = (await api(bilal).post(f"/tasks/{t['id']}/comments", json={"body": "Second"})).json()
    assert (await api(world["admin"]).delete(f"/tasks/{t['id']}/comments/{c2['id']}")).status_code == 204
    assert (await api(world["admin"]).get(f"/tasks/{t['id']}")).json()["comment_count"] == 0


async def test_someone_who_left_keeps_their_name_on_the_task(api, world, session, ayla):
    admin = api(world["admin"])
    t = await _task(admin, assignee_id=ayla.id)
    await admin.patch(f"/admin/users/{ayla.id}/access", json={"active": False})
    seen = (await admin.get(f"/tasks/{t['id']}")).json()
    assert seen["assignee"]["name"] == "Ayla Employee" and seen["assignee"]["is_current"] is False


async def test_someone_who_left_the_team_hears_nothing_more(api, world, session, ayla, bilal):
    """Review finding on #12: a former employee kept getting task bells -
    titles and comment text - through the task's retained assignee/creator."""
    admin = api(world["admin"])
    # Same department, so Bilal's comment actually lands on the task.
    design = await _dept(admin, "Design", members=[ayla, bilal])
    t = await _task(admin, assignee_id=ayla.id, department_id=design)
    mine = await _task(api(ayla), title="Ayla's own task")
    assert [b.type.value for b in await _bells(session, ayla)] == ["task_assigned"]

    # Ayla becomes a client: her task bells go, and no new ones arrive.
    await admin.patch(f"/admin/users/{ayla.id}/role", json={"role": "client_member"})
    assert await _bells(session, ayla) == []
    r = await api(bilal).post(f"/tasks/{t['id']}/comments", json={"body": "Secret roadmap detail"})
    assert r.status_code == 201
    await admin.post(f"/tasks/{mine['id']}/move", json={"status": "done"})  # she created this one
    assert await _bells(session, ayla) == []
    assert (await api(ayla).get("/tasks")).status_code == 403


async def test_a_deactivated_account_hears_nothing_more(api, world, session, ayla):
    admin = api(world["admin"])
    t = await _task(admin, assignee_id=ayla.id)
    await admin.patch(f"/admin/users/{ayla.id}/access", json={"active": False})
    assert await _bells(session, ayla) == []
    await admin.post(f"/tasks/{t['id']}/comments", json={"body": "Still here?"})
    assert await _bells(session, ayla) == []
