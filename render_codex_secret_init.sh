#!/command/with-contenv sh
set -eu

SOURCE=/etc/secrets/auth.json
RUNTIME_DIR=/run/hermes-render
RUNTIME_SECRET="$RUNTIME_DIR/auth.json"

if [ ! -f "$SOURCE" ]; then
    echo "Codex auth bootstrap: $SOURCE is missing" >&2
    exit 1
fi

# Render mounts secret files for root. Copy the credential during s6's
# root-only init phase, then hand the temporary copy to the hermes user.
install -d -m 0700 "$RUNTIME_DIR"
cp "$SOURCE" "$RUNTIME_SECRET"
chown hermes:hermes "$RUNTIME_SECRET"
chmod 0600 "$RUNTIME_SECRET"

echo "Codex auth bootstrap: staged Render secret for hermes"
