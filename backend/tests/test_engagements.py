"""The first-contact sequence: agreement → invoice → welcome → kickoff call.

The order is the product. These tests pin down that each step refuses to run
before the one it depends on, that a signature is bound to the exact text
signed, and that none of it leaks across tenants.
"""
import pytest

pytestmark = pytest.mark.asyncio

READY = {
    "scope": "Build and launch a lead-scoring pipeline.",
    "deliverables": [{"title": "Scoring model", "detail": "Trained on your CRM history"}],
    "timeline": [{"phase": "Discovery", "duration": "Week 1"}],
    "revision_policy": "Two rounds per deliverable.",
    "line_items": [{"description": "Deposit", "quantity": 1, "unit_amount": 250000}],
    "stripe_payment_url": "https://buy.stripe.com/test_abc",
    "bank_details": "IBAN XX00 0000",
}

SIGN = {"signer_name": "Acme Owner", "signer_title": "CEO", "consent": True}


async def _draft(api, world, **fields):
    r = await api(world["admin"]).post(
        "/engagements", json={"project_id": world["proj_a"].id, **READY, **fields}
    )
    assert r.status_code == 201, r.text
    return r.json()


async def _sent(api, world):
    e = await _draft(api, world)
    r = await api(world["admin"]).post(f"/engagements/{e['id']}/send")
    assert r.status_code == 200, r.text
    return r.json()


async def _signed(api, world):
    e = await _sent(api, world)
    r = await api(world["client_a"]).post(
        f"/engagements/{e['id']}/sign", json={**SIGN, "agreement_hash": e["agreement_hash"]}
    )
    assert r.status_code == 200, r.text
    return r.json()


async def _paid(api, world):
    e = await _signed(api, world)
    r = await api(world["client_a"]).post(
        f"/engagements/{e['id']}/report-payment", json={"method": "bank", "reference": "TX-1"}
    )
    assert r.status_code == 200, r.text
    return r.json()


# ── Authoring ────────────────────────────────────────────────────────────────

async def test_only_admins_author(api, world):
    r = await api(world["client_a"]).post(
        "/engagements", json={"project_id": world["proj_a"].id}
    )
    assert r.status_code == 403


async def test_one_per_project(api, world):
    await _draft(api, world)
    r = await api(world["admin"]).post("/engagements", json={"project_id": world["proj_a"].id})
    assert r.status_code == 409


async def test_invoice_number_is_assigned(api, world):
    e = await _draft(api, world)
    assert e["invoice_number"].startswith("EC-")
    assert e["invoice_total"] == 250000
    assert e["stage"] == "draft"


async def test_payment_links_must_be_https(api, world):
    for bad in ("http://buy.stripe.com/x", "javascript:alert(1)"):
        r = await api(world["admin"]).post("/engagements", json={
            "project_id": world["proj_a"].id, "stripe_payment_url": bad,
        })
        assert r.status_code == 422, bad


async def test_cannot_send_without_the_essentials(api, world):
    r = await api(world["admin"]).post(
        "/engagements", json={"project_id": world["proj_a"].id, "scope": "Something"}
    )
    e = r.json()
    r = await api(world["admin"]).post(f"/engagements/{e['id']}/send")
    assert r.status_code == 422
    for part in ("deliverables", "timeline", "revision policy", "invoice"):
        assert part in r.json()["detail"]


async def test_defaults_carry_forward_reusable_terms(api, world):
    await _draft(api, world, bank_details="My bank", revision_policy="Three rounds.")
    d = (await api(world["admin"]).get("/engagements/defaults")).json()
    assert d["bank_details"] == "My bank"
    assert d["revision_policy"] == "Three rounds."
    # Priced per invoice, so never carried forward.
    assert "stripe_payment_url" not in d


# ── Visibility ───────────────────────────────────────────────────────────────

async def test_client_cannot_see_a_draft(api, world):
    e = await _draft(api, world)
    assert (await api(world["client_a"]).get(f"/engagements/{e['id']}")).status_code == 404
    assert (await api(world["client_a"]).get("/engagements")).json() == []


async def test_other_tenant_cannot_see_or_sign(api, world):
    e = await _sent(api, world)
    other = api(world["client_b"])
    assert (await other.get(f"/engagements/{e['id']}")).status_code == 404
    assert (await other.get("/engagements")).json() == []
    r = await other.post(
        f"/engagements/{e['id']}/sign", json={**SIGN, "agreement_hash": e["agreement_hash"]}
    )
    assert r.status_code == 404


async def test_sent_agreement_is_visible_to_the_client(api, world):
    e = await _sent(api, world)
    listed = (await api(world["member_a"]).get("/engagements")).json()
    assert [x["id"] for x in listed] == [e["id"]]
    assert listed[0]["stage"] == "awaiting_signature"
    assert listed[0]["project_name"] == "Acme Automation"


# ── Signing ──────────────────────────────────────────────────────────────────

async def test_signing_records_the_evidence(api, world):
    e = await _signed(api, world)
    assert e["stage"] == "awaiting_payment"
    assert e["signer_name"] == "Acme Owner"
    assert e["signer_email"] == world["client_a"].email
    assert e["signed_at"]


