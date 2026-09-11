"""Invite-only access: an invitation is the only way into a workspace."""
import uuid
from datetime import timedelta

import pytest
from sqlalchemy import select

from app.core.time import utcnow
from app.models.user import User, UserRole
from app.models.invitation import Invitation

pytestmark = pytest.mark.asyncio


async def _signup(session, email: str) -> User:
    """A brand-new Clerk user: no organization, no role beyond the default."""
    u = User(clerk_id=f"c_{uuid.uuid4().hex}", email=email, role=UserRole.CLIENT_MEMBER)
    session.add(u)
    await session.commit()
    await session.refresh(u)
    return u


async def _invite(api, world, email, role="client_member", org=None):
    r = await api(world["admin"]).post("/invitations", json={
        "organization_id": (org or world["org_a"]).id, "email": email, "role": role,
    })
    assert r.status_code == 201, r.text
    return r.json()


async def test_self_serve_registration_is_gone(api, world):
    r = await api(world["client_a"]).post("/users/me/register", json={
        "full_name": "X", "company_name": "Should Not Work",
    })
    assert r.status_code == 404


async def test_only_admins_invite(api, world):
    r = await api(world["client_a"]).post("/invitations", json={
        "organization_id": world["org_a"].id, "email": "x@acme.com",
    })
    assert r.status_code == 403


async def test_invitations_cannot_grant_admin(api, world):
    r = await api(world["admin"]).post("/invitations", json={
        "organization_id": world["org_a"].id, "email": "x@acme.com", "role": "admin",
    })
    assert r.status_code == 422, r.text


async def test_signing_up_with_the_invited_address_joins_automatically(api, world, session):
    """The common path: no link, no token - just sign up with that email."""
    email = f"dana-{uuid.uuid4().hex[:6]}@acme.com"
    await _invite(api, world, email, role="client_owner")

    user = await _signup(session, email)
    me = await api(user).get("/users/me")
    assert me.status_code == 200, me.text
    assert me.json()["organization_id"] == world["org_a"].id
    assert me.json()["role"] == "client_owner"


async def test_an_uninvited_signup_gets_no_workspace(api, world, session):
    user = await _signup(session, f"stranger-{uuid.uuid4().hex[:6]}@example.com")
    me = await api(user).get("/users/me")
    assert me.status_code == 200
    assert me.json()["organization_id"] is None
    assert (await api(user).get("/projects")).json() == []


async def test_accepting_by_token_works(api, world, session):
    """The link is idempotent: auto-accept usually places the user first, and
    opening the link afterwards must not report the invitation as invalid."""
    email = f"tok-{uuid.uuid4().hex[:6]}@acme.com"
    invite = await _invite(api, world, email)
    user = await _signup(session, email)

    first = await api(user).post("/invitations/accept", json={"token": invite["token"]})
    assert first.status_code == 200, first.text
    again = await api(user).post("/invitations/accept", json={"token": invite["token"]})
    assert again.status_code == 200, again.text
    assert (await api(user).get("/users/me")).json()["organization_id"] == world["org_a"].id


async def test_a_leaked_link_is_useless_to_someone_else(api, world, session):
    """The email binding is what makes the link safe to send."""
    invite = await _invite(api, world, f"intended-{uuid.uuid4().hex[:6]}@acme.com")
    attacker = await _signup(session, f"attacker-{uuid.uuid4().hex[:6]}@evil.com")

    r = await api(attacker).post("/invitations/accept", json={"token": invite["token"]})
    assert r.status_code == 403, r.text
    assert (await api(attacker).get("/users/me")).json()["organization_id"] is None


async def test_a_spent_invitation_cannot_admit_anyone_else(api, world, session):
    """Idempotent for its owner, but never a reusable key for a second person."""
    email = f"once-{uuid.uuid4().hex[:6]}@acme.com"
    invite = await _invite(api, world, email)
    owner = await _signup(session, email)
    assert (await api(owner).post("/invitations/accept",
                                  json={"token": invite["token"]})).status_code == 200

    other = await _signup(session, f"other-{uuid.uuid4().hex[:6]}@acme.com")
    r = await api(other).post("/invitations/accept", json={"token": invite["token"]})
    assert r.status_code == 404
    assert (await api(other).get("/users/me")).json()["organization_id"] is None


async def test_a_revoked_invitation_cannot_be_used(api, world, session):
    email = f"revoked-{uuid.uuid4().hex[:6]}@acme.com"
    invite = await _invite(api, world, email)
    assert (await api(world["admin"]).delete(f"/invitations/{invite['id']}")).status_code == 204

    user = await _signup(session, email)
    assert (await api(user).post("/invitations/accept",
                                 json={"token": invite["token"]})).status_code == 404
    assert (await api(user).get("/users/me")).json()["organization_id"] is None


