---
name: gmail-send
description: Send an email through the private Jarvis Gmail Connector when the user explicitly asks to send an email.
---

# Gmail Send

Use this skill only when the user explicitly requests sending an email.

Before sending, confirm the recipient email address, subject, and final message text with the user. Sending is an external side effect, so never infer or guess a recipient.

Run:

```bash
python /opt/data/skills/gmail-send/send_email.py --to "recipient@example.com" --subject "Subject" --text "Message body"
```

The script reads:

- `GMAIL_CONNECTOR_URL`
- `GMAIL_CONNECTOR_API_KEY`

Report success only when the script returns JSON containing `"ok": true`. If it fails, report the error without printing either environment variable.