async def test_signing_needs_consent(api, world):
    e = await _sent(api, world)
    r = await api(world["client_a"]).post(
        f"/engagements/{e['id']}/sign",
        json={**SIGN, "consent": False, "agreement_hash": e["agreement_hash"]},
    )
    assert r.status_code == 422


async def test_signature_is_bound_to_the_text_on_screen(api, world):
    e = await _sent(api, world)
    r = await api(world["client_a"]).post(
        f"/engagements/{e['id']}/sign", json={**SIGN, "agreement_hash": "0" * 64}
    )
    assert r.status_code == 409


async def test_admin_cannot_sign_for_the_client(api, world):
    e = await _sent(api, world)
    r = await api(world["admin"]).post(
        f"/engagements/{e['id']}/sign", json={**SIGN, "agreement_hash": e["agreement_hash"]}
    )
    assert r.status_code == 403


async def test_sent_agreement_is_frozen_but_recallable(api, world):
    e = await _sent(api, world)
    admin = api(world["admin"])
    r = await admin.patch(f"/engagements/{e['id']}", json={"scope": "Changed"})
    assert r.status_code == 409

    # Resaving the same text is not an edit - the admin form saves everything.
    r = await admin.patch(f"/engagements/{e['id']}", json={
        "scope": READY["scope"], "welcome_message": "Hello!",
    })
    assert r.status_code == 200, r.text

    assert (await admin.post(f"/engagements/{e['id']}/recall")).json()["stage"] == "draft"
    r = await admin.patch(f"/engagements/{e['id']}", json={"scope": "Changed"})
    assert r.status_code == 200
    # The old hash no longer signs anything.
    resent = (await admin.post(f"/engagements/{e['id']}/send")).json()
    assert resent["agreement_hash"] != e["agreement_hash"]


async def test_signed_agreement_cannot_be_recalled_or_deleted(api, world):
    e = await _signed(api, world)
    admin = api(world["admin"])
    assert (await admin.post(f"/engagements/{e['id']}/recall")).status_code == 409
    assert (await admin.delete(f"/engagements/{e['id']}")).status_code == 409


# ── Order ────────────────────────────────────────────────────────────────────

async def test_nothing_moves_before_signing(api, world):
    e = await _sent(api, world)
    client = api(world["client_a"])
    assert (await client.post(
        f"/engagements/{e['id']}/report-payment", json={"method": "bank"}
    )).status_code == 409
    assert (await client.post(f"/engagements/{e['id']}/welcome-read")).status_code == 409
    assert (await client.post(
        f"/engagements/{e['id']}/schedule-call", json={"scheduled_for": "2026-10-01T15:00:00Z"}
    )).status_code == 409
    assert (await api(world["admin"]).post(
        f"/engagements/{e['id']}/confirm-payment"
    )).status_code == 409


async def test_reporting_payment_opens_kickoff_and_freezes_invoice(api, world):
    e = await _paid(api, world)
    assert e["stage"] == "kickoff"
    assert e["payment_method"] == "bank"
    assert e["payment_reference"] == "TX-1"
    assert e["paid_at"] is None  # reported, not yet confirmed

    r = await api(world["admin"]).patch(
        f"/engagements/{e['id']}", json={"line_items": [
            {"description": "More", "quantity": 1, "unit_amount": 1}
        ]},
    )
    assert r.status_code == 409


async def test_full_sequence_completes(api, world):
    e = await _paid(api, world)
    client = api(world["client_a"])
    await client.post(f"/engagements/{e['id']}/welcome-read")
    r = await client.post(f"/engagements/{e['id']}/schedule-call", json={
        "scheduled_for": "2026-10-01T15:00:00+02:00", "prep_notes": "Bring brand guide",
    })
    assert r.status_code == 200, r.text
    done = r.json()
    assert done["stage"] == "complete"
    # Stored as UTC.
    assert done["call_scheduled_for"].startswith("2026-10-01T13:00")

    r = await api(world["admin"]).post(f"/engagements/{e['id']}/confirm-payment")
    assert r.json()["paid_at"]
    r = await api(world["admin"]).post(f"/engagements/{e['id']}/complete-call")
    assert r.json()["call_completed_at"]


async def test_admins_hear_about_each_client_step(api, world):
    await _paid(api, world)
    notes = (await api(world["admin"]).get("/notifications")).json()
    titles = " | ".join(n["title"] for n in notes)
    assert "signed the agreement" in titles
    assert "reported a payment" in titles


async def test_signer_cannot_choose_their_own_ip(api, world):
    """X-Forwarded-For's first entry is client-supplied; it must not be trusted."""
    e = await _sent(api, world)
    r = await api(world["client_a"]).post(
        f"/engagements/{e['id']}/sign",
        json={**SIGN, "agreement_hash": e["agreement_hash"]},
        headers={"X-Forwarded-For": "6.6.6.6, 10.0.0.7"},
    )
    assert r.json()["signer_ip"] == "10.0.0.7"
