#!/usr/bin/env python3
import argparse
import json
import os
import sys
import urllib.error
import urllib.request


def main():
    parser = argparse.ArgumentParser(description="Send an email through Jarvis Gmail Connector")
    parser.add_argument("--to", required=True)
    parser.add_argument("--subject", required=True)
    parser.add_argument("--text", required=True)
    args = parser.parse_args()

    base_url = os.environ.get(
        "GMAIL_CONNECTOR_URL",
        "https://jarvis-gmail-connector.onrender.com",
    ).rstrip("/")
    api_key = os.environ.get("GMAIL_CONNECTOR_API_KEY", "").strip()

    if not api_key:
        print(json.dumps({"ok": False, "error": "GMAIL_CONNECTOR_API_KEY is not configured"}))
        return 2

    payload = json.dumps({
        "to": args.to.strip(),
        "subject": args.subject.strip(),
        "text": args.text,
    }).encode("utf-8")

    request = urllib.request.Request(
        f"{base_url}/send",
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            result = json.loads(response.read().decode("utf-8"))
            print(json.dumps(result))
            return 0 if result.get("ok") else 1
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        print(json.dumps({"ok": False, "status": error.code, "error": body}))
        return 1
    except Exception as error:
        print(json.dumps({"ok": False, "error": str(error)}))
        return 1


if __name__ == "__main__":
    sys.exit(main())
