"""
Transactional email helpers.

Delivery uses Django's configured EMAIL_BACKEND (console in development, SMTP when
EMAIL_HOST is set). Failures are logged and reported to the caller instead of raising,
so a mail-server outage never breaks the request that triggered the email.
"""

import logging
from urllib.parse import urlencode

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def frontend_url(path: str, **query) -> str:
    base = settings.FRONTEND_URL.rstrip('/')
    url = f"{base}/{path.lstrip('/')}"
    if query:
        url = f"{url}?{urlencode(query)}"
    return url


def send_app_email(subject: str, body: str, recipient: str) -> bool:
    """Sends a plain-text email. Returns True on success, False (and logs) on failure."""
    try:
        sent = send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            fail_silently=False,
        )
        return bool(sent)
    except Exception:  # noqa: BLE001 - mail transport errors vary by backend
        logger.exception("Failed to send email '%s' to %s", subject, recipient)
        return False


def send_password_reset_email(user, uid: str, token: str) -> bool:
    link = frontend_url('/reset-password', uid=uid, token=token)
    name = (user.get_full_name() or '').strip() or user.email
    body = (
        f"Hello {name},\n\n"
        "We received a request to reset the password for your ScholarForge AI account.\n"
        f"Choose a new password here:\n\n{link}\n\n"
        "This link can be used once and expires automatically. If you did not request a reset, "
        "you can ignore this email; your password will not change.\n\n"
        "- ScholarForge AI"
    )
    return send_app_email('Reset your ScholarForge AI password', body, user.email)


def send_project_invitation_email(invitation) -> bool:
    link = frontend_url(f'/invitations/{invitation.token}')
    inviter = invitation.invited_by
    inviter_name = ((inviter.get_full_name() or '').strip() or inviter.email) if inviter else 'A researcher'
    role = invitation.get_role_display() if hasattr(invitation, 'get_role_display') else invitation.role
    body = (
        f"Hello,\n\n"
        f"{inviter_name} has invited you to collaborate on the research project "
        f"\"{invitation.project.title}\" on ScholarForge AI as {role}.\n\n"
        f"Review and accept the invitation here:\n\n{link}\n\n"
        f"Sign in (or register) with this email address ({invitation.invitee_email}) to accept. "
        f"The invitation expires on {invitation.expires_at:%d %B %Y}.\n\n"
        "- ScholarForge AI"
    )
    return send_app_email(
        f"Invitation to collaborate on \"{invitation.project.title}\"",
        body,
        invitation.invitee_email,
    )
