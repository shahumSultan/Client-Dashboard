"""Seed a realistic demo client so the portal can be shown to a prospect.

Idempotent: re-running replaces the demo organization and everything under it,
and touches nothing else. Remove it entirely with --remove.

    docker compose exec backend python scripts/seed_demo.py
    docker compose exec backend python scripts/seed_demo.py --remove
"""
import asyncio
import sys
from datetime import date, timedelta
from pathlib import Path

# Run directly from the container without needing PYTHONPATH set.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.database import engine
from app.core.time import utcnow
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.models.project import Project, ProjectStatus, ProjectUpdate
from app.models.milestone import Milestone, MilestoneStatus
from app.models.request import Request, RequestCategory, RequestStatus, RequestPriority
from app.models.comment import Comment, CommentTargetType
from app.models.analytics import AnalyticsEntry
from app.models.onboarding import OnboardingData

DEMO_SLUG = "northwind-trading-demo"
TODAY = date.today()

MILESTONES = [
    ("Discovery & scoping", "Mapped the current lead flow and agreed success metrics.", MilestoneStatus.COMPLETED, -38),
    ("Data pipeline build", "Ingest from HubSpot and the web form into a single store.", MilestoneStatus.COMPLETED, -24),
    ("Scoring model v1", "First scoring pass trained on 18 months of closed deals.", MilestoneStatus.COMPLETED, -10),
    ("CRM write-back", "Push scores and reasons back onto the HubSpot contact record.", MilestoneStatus.IN_PROGRESS, 6),
    ("Integration & QA", "End-to-end testing against live traffic with a rollback path.", MilestoneStatus.UPCOMING, 18),
    ("Handover & training", "Runbook, dashboards and a walkthrough for the sales team.", MilestoneStatus.UPCOMING, 30),
]

UPDATES = [
    ("Scoring model v1 is live in shadow mode. It is ranking every inbound lead "
     "alongside your current process so we can compare the two before switching over. "
     "Early read: the top decile converts about 3x better than average.", -9),
    ("CRM write-back is underway. Once it lands, every contact in HubSpot carries its "
     "score and the three factors that drove it, so the team can see the reasoning "
     "rather than just a number.", -3),
]


async def remove(session) -> bool:
    org = (await session.execute(
        select(Organization).where(Organization.slug == DEMO_SLUG)
    )).scalar_one_or_none()
    if not org:
        return False

    projects = (await session.execute(
        select(Project).where(Project.organization_id == org.id)
    )).scalars().all()
    for p in projects:
        await session.delete(p)  # cascades to milestones, updates, requests, files

    for c in (await session.execute(
        select(Comment).where(Comment.project_id.in_([p.id for p in projects] or [""]))
    )).scalars().all():
        await session.delete(c)

    for u in (await session.execute(
        select(User).where(User.organization_id == org.id)
    )).scalars().all():
        if u.role == UserRole.ADMIN:
            u.organization_id = None   # never delete a real admin
        else:
            await session.delete(u)

    for o in (await session.execute(
        select(OnboardingData).where(OnboardingData.organization_id == org.id)
    )).scalars().all():
        await session.delete(o)

    await session.delete(org)
    await session.commit()
    return True


async def seed(session) -> None:
    await remove(session)

    org = Organization(
        name="Northwind Trading", slug=DEMO_SLUG, industry="Wholesale & Distribution",
        website="https://northwind.example.com",
        description="Regional B2B distributor running inbound lead qualification with Enigma-Cube.",
    )
    session.add(org)
    await session.flush()
    session.add(OnboardingData(organization_id=org.id))

    client = User(
        clerk_id=f"demo_{DEMO_SLUG}", email="dana.reed@northwind.example.com",
        full_name="Dana Reed", role=UserRole.CLIENT_OWNER, organization_id=org.id,
    )
    session.add(client)

    admin = (await session.execute(
        select(User).where(User.role == UserRole.ADMIN).order_by(User.created_at)
    )).scalars().first()
    await session.flush()
    author_id = admin.id if admin else client.id

    project = Project(
        organization_id=org.id, name="Lead Qualification Engine",
        description="Scores every inbound lead and writes the reasoning back into HubSpot, "
                    "so the sales team works the right accounts first.",
        status=ProjectStatus.DEVELOPMENT, completion_percentage=64,
        start_date=TODAY - timedelta(days=45), target_date=TODAY + timedelta(days=32),
        project_type="Lead Generation",
    )
    session.add(project)
    await session.flush()

    milestones = []
    for i, (title, desc, status, offset) in enumerate(MILESTONES):
        due = TODAY + timedelta(days=offset)
        m = Milestone(
            project_id=project.id, title=title, description=desc, status=status,
            due_date=due, order_index=i,
            completed_date=due if status == MilestoneStatus.COMPLETED else None,
        )
        milestones.append(m)
        session.add(m)

    updates = []
    for content, offset in UPDATES:
        u = ProjectUpdate(project_id=project.id, author_id=author_id, content=content)
        u.created_at = utcnow() + timedelta(days=offset)
        updates.append(u)
        session.add(u)

    session.add(Request(
        project_id=project.id, submitted_by=client.id,
        title="Slack alert for high-scoring leads",
        description="When a lead scores above 80, post it to our #sales channel so the "
                    "team sees it without opening HubSpot.",
        category=RequestCategory.FEATURE, status=RequestStatus.IN_PROGRESS,
        priority=RequestPriority.HIGH,
    ))

    for weeks_ago in range(4, 0, -1):
        start = TODAY - timedelta(weeks=weeks_ago)
        leads = 120 + weeks_ago * 35
        conv = int(leads * (0.11 + (4 - weeks_ago) * 0.015))
        session.add(AnalyticsEntry(
            project_id=project.id, period_start=start, period_end=start + timedelta(days=6),
            leads_processed=leads, conversions=conv,
            conversion_rate=round(conv / leads * 100, 1),
            revenue_attributed=conv * 2400,
        ))

    await session.flush()

    # A client remark with an admin reply — the flow worth showing off.
    thread = Comment(
        project_id=project.id, target_type=CommentTargetType.MILESTONE,
        target_id=milestones[3].id, author_id=client.id,
        body="Can the write-back include the three factors behind each score? "
             "The team keeps asking why a lead ranked where it did.",
    )
    session.add(thread)
    await session.flush()
    session.add(Comment(
        project_id=project.id, target_type=CommentTargetType.MILESTONE,
        target_id=milestones[3].id, author_id=author_id, parent_id=thread.id,
        body="Yes — it ships with this milestone. Each contact gets the score plus the "
             "top three contributing factors in plain language.",
    ))
    session.add(Comment(
        project_id=project.id, target_type=CommentTargetType.UPDATE,
        target_id=updates[0].id, author_id=client.id,
        body="3x on the top decile is great. Can we see that split by source?",
    ))

    await session.commit()
    print(f"Seeded '{org.name}' — 1 project, {len(MILESTONES)} milestones, "
          f"{len(UPDATES)} updates, 1 request, 4 analytics periods, 3 comments.")
    print("Client login shown in the portal as Dana Reed (no Clerk account — view it as admin).")


async def main() -> None:
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as session:
        if "--remove" in sys.argv:
            print("Removed demo data." if await remove(session) else "No demo data present.")
        else:
            await seed(session)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
