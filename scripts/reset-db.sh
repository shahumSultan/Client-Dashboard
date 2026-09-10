#!/usr/bin/env bash
# Wipe every row and keep only the admin accounts.
#
# Existing admins are preserved by clerk_id so they stay admin on the next
# request — otherwise the lazy provisioning in get_current_user would recreate
# them as client_member with no organization and push them into the client
# signup flow.
#
#   ./scripts/reset-db.sh            # keep current admins
#   ./scripts/reset-db.sh --force    # skip the confirmation
set -euo pipefail

cd "$(dirname "$0")/.."
PSQL=(docker compose exec -T postgres psql -U enigma -d client_portal)

admins=$("${PSQL[@]}" -tAF'|' -c \
  "SELECT clerk_id, email, coalesce(full_name,''), coalesce(avatar_url,'') FROM users WHERE role='admin';")

if [[ -z "$admins" ]]; then
  echo "No admin found — refusing to wipe, or you would lock yourself out." >&2
  echo "Sign in, run ./scripts/make-admin.sh <email>, then retry." >&2
  exit 1
fi

echo "Admins that will be kept:"
echo "$admins" | awk -F'|' '{print "  - "$2}'
echo
echo "Everything else is deleted: organizations, projects, milestones,"
echo "updates, requests, files, comments, analytics, notifications, users."

if [[ "${1:-}" != "--force" ]]; then
  read -rp "Type 'reset' to continue: " reply
  [[ "$reply" == "reset" ]] || { echo "Aborted."; exit 1; }
fi

backup="/tmp/client-portal-backup-$(date +%Y%m%d-%H%M%S).sql"
docker compose exec -T postgres pg_dump -U enigma -d client_portal > "$backup"
echo "Backup written to $backup"

# One statement so a failure rolls the whole thing back. alembic_version is
# left alone: the schema is unchanged, only the data goes.
"${PSQL[@]}" -q -c "TRUNCATE TABLE
    comments, notifications, analytics_entries, files, requests,
    project_updates, milestones, projects, onboarding_data, users, organizations
  RESTART IDENTITY CASCADE;"

while IFS='|' read -r clerk_id email full_name avatar_url; do
  [[ -z "$clerk_id" ]] && continue
  "${PSQL[@]}" -q -c "INSERT INTO users
      (id, clerk_id, email, full_name, avatar_url, role, is_active, created_at, updated_at)
    VALUES (gen_random_uuid()::text,
      '${clerk_id//\'/\'\'}', '${email//\'/\'\'}',
      nullif('${full_name//\'/\'\'}',''), nullif('${avatar_url//\'/\'\'}',''),
      'admin', true, now(), now());"
done <<< "$admins"

echo
"${PSQL[@]}" -c "SELECT email, role, organization_id FROM users;"
echo "Done. Admins have no organization — that is correct; only clients get one."
