"""One-off deliverability check: python send_test_email.py [recipient]"""
import sys

from email_sender import send_email

to = sys.argv[1] if len(sys.argv) > 1 else "adibahmed@iut-dhaka.edu"

message_id = send_email(
    to=to,
    subject="Quick question about your outbound process",
    body=(
        "Hi Adib,\n\n"
        "This is a test message from Outpace to confirm that outbound email "
        "is delivered to the inbox.\n\n"
        "If you received this, a quick reply would be appreciated.\n\n"
        "Thanks,\n"
        "Adib"
    ),
    sender_name="Adib Omi",
)
print(f"Sent to {to} (Message-ID: {message_id})")
