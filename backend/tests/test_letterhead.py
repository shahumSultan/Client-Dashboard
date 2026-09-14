"""The company letterhead, and what pinning one does to a signature."""
import io
import uuid

import pytest
import pytest_asyncio
from fpdf import FPDF
from PIL import Image
from sqlalchemy import delete

from app.models.branding import CompanyLetterhead
from app.models.user import User, UserRole
from app.services.branding import MAX_LETTERHEAD_BYTES

pytestmark = pytest.mark.asyncio

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"

# Enough to pass missing_for_send in form mode.
FORM = {
    "scope": "Build the thing",
    "deliverables": [{"title": "Design system"}],
    "timeline": [{"phase": "Discovery", "duration": "2 weeks"}],
    "revision_policy": "Two rounds per deliverable.",
    "line_items": [{"description": "Deposit", "quantity": 1, "unit_amount": 100000}],
    "bank_details": "IBAN XX00",
}


def make_png(w: int = 1414, h: int = 2000, color=(169, 46, 46)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (w, h), color).save(buf, format="PNG")
    return buf.getvalue()


def make_pdf() -> bytes:
    pdf = FPDF()
    pdf.set_font("Helvetica", size=12)
    pdf.add_page()
    pdf.cell(0, 10, "Master Services Agreement")
    return bytes(pdf.output())


@pytest_asyncio.fixture(autouse=True)
async def _no_letterhead(session):
    """Start every test with no letterhead configured.

    The table is company-wide and has no tenant column, and the test database
    outlives a single test - so without this, one test's upload silently
    becomes the next test's "current" letterhead.
    """
    await session.execute(delete(CompanyLetterhead))
    await session.commit()


@pytest_asyncio.fixture
async def staff(session):
    u = User(clerk_id=f"c_{uuid.uuid4().hex}", email=f"new-{uuid.uuid4().hex[:6]}@ec.com",
             full_name="New Hire", role=UserRole.STAFF)
    session.add(u)
    await session.commit()
    return u


async def _put(api, world, data=None, name="letterhead.png", user=None):
    return await api(user or world["admin"]).put(
        "/branding/letterhead",
        files={"file": (name, data if data is not None else make_png(), "image/png")},
    )


async def _draft(api, world, **extra):
    r = await api(world["admin"]).post(
        "/engagements", json={"project_id": world["proj_a"].id, **FORM, **extra}
    )
    return r.json()


async def _sign(api, world, e):
    return await api(world["client_a"]).post(f"/engagements/{e['id']}/sign", json={
        "signer_name": "Acme Owner", "consent": True, "agreement_hash": e["agreement_hash"],
    })


# ── Uploading ────────────────────────────────────────────────────────────────

async def test_upload_returns_metadata_and_never_the_bytes(api, world):
    r = await _put(api, world)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["content_type"] == "image/png"
    assert (body["width_px"], body["height_px"]) == (1414, 2000)
    assert len(body["sha256"]) == 64
    assert "data" not in body


@pytest.mark.parametrize("data,why", [
    # Explicit ids: the payloads are megabytes of bytes, and pytest would
    # otherwise render each one in full as the test's name.
    pytest.param(b"hello, not an image", "isn't a PNG or JPEG", id="not-an-image"),
    pytest.param(PNG_MAGIC + b"garbage that will not decode", "couldn't be read", id="corrupt"),
    pytest.param(b"x" * (MAX_LETTERHEAD_BYTES + 1), "larger than 4 MB", id="too-big"),
    pytest.param(make_png(1200, 1200), "isn't A4 shaped", id="square"),
    pytest.param(make_png(400, 566), "at least 1000px wide", id="too-narrow"),
])
async def test_rejects_files_that_are_not_a4_stationery(api, world, data, why):
    r = await _put(api, world, data=data)
    assert r.status_code == 422, r.text
    assert why in r.json()["detail"]


async def test_only_admins_upload(api, world):
    assert (await _put(api, world, user=world["client_a"])).status_code == 403


async def test_staff_may_read_it_but_never_change_it(api, world, staff):
    await _put(api, world)
    assert (await api(staff).get("/branding/letterhead")).status_code == 200
    assert (await _put(api, world, user=staff)).status_code == 403
    assert (await api(staff).delete("/branding/letterhead")).status_code == 403


async def test_re_uploading_identical_bytes_is_a_no_op(api, world):
    first = (await _put(api, world)).json()
    again = (await _put(api, world)).json()
    assert again["sha256"] == first["sha256"]


# ── Serving ──────────────────────────────────────────────────────────────────

