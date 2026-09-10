"""Outbound email via Resend.

Every send is best-effort: a failure here must never break the action that
triggered it. Inviting a client succeeds whether or not the mail goes out —
the admin can always copy the link instead.
"""
import asyncio
import logging

import resend

from app.config import settings

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    return bool(settings.RESEND_API_KEY and settings.FROM_EMAIL)


def _send(payload: dict) -> None:
    resend.api_key = settings.RESEND_API_KEY
    resend.Emails.send(payload)


async def _send_async(payload: dict) -> bool:
    if not is_configured():
        logger.info("Email not configured; skipping send to %s", payload.get("to"))
        return False
    try:
        # The Resend SDK is synchronous; keep it off the event loop.
        await asyncio.to_thread(_send, payload)
        return True
    except Exception:
        logger.exception("Failed to send email to %s", payload.get("to"))
        return False


def _shell(title: str, body_html: str, cta_label: str, cta_url: str) -> str:
    """Minimal table-based layout — email clients are not browsers.

    Deliberately light: a dark card renders unpredictably against the varied
    backgrounds email clients impose, and Gmail strips most of what would make
    the portal's glass effect work.
    """
    return f"""\
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f4;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="max-width:520px;background:#ffffff;border-radius:14px;
                      border:1px solid #e7e5e4;overflow:hidden;
                      font-family:'Figtree',-apple-system,'Segoe UI',sans-serif;">
          <tr><td style="background:#0d0d0d;padding:22px 28px;">
            <span style="color:#ffffff;font-size:15px;font-weight:600;letter-spacing:-0.01em;">Enigma&#8209;Cube</span>
            <span style="color:#ffb3b3;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;margin-left:8px;">Client Portal</span>
          </td></tr>
          <tr><td style="padding:32px 28px 8px;">
            <h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;color:#0d0d0d;font-weight:600;">{title}</h1>
            {body_html}
          </td></tr>
          <tr><td style="padding:8px 28px 32px;">
            <a href="{cta_url}"
               style="display:inline-block;background:#a92e2e;color:#ffffff;
                      text-decoration:none;padding:12px 24px;border-radius:10px;
                      font-size:14px;font-weight:600;">{cta_label}</a>
            <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#78716c;">
              If the button does not work, paste this into your browser:<br>
              <span style="color:#a92e2e;word-break:break-all;">{cta_url}</span>
            </p>
          </td></tr>
          <tr><td style="border-top:1px solid #e7e5e4;padding:18px 28px;">
            <p style="margin:0;font-size:11px;color:#a8a29e;">
              You received this because someone at Enigma&#8209;Cube invited you to a project workspace.
              If you were not expecting it, you can ignore this email.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>"""


async def send_invitation_email(
    *, to: str, organization_name: str, join_url: str, inviter_name: str | None = None
) -> bool:
    """Invite a client into their workspace. Returns whether it was sent."""
    inviter = f"{inviter_name} at Enigma-Cube" if inviter_name else "Enigma-Cube"
    body = (
        f'<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#44403c;">'
        f"{inviter} has invited you to the client portal for "
        f'<strong style="color:#0d0d0d;">{organization_name}</strong>.</p>'
        f'<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#44403c;">'
        f"You will be able to follow your project timeline, see what has been "
        f"delivered, and leave remarks on the work as it progresses.</p>"
        f'<p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#78716c;">'
        f"Sign up with <strong>{to}</strong> — the invitation is tied to that address.</p>"
    )
    return await _send_async({
        "from": f"Enigma-Cube <{settings.FROM_EMAIL}>",
        "to": [to],
        "subject": f"You're invited to the {organization_name} project portal",
        "html": _shell(
            f"Join {organization_name}", body, "Accept invitation", join_url
        ),
    })
