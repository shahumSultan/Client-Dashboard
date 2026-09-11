"""Signing the admin's own PDF instead of a form-built agreement."""
import io

import pytest
from fpdf import FPDF
from pypdf import PdfReader

pytestmark = pytest.mark.asyncio

INVOICE = {
    "line_items": [{"description": "Deposit", "quantity": 1, "unit_amount": 100000}],
    "bank_details": "IBAN XX00",
}


def make_pdf(text: str = "Master Services Agreement", pages: int = 2) -> bytes:
    pdf = FPDF()
    pdf.set_font("Helvetica", size=12)
    for i in range(pages):
        pdf.add_page()
        pdf.cell(0, 10, f"{text} - page {i + 1}")
    return bytes(pdf.output())


async def _draft(api, world):
    r = await api(world["admin"]).post(
        "/engagements", json={"project_id": world["proj_a"].id, **INVOICE}
    )
    return r.json()


async def _upload(api, world, e, data=None, name="MSA Acme.pdf"):
    return await api(world["admin"]).put(
        f"/engagements/{e['id']}/document",
        files={"file": (name, data if data is not None else make_pdf(), "application/pdf")},
    )


async def _sign(api, world, e):
    return await api(world["client_a"]).post(f"/engagements/{e['id']}/sign", json={
        "signer_name": "Acme Owner", "consent": True, "agreement_hash": e["agreement_hash"],
    })


async def test_uploaded_pdf_becomes_the_agreement(api, world):
    e = await _draft(api, world)
    r = await _upload(api, world, e)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["agreement_source"] == "pdf"
    assert body["document"]["filename"] == "MSA Acme.pdf"
    assert body["document"]["page_count"] == 2

    # No scope/deliverables/timeline needed — the PDF carries them.
    sent = await api(world["admin"]).post(f"/engagements/{e['id']}/send")
    assert sent.status_code == 200, sent.text


async def test_pdf_mode_without_a_file_cannot_be_sent(api, world):
    e = await _draft(api, world)
    await api(world["admin"]).patch(f"/engagements/{e['id']}", json={"agreement_source": "pdf"})
    r = await api(world["admin"]).post(f"/engagements/{e['id']}/send")
    assert r.status_code == 422
    assert "PDF" in r.json()["detail"]


@pytest.mark.parametrize("data,why", [
    (b"hello, not a pdf", "isn't a PDF"),
    (b"%PDF-1.7\ngarbage that will not parse", "couldn't be read"),
])
async def test_rejects_files_that_are_not_usable_pdfs(api, world, data, why):
    e = await _draft(api, world)
    r = await _upload(api, world, e, data=data)
    assert r.status_code == 422
    assert why in r.json()["detail"]


async def test_only_admins_upload(api, world):
    e = await _draft(api, world)
    r = await api(world["client_a"]).put(
        f"/engagements/{e['id']}/document",
        files={"file": ("x.pdf", make_pdf(), "application/pdf")},
    )
    assert r.status_code == 403


async def test_client_sees_the_file_only_once_sent_and_only_their_own(api, world):
    e = await _draft(api, world)
    await _upload(api, world, e)
    client = api(world["client_a"])
    assert (await client.get(f"/engagements/{e['id']}/document")).status_code == 404

    await api(world["admin"]).post(f"/engagements/{e['id']}/send")
    r = await client.get(f"/engagements/{e['id']}/document")
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert "no-store" in r.headers["cache-control"]
    assert r.content.startswith(b"%PDF-")

    assert (await api(world["client_b"]).get(f"/engagements/{e['id']}/document")).status_code == 404


async def test_document_is_frozen_once_sent(api, world):
    e = await _draft(api, world)
    await _upload(api, world, e)
    await api(world["admin"]).post(f"/engagements/{e['id']}/send")
    assert (await _upload(api, world, e, data=make_pdf("Other"))).status_code == 409
    assert (await api(world["admin"]).delete(f"/engagements/{e['id']}/document")).status_code == 409
    r = await api(world["admin"]).patch(f"/engagements/{e['id']}", json={"agreement_source": "form"})
    assert r.status_code == 409


async def test_swapping_the_file_invalidates_the_old_signature(api, world):
    admin = api(world["admin"])
    e = await _draft(api, world)
    await _upload(api, world, e)
    first = (await admin.post(f"/engagements/{e['id']}/send")).json()

    await admin.post(f"/engagements/{e['id']}/recall")
    await _upload(api, world, e, data=make_pdf("Revised terms"))
    second = (await admin.post(f"/engagements/{e['id']}/send")).json()
    assert second["agreement_hash"] != first["agreement_hash"]

    assert (await _sign(api, world, first)).status_code == 409
    assert (await _sign(api, world, second)).status_code == 200


async def test_signed_copy_is_the_original_plus_a_certificate(api, world):
    e = await _draft(api, world)
    await _upload(api, world, e)
    e = (await api(world["admin"]).post(f"/engagements/{e['id']}/send")).json()
    client = api(world["client_a"])
    assert (await client.get(f"/engagements/{e['id']}/document/signed")).status_code == 409

    await _sign(api, world, e)
    r = await client.get(f"/engagements/{e['id']}/document/signed")
    assert r.status_code == 200, r.text
    reader = PdfReader(io.BytesIO(r.content))
    assert len(reader.pages) == 3
    assert "page 1" in reader.pages[0].extract_text()
    cert = reader.pages[-1].extract_text()
    assert "SIGNATURE CERTIFICATE" in cert
    assert "Acme Owner" in cert
    assert e["document"]["sha256"] in cert.replace("\n", "")
