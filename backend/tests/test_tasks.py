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


async def test_employees_edit_only_tasks_that_are_theirs(api, world, session, ayla, bilal):
    admin = api(world["admin"])
    other = await _task(admin, assignee_id=bilal.id)
    me = api(ayla)
    # Readable and commentable, but not editable.
    listed = {t["id"]: t for t in (await me.get("/tasks")).json()}
    assert listed[other["id"]]["can_edit"] is False
    assert (await me.patch(f"/tasks/{other['id']}", json={"title": "Mine now"})).status_code == 403
    assert (await me.post(f"/tasks/{other['id']}/move", json={"status": "done"})).status_code == 403
    assert (await me.post(f"/tasks/{other['id']}/comments", json={"body": "Can I help?"})).status_code == 201

    # Assigned to them: editable.
    mine = await _task(admin, assignee_id=ayla.id)
    assert (await me.patch(f"/tasks/{mine['id']}", json={"priority": "urgent"})).status_code == 200

    # In one of their departments: editable.
    dept = (await admin.post("/departments", json={"name": "Design"})).json()
    await admin.put(f"/departments/{dept['id']}/members/{ayla.id}")
    team = await _task(admin, department_id=dept["id"])
    assert (await me.patch(f"/tasks/{team['id']}", json={"priority": "low"})).status_code == 200


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
    t = await _task(admin, assignee_id=ayla.id)
    bells = await _bells(session, ayla)
    assert [b.type.value for b in bells] == ["task_assigned"]
    assert bells[0].link == f"/admin/tasks?task={t['id']}"
    assert await _bells(session, world["admin"]) == []  # never rings yourself

    # Ayla moves it: the creator hears, Ayla doesn't.
    await api(ayla).post(f"/tasks/{t['id']}/move", json={"status": "in_progress"})
    assert [b.type.value for b in await _bells(session, world["admin"])] == ["task_status"]
    assert len(await _bells(session, ayla)) == 1

    # Bilal comments on someone else's task: both people involved hear.
    await api(bilal).post(f"/tasks/{t['id']}/comments", json={"body": "Need a hand?"})
    assert "task_comment" in [b.type.value for b in await _bells(session, ayla)]
    assert "task_comment" in [b.type.value for b in await _bells(session, world["admin"])]
    assert await _bells(session, bilal) == []

    # Reassigning rings the new assignee.
    await admin.patch(f"/tasks/{t['id']}", json={"assignee_id": bilal.id})
    assert [b.type.value for b in await _bells(session, bilal)] == ["task_assigned"]


async def test_comments_can_be_removed_by_their_author_or_an_admin(api, world, ayla, bilal):
    t = await _task(api(world["admin"]))
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
    t = await _task(admin, assignee_id=ayla.id)
    mine = await _task(api(ayla), title="Ayla's own task")
    assert [b.type.value for b in await _bells(session, ayla)] == ["task_assigned"]

    # Ayla becomes a client: her task bells go, and no new ones arrive.
    await admin.patch(f"/admin/users/{ayla.id}/role", json={"role": "client_member"})
    assert await _bells(session, ayla) == []
    await api(bilal).post(f"/tasks/{t['id']}/comments", json={"body": "Secret roadmap detail"})
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
