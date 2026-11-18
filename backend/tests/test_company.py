"""Company management: who can see it, and what the file routes will accept."""
import uuid

import pytest
import pytest_asyncio
from sqlalchemy import delete

from app.models.company import (
    CompanyBankAccount, CompanyDocument, CompanyProfile, TeamMember,
)
from app.models.user import User, UserRole
from app.services import storage
from app.services.company_files import MAX_COMPANY_FILE_BYTES

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture(autouse=True)
async def clean(session):
    """The test database is shared across the session; company rows are global."""
    for model in (CompanyDocument, CompanyBankAccount, TeamMember, CompanyProfile):
        await session.execute(delete(model))
    await session.commit()


@pytest_asyncio.fixture
async def staff(session):
    u = User(clerk_id=f"c_{uuid.uuid4().hex}", email=f"s-{uuid.uuid4().hex[:6]}@ec.com",
             full_name="Staff", role=UserRole.STAFF)
    session.add(u)
    await session.commit()
    return u


@pytest.fixture
def bucket(monkeypatch):
    """An in-memory stand-in for object storage: key -> size."""
    objects: dict[str, int] = {}
    deleted: list[str] = []

    async def presign_put(key, content_type, expires=3600):
        return f"https://bucket.test/{key}?put"

    async def presign_get(key, filename, content_type, inline=True, expires=300):
        return f"https://bucket.test/{key}?get&inline={inline}"

    async def size(key):
        return objects.get(key)

    async def remove(key):
        deleted.append(key)
        objects.pop(key, None)

    monkeypatch.setattr(storage, "generate_presigned_upload", presign_put)
    monkeypatch.setattr(storage, "generate_presigned_download", presign_get)
    monkeypatch.setattr(storage, "object_size", size)
    monkeypatch.setattr(storage, "delete_file_from_storage", remove)
    return {"objects": objects, "deleted": deleted}


async def _upload(client, bucket, name="Policy.pdf", size=1024):
    r = await client.post("/company/uploads", json={"filename": name, "size_bytes": size})
    assert r.status_code == 200, r.text
    ticket = r.json()
    bucket["objects"][ticket["storage_key"]] = size
    return ticket


# ── access ───────────────────────────────────────────────────────────────────

READS = ["/company/profile", "/company/bank-accounts", "/company/team", "/company/documents"]


async def test_clients_cannot_see_company_records(api, world):
    for who in ("client_a", "member_a"):
        client = api(world[who])
        for path in READS:
            r = await client.get(path)
            assert r.status_code == 403, f"{who} {path} -> {r.status_code}"


async def test_staff_can_read_but_not_write(api, staff):
    client = api(staff)
    for path in READS:
        assert (await client.get(path)).status_code == 200, path
    r = await client.put("/company/profile", json={"legal_name": "Nope"})
    assert r.status_code == 403
    r = await client.post("/company/uploads", json={"filename": "a.pdf", "size_bytes": 10})
    assert r.status_code == 403


# ── profile ──────────────────────────────────────────────────────────────────

async def test_profile_is_a_single_row_and_blank_clears(api, world):
    admin = api(world["admin"])
    assert (await admin.get("/company/profile")).json()["legal_name"] is None

    r = await admin.put("/company/profile", json={"legal_name": "Enigma-Cube (Pvt) Ltd", "phone": "123"})
    assert r.status_code == 200
    r = await admin.put("/company/profile", json={"legal_name": "Enigma-Cube (Pvt) Ltd", "phone": "  "})
    body = (await admin.get("/company/profile")).json()
    assert body["legal_name"] == "Enigma-Cube (Pvt) Ltd"
    assert body["phone"] is None


# ── bank accounts ────────────────────────────────────────────────────────────

ACCOUNT = {"label": "Main", "bank_name": "Meezan Bank", "account_name": "Enigma-Cube",
           "iban": "PK00MEZN0000000000000000"}


async def test_one_default_bank_account(api, world):
    admin = api(world["admin"])
    first = (await admin.post("/company/bank-accounts", json=ACCOUNT)).json()
    assert first["is_default"] is True  # the first account is the default

    second = (await admin.post("/company/bank-accounts",
                               json=ACCOUNT | {"label": "USD", "is_default": True})).json()
    rows = (await admin.get("/company/bank-accounts")).json()
    defaults = [a["id"] for a in rows if a["is_default"]]
    assert defaults == [second["id"]]

    r = await admin.put(f"/company/bank-accounts/{first['id']}", json=ACCOUNT | {"is_default": True})
    assert r.status_code == 200
    rows = (await admin.get("/company/bank-accounts")).json()
    assert [a["id"] for a in rows if a["is_default"]] == [first["id"]]


