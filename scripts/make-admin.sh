#!/usr/bin/env bash
# Promote a signed-up user to admin.
#
# The user must have signed in and completed /welcome at least once — their row
# is created lazily on the first authenticated API call, not at Clerk sign-up.
set -euo pipefail

EMAIL="${1:-}"
if [[ -z "$EMAIL" ]]; then
  echo "usage: ./make-admin.sh <email>" >&2
  echo >&2
  echo "Known users:" >&2
  docker compose exec -T postgres psql -U enigma -d client_portal \
    -c "SELECT email, role, created_at FROM users ORDER BY created_at;" >&2
  exit 1
fi

updated=$(docker compose exec -T postgres psql -U enigma -d client_portal -tAc \
  "UPDATE users SET role = 'admin' WHERE email = '${EMAIL//\'/\'\'}' RETURNING email;" | head -1)

if [[ -z "$updated" ]]; then
  echo "No user with email '$EMAIL'." >&2
  echo "Sign in and finish the welcome form first, then re-run. Current users:" >&2
  docker compose exec -T postgres psql -U enigma -d client_portal \
    -c "SELECT email, role FROM users ORDER BY created_at;" >&2
  exit 1
fi

echo "$updated is now an admin. Hard-refresh the portal to pick it up."
