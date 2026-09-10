"""The comment system — the feature clients touch most."""
import pytest

pytestmark = pytest.mark.asyncio


async def _post(c, pid, **kw):
    return await c.post(f"/comments/project/{pid}", json=kw)


async def test_client_can_comment_on_own_milestone(api, world):
    c = api(world["client_a"])
    r = await _post(c, world["proj_a"].id, target_type="milestone",
                    target_id=world["ms_a"].id, body="Can we add SSO to this phase?")
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["author"]["id"] == world["client_a"].id
    assert body["replies"] == []


async def test_project_level_comment_needs_no_target_id(api, world):
    r = await _post(api(world["client_a"]), world["proj_a"].id,
                    target_type="project", body="General question.")
    assert r.status_code == 201, r.text
    assert r.json()["target_id"] == world["proj_a"].id


async def test_cannot_comment_on_another_orgs_project(api, world):
    r = await _post(api(world["client_a"]), world["proj_b"].id,
                    target_type="project", body="not mine")
    assert r.status_code == 403


async def test_cannot_anchor_a_comment_to_another_orgs_milestone(api, world):
    """The target must belong to the project, or a client could attach a
    comment to another tenant's work through their own project."""
    r = await _post(api(world["client_a"]), world["proj_a"].id,
                    target_type="milestone", target_id=world["ms_b"].id, body="x")
    assert r.status_code == 404, r.text


async def test_cannot_anchor_to_another_orgs_update(api, world):
    r = await _post(api(world["client_a"]), world["proj_a"].id,
                    target_type="update", target_id=world["upd_b"].id, body="x")
    assert r.status_code == 404


async def test_milestone_target_requires_a_target_id(api, world):
    r = await _post(api(world["client_a"]), world["proj_a"].id,
                    target_type="milestone", body="x")
    assert r.status_code == 422


async def test_admin_reply_appears_in_the_thread(api, world):
    client = api(world["client_a"])
    created = await _post(client, world["proj_a"].id, target_type="project", body="Question?")
    cid = created.json()["id"]

    reply = await api(world["admin"]).post(f"/comments/{cid}/replies", json={"body": "Answer."})
    assert reply.status_code == 201, reply.text

    threads = (await client.get(f"/comments/project/{world['proj_a'].id}")).json()
    thread = next(t for t in threads if t["id"] == cid)
    assert [r["body"] for r in thread["replies"]] == ["Answer."]


async def test_replies_cannot_be_nested(api, world):
    client = api(world["client_a"])
    cid = (await _post(client, world["proj_a"].id, target_type="project", body="Root")).json()["id"]
    rid = (await client.post(f"/comments/{cid}/replies", json={"body": "One"})).json()["id"]

    r = await client.post(f"/comments/{rid}/replies", json={"body": "Two"})
    assert r.status_code == 422


async def test_client_cannot_reply_into_another_orgs_thread(api, world):
    cid = (await _post(api(world["client_b"]), world["proj_b"].id,
                       target_type="project", body="Globex only")).json()["id"]
    r = await api(world["client_a"]).post(f"/comments/{cid}/replies", json={"body": "peeking"})
    assert r.status_code == 403


async def test_only_admins_resolve_threads(api, world):
    client = api(world["client_a"])
    cid = (await _post(client, world["proj_a"].id, target_type="project", body="Root")).json()["id"]

    assert (await client.patch(f"/comments/{cid}/resolve",
                               json={"is_resolved": True})).status_code == 403

    ok = await api(world["admin"]).patch(f"/comments/{cid}/resolve", json={"is_resolved": True})
    assert ok.status_code == 200 and ok.json()["is_resolved"] is True


async def test_clients_cannot_edit_each_others_comments(api, world):
    cid = (await _post(api(world["client_a"]), world["proj_a"].id,
                       target_type="project", body="Mine")).json()["id"]
    r = await api(world["member_a"]).patch(f"/comments/{cid}", json={"body": "Rewritten"})
    assert r.status_code == 403


async def test_admins_cannot_rewrite_a_clients_words(api, world):
    cid = (await _post(api(world["client_a"]), world["proj_a"].id,
                       target_type="project", body="Mine")).json()["id"]
    r = await api(world["admin"]).patch(f"/comments/{cid}", json={"body": "Rewritten"})
    assert r.status_code == 403


async def test_author_can_delete_own_comment(api, world):
    client = api(world["client_a"])
    cid = (await _post(client, world["proj_a"].id, target_type="project", body="Oops")).json()["id"]
    assert (await client.delete(f"/comments/{cid}")).status_code == 204


async def test_client_cannot_delete_another_clients_comment(api, world):
    cid = (await _post(api(world["client_a"]), world["proj_a"].id,
                       target_type="project", body="Mine")).json()["id"]
    assert (await api(world["member_a"]).delete(f"/comments/{cid}")).status_code == 403


async def test_deleting_a_thread_removes_its_replies(api, world):
    client = api(world["client_a"])
    cid = (await _post(client, world["proj_a"].id, target_type="project", body="Root")).json()["id"]
    await api(world["admin"]).post(f"/comments/{cid}/replies", json={"body": "Reply"})

    assert (await api(world["admin"]).delete(f"/comments/{cid}")).status_code == 204
    threads = (await client.get(f"/comments/project/{world['proj_a'].id}")).json()
    assert all(t["id"] != cid for t in threads)


async def test_inbox_is_admin_only(api, world):
    assert (await api(world["client_a"]).get("/comments/inbox")).status_code == 403


async def test_inbox_spans_tenants_and_hides_resolved(api, world):
    a = (await _post(api(world["client_a"]), world["proj_a"].id,
                     target_type="project", body="Acme asks")).json()["id"]
    b = (await _post(api(world["client_b"]), world["proj_b"].id,
                     target_type="project", body="Globex asks")).json()["id"]

    admin = api(world["admin"])
    open_ids = {t["id"] for t in (await admin.get("/comments/inbox")).json()}
    assert {a, b} <= open_ids

    await admin.patch(f"/comments/{a}/resolve", json={"is_resolved": True})
    still_open = {t["id"] for t in (await admin.get("/comments/inbox")).json()}
    assert a not in still_open and b in still_open

    everything = {t["id"] for t in (await admin.get("/comments/inbox?only_open=false")).json()}
    assert {a, b} <= everything


async def test_inbox_rows_name_their_project(api, world):
    await _post(api(world["client_a"]), world["proj_a"].id, target_type="project", body="Acme asks")
    rows = (await api(world["admin"]).get("/comments/inbox")).json()
    assert any(r["project"]["name"] == "Acme Automation" for r in rows)


async def test_empty_comment_is_rejected(api, world):
    r = await _post(api(world["client_a"]), world["proj_a"].id, target_type="project", body="   ")
    assert r.status_code in (201, 422)
    if r.status_code == 201:
        pytest.fail("whitespace-only comment was accepted")
