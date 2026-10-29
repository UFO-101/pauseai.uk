#!/usr/bin/env bash
# Sets up the backup on a Cloudflare account, or updates it: run it again to
# change a secret. It needs Docker running, to build the container's image.
#
#   1. logs Wrangler in to Cloudflare, if it isn't already
#   2. creates the R2 bucket, which deletes dumps after 90 days
#   3. asks for the secrets (Enter keeps one that's already set)
#   4. deploys the Worker and its container, which then run every night
#
# After that, `npm run deploy` deploys changes to the code.
set -euo pipefail
cd "$(dirname "$0")"

BUCKET=pauseai-uk-backups
KEEP_DAYS=90
wrangler() { npx wrangler "$@"; }

docker info >/dev/null 2>&1 || { echo "Start Docker first: deploying builds the container's image." >&2; exit 1; }
[ -d node_modules ] || npm ci

wrangler whoami 2>/dev/null | grep -q "You are logged in" || wrangler login

if ! wrangler r2 bucket info "$BUCKET" >/dev/null 2>&1; then
  wrangler r2 bucket create "$BUCKET"
fi
if ! wrangler r2 bucket lifecycle list "$BUCKET" 2>/dev/null | grep -q expire-dumps; then
  wrangler r2 bucket lifecycle add "$BUCKET" expire-dumps dumps/ --expire-days "$KEEP_DAYS" --force
fi

# The secrets the Worker has already, if it's been deployed before.
existing=$(wrangler secret list --format json 2>/dev/null || echo "[]")
has_secret() { grep -q "\"name\": *\"$1\"" <<<"$existing"; }

secrets=$(mktemp)
chmod 600 "$secrets"
trap 'rm -f "$secrets"' EXIT
echo "{}" >"$secrets"
add_secret() { node -e 'const fs = require("fs"); const [file, key, value] = process.argv.slice(1); const s = JSON.parse(fs.readFileSync(file)); s[key] = value; fs.writeFileSync(file, JSON.stringify(s));' "$secrets" "$1" "$2"; }

# ask NAME "what it is" required|optional
ask() {
  local name=$1 prompt=$2 need=$3 value
  if has_secret "$name"; then prompt="$prompt [set; Enter keeps it]"; fi
  read -r -s -p "$prompt: " value
  echo
  if [ -n "$value" ]; then
    add_secret "$name" "$value"
  elif [ "$need" = required ] && ! has_secret "$name"; then
    echo "$name is needed." >&2
    exit 1
  fi
}

echo
echo "The live database's read-only connection string: in Netlify, the project's"
echo "Data & Storage > Database, copying the production branch's connection string."
ask DATABASE_URL "DATABASE_URL" required
echo
echo "Problems are emailed through Postmark, from ALERT_FROM in wrangler.jsonc."
ask POSTMARK_SERVER_TOKEN "Postmark server token" required
ask ALERT_TO "The address problems go to" required
echo
echo "The site's BACKUP_SECRET, in Netlify's settings: the Worker sends it to"
echo "copy the replies to letters, which the site keeps outside the database."
ask SITE_BACKUP_SECRET "SITE_BACKUP_SECRET" required
echo
echo "Optional: a Healthchecks.io check's ping URL (a daily period, a few hours'"
echo "grace), which emails if a night's backup never reports at all."
ask HEALTHCHECK_URL "Ping URL" optional

if ! has_secret RUN_SECRET; then
  run_secret=$(openssl rand -hex 32)
  add_secret RUN_SECRET "$run_secret"
fi

wrangler deploy --secrets-file "$secrets"

echo
echo "Deployed. It backs up every night at 03:00 UTC."
if [ -n "${run_secret:-}" ]; then
  echo
  echo "To back up now, and see the report (the container can take a few minutes"
  echo "to be ready after its first deploy), keep this RUN_SECRET somewhere safe:"
  echo
  echo "  curl -X POST -H 'Authorization: Bearer $run_secret' https://pauseai-uk-backup.<your subdomain>.workers.dev/run"
fi
