"""Clients are read-and-comment only; everything else is admin-only."""
import pytest

pytestmark = pytest.mark.asyncio


async def test_client_cannot_create_project(api, world):
    r = await api(world["client_a"]).post("/projects", json={
        "organization_id": world["org_a"].id, "name": "Self-served",
    })
    assert r.status_code == 403


async def test_client_cannot_edit_own_project(api, world):
    r = await api(world["client_a"]).patch(
        f"/projects/{world['proj_a'].id}", json={"completion_percentage": 100}
    )
    assert r.status_code == 403


async def test_client_cannot_create_milestone(api, world):
    r = await api(world["client_a"]).post("/milestones", json={
        "project_id": world["proj_a"].id, "title": "Invented",
    })
    assert r.status_code == 403


async def test_client_cannot_post_project_update(api, world):
    r = await api(world["client_a"]).post(
        f"/projects/{world['proj_a'].id}/updates", json={"content": "not mine to post"}
    )
    assert r.status_code == 403


async def test_client_cannot_request_an_upload_url(api, world):
    """Uploads are admin-only — otherwise clients can write to our bucket."""
    r = await api(world["client_a"]).post(
        f"/files/project/{world['proj_a'].id}/presign",
        data={"original_name": "x.pdf", "file_type": "application/pdf"},
    )
    assert r.status_code == 403


async def test_client_cannot_change_roles(api, world):
    r = await api(world["client_a"]).patch(
        f"/users/{world['member_a'].id}/role", json={"role": "admin"}
    )
    assert r.status_code == 403


async def test_client_cannot_escalate_self_via_admin_router(api, world):
    r = await api(world["client_a"]).patch(
        f"/admin/users/{world['client_a'].id}/role", json={"role": "admin"}
    )
    assert r.status_code == 403


async def test_client_cannot_read_admin_stats(api, world):
    assert (await api(world["client_a"]).get("/admin/stats")).status_code == 403


async def test_client_can_submit_a_request_on_own_project(api, world):
    r = await api(world["client_a"]).post("/requests", json={
        "project_id": world["proj_a"].id,
        "title": "Add an export button",
        "description": "We need CSV export on the report view.",
    })
    assert r.status_code == 200, r.text


async def test_client_cannot_submit_request_on_foreign_project(api, world):
    r = await api(world["client_a"]).post("/requests", json={
        "project_id": world["proj_b"].id, "title": "Sneaky", "description": "x",
    })
    assert r.status_code == 403


async def test_upload_without_storage_configured_says_so(api, world):
    """The local stack has no object storage. An unconfigured upload used to
    hand back an empty URL and fail silently in the browser."""
    r = await api(world["admin"]).post(
        f"/files/project/{world['proj_a'].id}/presign",
        data={"original_name": "brief.pdf", "file_type": "application/pdf"},
    )
    assert r.status_code == 503, r.text
    assert "not configured" in r.json()["detail"].lower()
