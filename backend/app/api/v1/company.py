"""Company management: Enigma-Cube's own profile, bank accounts, team and files.

Every route depends on `require_admin`: admins read and write, staff read only
(writes are already refused for staff at `get_current_user`), and client users
get a 403. None of this is tenant data, so there is no organization scoping.

Files go straight from the browser to object storage:
  1. POST /company/uploads          -> a signed PUT URL under company/<uuid>/
  2. browser PUTs the bytes
  3. POST /company/documents        -> server checks the object, records it
     (or POST /company/documents/{id}/versions to replace a file)
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import require_admin
from app.database import get_db
from app.models.company import (
    PROFILE_ID, CompanyBankAccount, CompanyDocument, CompanyDocumentVersion,
    CompanyProfile, TeamMember,
)
from app.models.user import User
from app.schemas.company import (
    BankAccountIn, BankAccountOut, CompanyProfileIn, CompanyProfileOut,
    DocumentCreate, DocumentOut, DocumentUpdate, DocumentVersionOut, DownloadLink,
    TeamMemberIn, TeamMemberOut, UploadedFile, UploadRequest, UploadTicket,
)
from app.services import company_files as rules
from app.services import storage

router = APIRouter(prefix="/company", tags=["Company"])

DOWNLOAD_TTL = 300


# ── Profile ──────────────────────────────────────────────────────────────────

@router.get("/profile", response_model=CompanyProfileOut)
async def get_profile(_: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    row = await db.get(CompanyProfile, PROFILE_ID)
    return row or CompanyProfileOut()


@router.put("/profile", response_model=CompanyProfileOut)
async def put_profile(
    data: CompanyProfileIn,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    row = await db.get(CompanyProfile, PROFILE_ID)
    if row is None:
        row = CompanyProfile(id=PROFILE_ID)
        db.add(row)
    for k, v in data.model_dump().items():
        setattr(row, k, v)
    row.updated_by = admin.id
    await db.commit()
    await db.refresh(row)
    return row


# ── Bank accounts ────────────────────────────────────────────────────────────

async def _clear_default(db: AsyncSession, keep_id: str | None = None) -> None:
    stmt = update(CompanyBankAccount).where(CompanyBankAccount.is_default.is_(True))
    if keep_id:
        stmt = stmt.where(CompanyBankAccount.id != keep_id)
    await db.execute(stmt.values(is_default=False))
    # Flush the clear before the new default is written, or the partial
    # unique index sees two defaults inside the same flush.
    await db.flush()


@router.get("/bank-accounts", response_model=list[BankAccountOut])
async def list_bank_accounts(_: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    rows = await db.execute(
        select(CompanyBankAccount).order_by(
            CompanyBankAccount.is_default.desc(), CompanyBankAccount.created_at
        )
    )
    return rows.scalars().all()


@router.post("/bank-accounts", response_model=BankAccountOut, status_code=201)
async def create_bank_account(
    data: BankAccountIn, _: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    has_any = (await db.execute(select(CompanyBankAccount.id).limit(1))).first()
    if data.is_default:
        await _clear_default(db)
    # The first account becomes the default, so invoices have something to use.
    row = CompanyBankAccount(**data.model_dump() | {"is_default": data.is_default or not has_any})
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@router.put("/bank-accounts/{account_id}", response_model=BankAccountOut)
async def update_bank_account(
    account_id: str,
    data: BankAccountIn,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    row = await db.get(CompanyBankAccount, account_id)
    if not row:
        raise HTTPException(status_code=404, detail="Bank account not found")
    if data.is_default and not row.is_default:
        await _clear_default(db, keep_id=row.id)
    for k, v in data.model_dump().items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return row


@router.delete("/bank-accounts/{account_id}", status_code=204)
async def delete_bank_account(
    account_id: str, _: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    row = await db.get(CompanyBankAccount, account_id)
    if not row:
        raise HTTPException(status_code=404, detail="Bank account not found")
    await db.delete(row)
    await db.commit()
    return Response(status_code=204)


# ── Team ─────────────────────────────────────────────────────────────────────

@router.get("/team", response_model=list[TeamMemberOut])
async def list_team(_: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    rows = await db.execute(
        select(TeamMember).order_by(
            TeamMember.is_active.desc(), TeamMember.sort_order, TeamMember.name
        )
    )
    return rows.scalars().all()


async def _check_user(db: AsyncSession, user_id: str | None) -> None:
    if user_id and not await db.get(User, user_id):
        raise HTTPException(status_code=422, detail="Linked portal user not found")


@router.post("/team", response_model=TeamMemberOut, status_code=201)
async def create_team_member(
    data: TeamMemberIn, _: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    await _check_user(db, data.user_id)
    row = TeamMember(**data.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@router.put("/team/{member_id}", response_model=TeamMemberOut)
async def update_team_member(
    member_id: str,
    data: TeamMemberIn,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    row = await db.get(TeamMember, member_id)
    if not row:
        raise HTTPException(status_code=404, detail="Team member not found")
    await _check_user(db, data.user_id)
    for k, v in data.model_dump().items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return row


@router.delete("/team/{member_id}", status_code=204)
async def delete_team_member(
    member_id: str, _: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    row = await db.get(TeamMember, member_id)
    if not row:
        raise HTTPException(status_code=404, detail="Team member not found")
    await db.delete(row)
    await db.commit()
    return Response(status_code=204)


# ── Documents ────────────────────────────────────────────────────────────────

def _doc_out(doc: CompanyDocument, names: dict[str, str]) -> DocumentOut:
    out = DocumentOut.model_validate(doc)
    out.uploader_name = names.get(doc.uploaded_by or "")
    return out


async def _names(db: AsyncSession, ids: set[str | None]) -> dict[str, str]:
    ids = {i for i in ids if i}
    if not ids:
        return {}
    rows = await db.execute(select(User.id, User.full_name, User.email).where(User.id.in_(ids)))
    return {r.id: r.full_name or r.email for r in rows}


async def _get_doc(db: AsyncSession, doc_id: str) -> CompanyDocument:
    doc = (
        await db.execute(
            select(CompanyDocument)
            .options(selectinload(CompanyDocument.versions))
            .where(CompanyDocument.id == doc_id)
        )
    ).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


async def _verified_upload(f: UploadedFile) -> tuple[str, int]:
    """Check an uploaded object is ours and within limits; return (type, size)."""
    if not rules.owns_key(f.storage_key):
        raise HTTPException(status_code=422, detail="Unrecognised upload")
    content_type = rules.content_type_for(f.original_name)
    size = await storage.object_size(f.storage_key)
    if size is None:
        raise HTTPException(status_code=422, detail="The upload didn't finish - please try again")
    if size > rules.MAX_COMPANY_FILE_BYTES:
        # Presigned PUTs can't cap size, so an oversized file can land. Don't
        # leave it sitting in the bucket.
        await storage.delete_file_from_storage(f.storage_key)
    rules.check_size(size)
    return content_type, size


@router.post("/uploads", response_model=UploadTicket)
async def start_upload(data: UploadRequest, _: User = Depends(require_admin)):
    content_type = rules.content_type_for(data.filename)
    rules.check_size(data.size_bytes)
    key = rules.new_key(data.filename)
    url = await storage.generate_presigned_upload(key, content_type, expires=900)
    return UploadTicket(upload_url=url, storage_key=key, content_type=content_type)


@router.get("/documents", response_model=list[DocumentOut])
async def list_documents(
    category: str | None = Query(None),
    q: str | None = Query(None, max_length=100),
    archived: bool = Query(False),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(CompanyDocument)
        .where(CompanyDocument.is_archived.is_(archived))
        .order_by(CompanyDocument.updated_at.desc())
    )
    if category:
        stmt = stmt.where(CompanyDocument.category == category)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(
            CompanyDocument.title.ilike(like),
            CompanyDocument.description.ilike(like),
            CompanyDocument.original_name.ilike(like),
        ))
    docs = (await db.execute(stmt)).scalars().all()
    names = await _names(db, {d.uploaded_by for d in docs})
    return [_doc_out(d, names) for d in docs]


@router.post("/documents", response_model=DocumentOut, status_code=201)
async def create_document(
    data: DocumentCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    content_type, size = await _verified_upload(data)
    doc = CompanyDocument(
        title=data.title.strip(),
        description=(data.description or "").strip() or None,
        category=data.category,
        tags=[t.strip() for t in data.tags if t.strip()][:20],
        expires_on=data.expires_on,
        version=1,
        original_name=data.original_name,
        content_type=content_type,
        size_bytes=size,
        storage_key=data.storage_key,
        uploaded_by=admin.id,
    )
    doc.versions.append(CompanyDocumentVersion(
        version=1, original_name=data.original_name, content_type=content_type,
        size_bytes=size, storage_key=data.storage_key, uploaded_by=admin.id,
    ))
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return _doc_out(doc, await _names(db, {admin.id}))


@router.patch("/documents/{doc_id}", response_model=DocumentOut)
async def update_document(
    doc_id: str,
    data: DocumentUpdate,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    doc = await _get_doc(db, doc_id)
    fields = data.model_dump(exclude_unset=True)
    if "tags" in fields:
        fields["tags"] = [t.strip() for t in (fields["tags"] or []) if t.strip()][:20]
    if "title" in fields and fields["title"]:
        fields["title"] = fields["title"].strip()
    for k, v in fields.items():
        setattr(doc, k, v)
    await db.commit()
    await db.refresh(doc)
    return _doc_out(doc, await _names(db, {doc.uploaded_by}))


@router.post("/documents/{doc_id}/versions", response_model=DocumentOut)
async def add_version(
    doc_id: str,
    data: UploadedFile,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    doc = await _get_doc(db, doc_id)
    content_type, size = await _verified_upload(data)
    doc.version += 1
    doc.original_name = data.original_name
    doc.content_type = content_type
    doc.size_bytes = size
    doc.storage_key = data.storage_key
    doc.uploaded_by = admin.id
    doc.versions.append(CompanyDocumentVersion(
        version=doc.version, original_name=data.original_name, content_type=content_type,
        size_bytes=size, storage_key=data.storage_key, uploaded_by=admin.id,
    ))
    await db.commit()
    await db.refresh(doc)
    return _doc_out(doc, await _names(db, {admin.id}))


@router.get("/documents/{doc_id}/versions", response_model=list[DocumentVersionOut])
async def list_versions(
    doc_id: str, _: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    return (await _get_doc(db, doc_id)).versions


@router.get("/documents/{doc_id}/download", response_model=DownloadLink)
async def download_document(
    doc_id: str,
    version: int | None = Query(None),
    inline: bool = Query(True),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    doc = await _get_doc(db, doc_id)
    target = doc
    if version is not None and version != doc.version:
        target = next((v for v in doc.versions if v.version == version), None)
        if target is None:
            raise HTTPException(status_code=404, detail="Version not found")
    url = await storage.generate_presigned_download(
        target.storage_key, target.original_name, target.content_type,
        # SVG can carry script; never render it inline from our bucket.
        inline=inline and target.content_type != "image/svg+xml",
        expires=DOWNLOAD_TTL,
    )
    return DownloadLink(url=url, expires_in=DOWNLOAD_TTL)


@router.delete("/documents/{doc_id}", status_code=204)
async def delete_document(
    doc_id: str, _: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    doc = await _get_doc(db, doc_id)
    keys = {v.storage_key for v in doc.versions} | {doc.storage_key}
    await db.delete(doc)
    await db.commit()
    # Rows first: a stray object is harmless, a row pointing at nothing is not.
    for key in keys:
        try:
            await storage.delete_file_from_storage(key)
        except Exception:  # noqa: BLE001 - best effort; the record is already gone
            pass
    return Response(status_code=204)
