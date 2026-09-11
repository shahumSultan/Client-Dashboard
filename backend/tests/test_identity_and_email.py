"""Account linking when a Clerk identity changes, and who gets which email."""
import uuid

import pytest
from sqlalchemy import select

from app.config import settings
from app.core import auth as auth_module
from app.models.user import User, UserRole
from app.services import email as email_service

pytestmark = pytest.mark.asyncio


def _profile(email: str, verified: bool) -> dict:
    return {
        "id": "x",
        "primary_email_address_id": "e1",
        "email_addresses": [{
            "id": "e1", "email_address": email,
            "verification": {"status": "verified" if verified else "unverified"},
        }],
        "first_name": "Re", "last_name": "Created",
    }


@pytest.fixture
def clerk_profile(monkeypatch):
    """Make the Clerk Backend API return a chosen profile for any user."""
    holder: dict = {}

    async def _fetch(clerk_id: str):
        return holder.get("profile")

    monkeypatch.setattr(auth_module, "fetch_clerk_user", _fetch)
    return holder


async def _admin(session, email):
    u = User(clerk_id=f"c_old_{uuid.uuid4().hex}", email=email, full_name="Owner",
             role=UserRole.ADMIN)
    session.add(u)
    await session.commit()
    return u


# ── Recreated Clerk identity ─────────────────────────────────────────────────

async def test_recreated_clerk_user_is_relinked_to_their_account(api, session, clerk_profile):
    email = f"owner-{uuid.uuid4().hex[:6]}@example.com"
    old = await _admin(session, email)
    clerk_profile["profile"] = _profile(email, verified=True)

    newcomer = User(clerk_id=f"c_new_{uuid.uuid4().hex}", email=email)  # identity only
    r = await api(newcomer).get("/users/me")
    assert r.status_code == 200, r.text
    assert r.json()["id"] == old.id
    assert r.json()["role"] == "admin"

    rows = (await session.execute(select(User).where(User.email == email))).scalars().all()
    assert len(rows) == 1


async def test_unverified_email_cannot_take_over_an_account(api, session, clerk_profile):
    email = f"victim-{uuid.uuid4().hex[:6]}@example.com"
    victim = await _admin(session, email)
    clerk_profile["profile"] = _profile(email, verified=False)

    attacker = User(clerk_id=f"c_evil_{uuid.uuid4().hex}", email=email)
    r = await api(attacker).get("/users/me")
    assert r.status_code == 409  # a clear refusal, not a 500

    await session.refresh(victim)
    assert victim.clerk_id.startswith("c_old_")


async def test_simultaneous_first_requests_do_not_500(api, clerk_profile):
    import asyncio
    email = f"fresh-{uuid.uuid4().hex[:6]}@example.com"
    clerk_profile["profile"] = _profile(email, verified=True)
    newcomer = User(clerk_id=f"c_{uuid.uuid4().hex}", email=email)
    client = api(newcomer)
    results = await asyncio.gather(*[client.get("/users/me") for _ in range(4)])
    assert [r.status_code for r in results] == [200] * 4
    assert len({r.json()["id"] for r in results}) == 1


# ── Email routing ────────────────────────────────────────────────────────────

@pytest.fixture
def outbox(monkeypatch):
    sent: list[dict] = []
    monkeypatch.setattr(settings, "RESEND_API_KEY", "re_test", raising=False)
    monkeypatch.setattr(email_service, "_send", lambda payload: sent.append(payload))
    return sent


READY = {
    "scope": "S", "deliverables": [{"title": "D"}], "timeline": [{"phase": "P"}],
    "revision_policy": "R", "bank_details": "B",
    "line_items": [{"description": "L", "quantity": 1, "unit_amount": 100}],
}


async def _signed_by(api, world, signer):
    admin = api(world["admin"])
    e = (await admin.post("/engagements", json={"project_id": world["proj_a"].id, **READY})).json()
    e = (await admin.post(f"/engagements/{e['id']}/send")).json()
    r = await api(signer).post(f"/engagements/{e['id']}/sign", json={
        "signer_name": "Someone", "consent": True, "agreement_hash": e["agreement_hash"],
    })
    assert r.status_code == 200, r.text


async def test_client_activity_alerts_the_business_inbox_only(api, world, outbox):
    await _signed_by(api, world, world["client_a"])
    alerts = [m for m in outbox if "signed the agreement" in m["subject"]]
    assert [m["to"] for m in alerts] == [[settings.ADMIN_NOTIFICATION_EMAIL]]
    # Not every admin's personal address.
    assert all(world["admin"].email not in m["to"] for m in outbox)


async def test_test_accounts_never_trigger_or_receive_mail(api, world, session, outbox):
    tester = User(clerk_id=f"c_{uuid.uuid4().hex}", email=f"qa+clerk_test@{uuid.uuid4().hex[:6]}.dev",
                  role=UserRole.CLIENT_OWNER, organization_id=world["org_a"].id)
    session.add(tester)
    await session.commit()

    await _signed_by(api, world, tester)
    assert not any("signed the agreement" in m["subject"] for m in outbox)
    assert all("+clerk_test" not in a for m in outbox for a in m["to"])