async def test_any_signed_in_user_can_fetch_the_image(api, world):
    """Clients open the print view, so this cannot be admin-only."""
    up = (await _put(api, world)).json()
    r = await api(world["client_a"]).get(f"/branding/letterhead/{up['sha256']}/image")
    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == "image/png"
    # Content-addressed, so unlike the contract PDFs this one is cacheable.
    assert "immutable" in r.headers["cache-control"]
    assert r.content.startswith(PNG_MAGIC)


async def test_unknown_hash_is_not_found(api, world):
    r = await api(world["admin"]).get(f"/branding/letterhead/{'0' * 64}/image")
    assert r.status_code == 404


async def test_replacing_retires_the_old_one_but_keeps_it_readable(api, world):
    first = (await _put(api, world)).json()
    second = (await _put(api, world, data=make_png(color=(10, 20, 30)))).json()
    assert first["sha256"] != second["sha256"]

    current = (await api(world["admin"]).get("/branding/letterhead")).json()
    assert current["sha256"] == second["sha256"]
    # The retired one still resolves - signed agreements point at it by hash.
    r = await api(world["admin"]).get(f"/branding/letterhead/{first['sha256']}/image")
    assert r.status_code == 200


async def test_removing_stops_use_without_destroying_the_bytes(api, world):
    up = (await _put(api, world)).json()
    assert (await api(world["admin"]).delete("/branding/letterhead")).status_code == 204
    assert (await api(world["admin"]).get("/branding/letterhead")).json() is None
    r = await api(world["admin"]).get(f"/branding/letterhead/{up['sha256']}/image")
    assert r.status_code == 200


# ── Pinning and the signature ────────────────────────────────────────────────

async def test_sending_pins_the_letterhead_in_force(api, world):
    up = (await _put(api, world)).json()
    e = await _draft(api, world)
    sent = (await api(world["admin"]).post(f"/engagements/{e['id']}/send")).json()
    assert sent["letterhead_sha256"] == up["sha256"]


async def test_the_letterhead_is_part_of_the_fingerprint(api, world):
    e = await _draft(api, world)
    plain = (await api(world["admin"]).post(f"/engagements/{e['id']}/send")).json()
    assert plain["letterhead_sha256"] is None

    await api(world["admin"]).post(f"/engagements/{e['id']}/recall")
    await _put(api, world)
    branded = (await api(world["admin"]).post(f"/engagements/{e['id']}/send")).json()

    assert branded["letterhead_sha256"] is not None
    assert branded["agreement_hash"] != plain["agreement_hash"]


async def test_replacing_the_letterhead_never_breaks_a_pending_signature(api, world):
    """The one that matters.

    The hash is recomputed from live state at signing. If it took whatever
    letterhead were current rather than the pinned one, swapping stationery
    would 409 every agreement already out for signature.
    """
    await _put(api, world)
    e = await _draft(api, world)
    sent = (await api(world["admin"]).post(f"/engagements/{e['id']}/send")).json()

    await _put(api, world, data=make_png(color=(9, 9, 9)))

    after = (await api(world["admin"]).get(f"/engagements/{e['id']}")).json()
    assert after["agreement_hash"] == sent["agreement_hash"]
    assert after["letterhead_sha256"] == sent["letterhead_sha256"]
    assert (await _sign(api, world, sent)).status_code == 200


async def test_an_agreement_sent_before_letterheads_existed_still_signs(api, world):
    """NULL must be omitted from the payload, not hashed as None."""
    e = await _draft(api, world)
    sent = (await api(world["admin"]).post(f"/engagements/{e['id']}/send")).json()
    assert sent["letterhead_sha256"] is None
    assert (await _sign(api, world, sent)).status_code == 200


async def test_recall_unpins_so_a_resend_picks_up_the_current_one(api, world):
    await _put(api, world)
    e = await _draft(api, world)
    await api(world["admin"]).post(f"/engagements/{e['id']}/send")
    recalled = (await api(world["admin"]).post(f"/engagements/{e['id']}/recall")).json()
    assert recalled["letterhead_sha256"] is None


async def test_uploaded_pdf_agreements_are_never_pinned(api, world):
    """Their own letterhead is already on them; ours is not printed behind it."""
    await _put(api, world)
    e = await _draft(api, world)
    await api(world["admin"]).put(
        f"/engagements/{e['id']}/document",
        files={"file": ("msa.pdf", make_pdf(), "application/pdf")},
    )
    sent = (await api(world["admin"]).post(f"/engagements/{e['id']}/send")).json()
    assert sent["agreement_source"] == "pdf"
    assert sent["letterhead_sha256"] is None
    assert (await _sign(api, world, sent)).status_code == 200
