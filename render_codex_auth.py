#!/usr/bin/env python3
import json
import os
from pathlib import Path

SECRET = Path(os.environ.get("CODEX_AUTH_SECRET_PATH", "/run/hermes-render/auth.json"))
DEST = Path(os.environ.get("HERMES_AUTH_PATH", "/opt/data/auth.json"))

if not SECRET.exists():
    raise SystemExit(f"Codex auth bootstrap: {SECRET} is missing")

DEST.parent.mkdir(parents=True, exist_ok=True)

with SECRET.open("r", encoding="utf-8-sig") as f:
    data = json.load(f)

providers = data.setdefault("providers", {})
state = providers.get("openai-codex")
tokens = state.get("tokens") if isinstance(state, dict) else None

def usable(t):
    return isinstance(t, dict) and bool(t.get("access_token")) and bool(t.get("refresh_token"))

if not usable(tokens):
    pool = data.get("credential_pool", {})
    entries = pool.get("openai-codex", []) if isinstance(pool, dict) else []
    chosen = None
    for entry in reversed(entries if isinstance(entries, list) else []):
        if isinstance(entry, dict) and entry.get("access_token") and entry.get("refresh_token"):
            chosen = entry
            break
    if chosen is None:
        raise SystemExit("Codex auth bootstrap: no usable openai-codex OAuth credential found in secret auth.json")
    providers["openai-codex"] = {
        "tokens": {
            "access_token": chosen["access_token"],
            "refresh_token": chosen["refresh_token"],
        },
        "last_refresh": chosen.get("last_refresh"),
        "auth_mode": "chatgpt",
        "label": chosen.get("label"),
    }

data["active_provider"] = "openai-codex"

tmp = DEST.with_suffix(".tmp")
with tmp.open("w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False)
os.chmod(tmp, 0o600)
os.replace(tmp, DEST)
os.chmod(DEST, 0o600)

print("Codex auth bootstrap: credential loaded for openai-codex")
