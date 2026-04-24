import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.core.auth import get_current_user, require_admin
from app.core.permissions import assert_project_access
from app.models.user import User
from app.models.file import File
from app.schemas.file import FileOut, PresignedUploadOut
from app.services.storage import generate_presigned_upload, delete_file_from_storage

router = APIRouter(prefix="/files", tags=["Files"])


@router.get("/project/{project_id}", response_model=list[FileOut])
async def list_files(
    project_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await assert_project_access(user, project_id, db)
    result = await db.execute(
        select(File)
        .where(File.project_id == project_id)
        .order_by(File.created_at.desc())
    )
    return result.scalars().all()


@router.post("/project/{project_id}/presign", response_model=PresignedUploadOut)
async def get_upload_url(
    project_id: str,
    original_name: str = Form(...),
    file_type: str = Form(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await assert_project_access(user, project_id, db)
    file_id = str(uuid.uuid4())
    storage_key = f"projects/{project_id}/{file_id}/{original_name}"
    upload_url = await generate_presigned_upload(storage_key, file_type)
    return PresignedUploadOut(upload_url=upload_url, file_id=file_id, storage_key=storage_key)


@router.post("/project/{project_id}/confirm", response_model=FileOut)
async def confirm_upload(
    project_id: str,
    file_id: str = Form(...),
    storage_key: str = Form(...),
    original_name: str = Form(...),
    name: str = Form(...),
    file_type: str = Form(...),
    size_bytes: int = Form(...),
    description: str = Form(None),
    milestone_id: str = Form(None),
    is_deliverable: bool = Form(False),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await assert_project_access(user, project_id, db)
    from app.config import settings
    public_url = f"{settings.STORAGE_PUBLIC_URL}/{storage_key}" if settings.STORAGE_PUBLIC_URL else None

    file = File(
        id=file_id,
        project_id=project_id,
        milestone_id=milestone_id,
        uploaded_by=user.id,
        name=name,
        original_name=original_name,
        file_type=file_type,
        size_bytes=size_bytes,
        storage_key=storage_key,
        public_url=public_url,
        description=description,
        is_deliverable=is_deliverable,
    )
    db.add(file)
    await db.commit()
    await db.refresh(file)
    return file


@router.delete("/{file_id}", status_code=204)
async def delete_file(
    file_id: str,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(File).where(File.id == file_id))
    file = result.scalar_one_or_none()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    await delete_file_from_storage(file.storage_key)
    await db.delete(file)
    await db.commit()