async def test_an_expired_invitation_cannot_be_used(api, world, session):
    email = f"stale-{uuid.uuid4().hex[:6]}@acme.com"
    invite = await _invite(api, world, email)

    row = (await session.execute(
        select(Invitation).where(Invitation.id == invite["id"])
    )).scalar_one()
    row.expires_at = utcnow() - timedelta(days=1)
    await session.commit()

    user = await _signup(session, email)
    assert (await api(user).post("/invitations/accept",
                                 json={"token": invite["token"]})).status_code == 404
    assert (await api(user).get("/users/me")).json()["organization_id"] is None


async def test_a_bogus_token_is_rejected(api, world, session):
    user = await _signup(session, f"nobody-{uuid.uuid4().hex[:6]}@acme.com")
    assert (await api(user).post("/invitations/accept",
                                 json={"token": "x" * 40})).status_code == 404


async def test_an_invite_cannot_move_an_existing_client_between_tenants(api, world):
    """client_a already belongs to org_a; an invite to org_b must not move them."""
    invite = await _invite(api, world, world["client_a"].email, org=world["org_b"])
    r = await api(world["client_a"]).post("/invitations/accept", json={"token": invite["token"]})
    assert r.status_code == 409
    assert (await api(world["client_a"]).get("/users/me")).json()["organization_id"] == world["org_a"].id


async def test_reinviting_the_same_address_reuses_the_invitation(api, world):
    email = f"dupe-{uuid.uuid4().hex[:6]}@acme.com"
    first = await _invite(api, world, email)
    second = await _invite(api, world, email)
    assert first["id"] == second["id"]


async def test_preview_names_the_workspace_and_the_invited_address(api, world, session):
    email = f"prev-{uuid.uuid4().hex[:6]}@acme.com"
    invite = await _invite(api, world, email)
    stranger = await _signup(session, f"other-{uuid.uuid4().hex[:6]}@x.com")

    # Readable by any signed-in user so the join page can explain a mismatch,
    # but it exposes only the workspace name and the invited address.
    r = await api(stranger).get(f"/invitations/preview?token={invite['token']}")
    assert r.status_code == 200, r.text
    assert r.json()["organization_name"] == "Acme Law"
    assert r.json()["email"] == email


async def test_clients_cannot_list_invitations(api, world):
    assert (await api(world["client_a"]).get("/invitations")).status_code == 403


async def test_pending_list_hides_spent_invitations(api, world, session):
    email = f"listed-{uuid.uuid4().hex[:6]}@acme.com"
    invite = await _invite(api, world, email)
    admin = api(world["admin"])

    pending = {i["id"] for i in (await admin.get(f"/invitations?organization_id={world['org_a'].id}")).json()}
    assert invite["id"] in pending

    user = await _signup(session, email)
    await api(user).post("/invitations/accept", json={"token": invite["token"]})

    still = {i["id"] for i in (await admin.get(f"/invitations?organization_id={world['org_a'].id}")).json()}
    assert invite["id"] not in still

    everything = {i["id"] for i in (await admin.get("/invitations?include_spent=true")).json()}
    assert invite["id"] in everything


async def test_client_creation_derives_a_slug_when_omitted(api, world):
    r = await api(world["admin"]).post("/organizations", json={"name": "Northwind Trading"})
    assert r.status_code == 200, r.text
    assert r.json()["slug"].startswith("northwind-trading")


async def test_inviting_works_when_email_is_not_configured(api, world):
    """Mail is best-effort. With RESEND_API_KEY unset the invitation must still
    be created - the admin copies the link instead."""
    r = await api(world["admin"]).post("/invitations", json={
        "organization_id": world["org_a"].id, "email": f"nomail-{uuid.uuid4().hex[:6]}@acme.com",
    })
    assert r.status_code == 201, r.text
    assert r.json()["email_sent"] is False
    assert r.json()["token"]


async def test_invite_still_created_when_sending_raises(api, world, monkeypatch):
    """A Resend outage must not stop you onboarding a client."""
    import app.services.email as email_svc

    async def boom(**kwargs):
        raise RuntimeError("resend is down")

    monkeypatch.setattr(email_svc, "send_invitation_email", boom)
    import app.api.v1.invitations as inv_router
    monkeypatch.setattr(inv_router, "send_invitation_email", boom)

    r = await api(world["admin"]).post("/invitations", json={
        "organization_id": world["org_a"].id, "email": f"boom-{uuid.uuid4().hex[:6]}@acme.com",
    })
    assert r.status_code == 201, r.text
