"""Company records used outside the company pages."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company import CompanyBankAccount


def format_bank_details(acct: CompanyBankAccount) -> str:
    """The plain-text block an invoice prints under "Bank transfer"."""
    lines = [
        f"Bank: {acct.bank_name}",
        f"Account name: {acct.account_name}",
        acct.account_number and f"Account number: {acct.account_number}",
        acct.iban and f"IBAN: {acct.iban}",
        acct.swift and f"SWIFT/BIC: {acct.swift}",
        acct.branch and f"Branch: {acct.branch}",
        acct.currency and f"Currency: {acct.currency}",
    ]
    return "\n".join(line for line in lines if line)


async def default_bank_details(db: AsyncSession) -> str | None:
    acct = (
        await db.execute(select(CompanyBankAccount).where(CompanyBankAccount.is_default.is_(True)))
    ).scalar_one_or_none()
    return format_bank_details(acct) if acct else None
