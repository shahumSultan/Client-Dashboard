"""Departments: how the Enigma-Cube team is organised.

Anyone on the team (admins and employees) can read them; only admins create,
rename, delete, or change who is in one. Members and leads must be team
accounts - a client never belongs to a department.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import require_admin, require_company
from app.database import get_db
from app.models.company import Department, DepartmentMember
from app.models.user import User, is_team
from app.schemas.company import DepartmentIn, DepartmentOut, DepartmentPerson

router = APIRouter(prefix="/departments", tags=["Departments"])


def _person(u: User) -> DepartmentPerson:
    return DepartmentPerson(
        user_id=u.id,
        name=u.full_name or u.email,
        email=u.email,
        avatar_url=u.avatar_url,
        role=u.role.value,
    )


async def _out(db: AsyncSession, depts: list[Department]) -> list[DepartmentOut]:
    ids = {m.user_id for d in depts for m in d.members} | {d.lead_user_id for d in depts if d.lead_user_id}
    users: dict[str, User] = {}
    if ids:
        rows = await db.execute(select(User).where(User.id.in_(ids)))
        users = {u.id: u for u in rows.scalars()}
    # Only active team accounts count. Leaving the team clears membership
    # (services.departments), but a deactivated or stray row must still never
    # show a client - or an ex-colleague - as part of a department.
    current = {uid: u for uid, u in users.items() if u.is_active and is_team(u)}
    out = []
    for d in depts:
        members = sorted(
            (current[m.user_id] for m in d.members if m.user_id in current),
            key=lambda u: (u.full_name or u.email).lower(),
        )
        lead = current.get(d.lead_user_id or "")
        out.append(DepartmentOut(
            id=d.id, name=d.name, description=d.description, colour=d.colour,
            sort_order=d.sort_order, created_at=d.created_at,
            lead=_person(lead) if lead else None,
            members=[_person(u) for u in members],
        ))
    return out


async def _get(db: AsyncSession, dept_id: str) -> Department:
    dept = (
        await db.execute(
            select(Department).options(selectinload(Department.members)).where(Department.id == dept_id)
        )
    ).scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return dept


async def _team_user(db: AsyncSession, user_id: str) -> User:
    user = await db.get(User, user_id)
    if not user or not user.is_active or not is_team(user):
        raise HTTPException(
            status_code=422,
            detail="Only active Enigma-Cube team accounts can be in a department.",
        )
    return user


async def _commit_unique_name(db: AsyncSession) -> None:
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="A department with that name already exists.")


@router.get("", response_model=list[DepartmentOut])
async def list_departments(_: User = Depends(require_company), db: AsyncSession = Depends(get_db)):
    rows = await db.execute(
        select(Department)
        .options(selectinload(Department.members))
        .order_by(Department.sort_order, Department.name)
    )
    return await _out(db, list(rows.scalars()))


@router.post("", response_model=DepartmentOut, status_code=201)
async def create_department(
    data: DepartmentIn, _: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    if data.lead_user_id:
        await _team_user(db, data.lead_user_id)
    dept = Department(**data.model_dump())
    # The lead is in the department too; nobody should have to add them twice.
    if data.lead_user_id:
        dept.members.append(DepartmentMember(user_id=data.lead_user_id))
    db.add(dept)
    await _commit_unique_name(db)
    return (await _out(db, [await _get(db, dept.id)]))[0]


@router.put("/{dept_id}", response_model=DepartmentOut)
async def update_department(
    dept_id: str,
    data: DepartmentIn,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    dept = await _get(db, dept_id)
    if data.lead_user_id and data.lead_user_id != dept.lead_user_id:
        await _team_user(db, data.lead_user_id)
        if all(m.user_id != data.lead_user_id for m in dept.members):
            dept.members.append(DepartmentMember(user_id=data.lead_user_id))
    for k, v in data.model_dump().items():
        setattr(dept, k, v)
    await _commit_unique_name(db)
    return (await _out(db, [await _get(db, dept.id)]))[0]


@router.delete("/{dept_id}", status_code=204)
async def delete_department(
    dept_id: str, _: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    await db.delete(await _get(db, dept_id))
    await db.commit()


@router.put("/{dept_id}/members/{user_id}", response_model=DepartmentOut)
async def add_member(
    dept_id: str, user_id: str, _: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    dept = await _get(db, dept_id)
    await _team_user(db, user_id)
    # Idempotent: adding someone already there is not an error.
    if all(m.user_id != user_id for m in dept.members):
        dept.members.append(DepartmentMember(user_id=user_id))
        await db.commit()
    return (await _out(db, [await _get(db, dept.id)]))[0]


@router.delete("/{dept_id}/members/{user_id}", response_model=DepartmentOut)
async def remove_member(
    dept_id: str, user_id: str, _: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    dept = await _get(db, dept_id)
    dept.members = [m for m in dept.members if m.user_id != user_id]
    # A lead who leaves the department stops leading it.
    if dept.lead_user_id == user_id:
        dept.lead_user_id = None
    await db.commit()
    return (await _out(db, [await _get(db, dept.id)]))[0]
