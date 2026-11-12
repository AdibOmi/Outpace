import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid

from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))


def send_email(
    to: str,
    subject: str,
    body: str,
    sender_name: str | None = None,
    in_reply_to: str | None = None,
) -> str:
    """Send a plain-text email via SMTP (Gmail by default). Returns the Message-ID.

    Pass `in_reply_to` (a previous Message-ID) to thread a follow-up under it.
    """
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_APP_PASSWORD")
    if not user or not password:
        raise RuntimeError("SMTP_USER and SMTP_APP_PASSWORD must be set in backend/.env")

    msg = EmailMessage()
    msg["From"] = formataddr((sender_name, user)) if sender_name else user
    msg["To"] = to
    msg["Subject"] = subject
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain=user.split("@")[1])
    if in_reply_to:
        msg["In-Reply-To"] = in_reply_to
        msg["References"] = in_reply_to
    msg.set_content(body)

    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ssl.create_default_context()) as server:
        server.login(user, password)
        server.send_message(msg)

    return msg["Message-ID"]