async def test_new_engagement_prefills_default_bank_details(api, world, session):
    admin = api(world["admin"])
    await admin.post("/company/bank-accounts", json=ACCOUNT)
    r = await admin.post("/engagements", json={"project_id": world["proj_b"].id})
    assert r.status_code == 201, r.text
    details = r.json()["bank_details"]
    assert "Meezan Bank" in details and "PK00MEZN" in details


# ── documents ────────────────────────────────────────────────────────────────

async def test_upload_rejects_wrong_type_and_size(api, world, bucket):
    admin = api(world["admin"])
    r = await admin.post("/company/uploads", json={"filename": "run.exe", "size_bytes": 10})
    assert r.status_code == 415
    r = await admin.post("/company/uploads",
                         json={"filename": "big.pdf", "size_bytes": MAX_COMPANY_FILE_BYTES + 1})
    assert r.status_code == 413
    ticket = await _upload(admin, bucket, "Brand Guide.DOCX")
    assert ticket["storage_key"].startswith("company/")
    assert ticket["content_type"].endswith("wordprocessingml.document")


async def test_confirm_only_accepts_our_own_keys(api, world, bucket):
    admin = api(world["admin"])
    bucket["objects"]["projects/p1/abc/contract.pdf"] = 100
    r = await admin.post("/company/documents", json={
        "storage_key": "projects/p1/abc/contract.pdf", "original_name": "contract.pdf",
        "title": "Not ours",
    })
    assert r.status_code == 422


async def test_confirm_checks_what_actually_landed(api, world, bucket):
    admin = api(world["admin"])
    ticket = await _upload(admin, bucket)
    bucket["objects"].pop(ticket["storage_key"])  # the PUT never finished
    r = await admin.post("/company/documents", json={
        "storage_key": ticket["storage_key"], "original_name": "Policy.pdf", "title": "Policy",
    })
    assert r.status_code == 422

    ticket = await _upload(admin, bucket)
    bucket["objects"][ticket["storage_key"]] = MAX_COMPANY_FILE_BYTES + 5  # lied about size
    r = await admin.post("/company/documents", json={
        "storage_key": ticket["storage_key"], "original_name": "Policy.pdf", "title": "Policy",
    })
    assert r.status_code == 413
    assert ticket["storage_key"] in bucket["deleted"]


async def test_document_lifecycle(api, world, bucket, staff):
    admin = api(world["admin"])
    t1 = await _upload(admin, bucket, size=2048)
    r = await admin.post("/company/documents", json={
        "storage_key": t1["storage_key"], "original_name": "Policy.pdf", "title": "  Leave policy ",
        "category": "hr", "tags": ["policy", " "], "expires_on": "2027-01-31",
    })
    assert r.status_code == 201, r.text
    doc = r.json()
    assert doc["title"] == "Leave policy" and doc["version"] == 1 and doc["size_bytes"] == 2048
    assert doc["tags"] == ["policy"] and doc["uploader_name"] == "EC Admin"

    # Replace the file: a new version, history kept.
    t2 = await _upload(admin, bucket, "Policy v2.pdf", size=4096)
    r = await admin.post(f"/company/documents/{doc['id']}/versions", json={
        "storage_key": t2["storage_key"], "original_name": "Policy v2.pdf",
    })
    assert r.status_code == 200 and r.json()["version"] == 2
    versions = (await admin.get(f"/company/documents/{doc['id']}/versions")).json()
    assert [v["version"] for v in versions] == [2, 1]

    # Staff can open it; downloads are short-lived signed links.
    link = (await api(staff).get(f"/company/documents/{doc['id']}/download")).json()
    assert t2["storage_key"] in link["url"] and link["expires_in"] == 300
    old = (await admin.get(f"/company/documents/{doc['id']}/download?version=1")).json()
    assert t1["storage_key"] in old["url"]

    # Filters and search.
    assert len((await admin.get("/company/documents?category=hr")).json()) == 1
    assert len((await admin.get("/company/documents?category=legal")).json()) == 0
    assert len((await admin.get("/company/documents?q=leave")).json()) == 1

    # Archive hides it from the default list.
    await admin.patch(f"/company/documents/{doc['id']}", json={"is_archived": True})
    assert (await admin.get("/company/documents")).json() == []
    assert len((await admin.get("/company/documents?archived=true")).json()) == 1

    # Delete removes every version's object.
    assert (await admin.delete(f"/company/documents/{doc['id']}")).status_code == 204
    assert {t1["storage_key"], t2["storage_key"]} <= set(bucket["deleted"])
    assert (await admin.get(f"/company/documents/{doc['id']}/versions")).status_code == 404


async def test_svg_is_never_served_inline(api, world, bucket):
    admin = api(world["admin"])
    t = await _upload(admin, bucket, "logo.svg")
    doc = (await admin.post("/company/documents", json={
        "storage_key": t["storage_key"], "original_name": "logo.svg", "title": "Logo",
    })).json()
    link = (await admin.get(f"/company/documents/{doc['id']}/download")).json()
    assert "inline=False" in link["url"]
