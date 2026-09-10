"""One client must never see or touch another client's data."""
import pytest

pytestmark = pytest.mark.asyncio


async def test_client_cannot_read_another_orgs_project(api, world):
    c = api(world["client_a"])
    r = await c.get(f"/projects/{world['proj_b'].id}")
    assert r.status_code == 403, r.text


async def test_project_list_is_scoped_to_own_org(api, world):
    c = api(world["client_a"])
    r = await c.get("/projects")
    assert r.status_code == 200
    ids = {p["id"] for p in r.json()}
    assert world["proj_a"].id in ids
    assert world["proj_b"].id not in ids


async def test_admin_sees_every_project(api, world):
    r = await api(world["admin"]).get("/projects")
    assert r.status_code == 200
    ids = {p["id"] for p in r.json()}
    assert {world["proj_a"].id, world["proj_b"].id} <= ids


@pytest.mark.parametrize("path", [
    "/milestones/project/{pid}",
    "/requests/project/{pid}",
    "/files/project/{pid}",
    "/analytics/project/{pid}",
    "/comments/project/{pid}",
    "/projects/{pid}/updates",
])
async def test_every_project_scoped_collection_is_blocked(api, world, path):
    c = api(world["client_a"])
    r = await c.get(path.format(pid=world["proj_b"].id))
    assert r.status_code == 403, f"{path} leaked: {r.status_code} {r.text}"


async def test_client_cannot_read_another_org(api, world):
    r = await api(world["client_a"]).get(f"/organizations/{world['org_b'].id}")
    assert r.status_code == 403


async def test_client_cannot_list_all_organizations(api, world):
    r = await api(world["client_a"]).get("/organizations")
    assert r.status_code == 403


async def test_client_cannot_read_another_orgs_onboarding(api, world):
    r = await api(world["client_a"]).get(f"/onboarding/{world['org_b'].id}")
    assert r.status_code == 403
