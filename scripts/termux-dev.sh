#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

if [[ -z "${PREFIX:-}" && ! -f /etc/debian_version ]]; then
  echo "Run this script in Termux or Ubuntu inside proot-distro." >&2
  exit 1
fi

if [[ ! -f package.json ]]; then
  echo "Run this script from the inclusive-eyes-chatlk project directory." >&2
  exit 1
fi

if [[ ! -f .dev.vars ]]; then
  secret="$(od -An -N32 -tx1 /dev/urandom | tr -d ' \n')"
  printf 'JWT_SECRET=%s\n' "$secret" > .dev.vars
  chmod 600 .dev.vars
  echo "Created .dev.vars with a random local JWT secret."
fi

# wrangler deploy uploads the bundled Worker to Cloudflare — it does NOT start
# a local workerd/preview process, so it is safe on Android/Termux/proot.
# Bundling is required so npm dependencies (hono, etc.) are included.
echo "Deploying ChatLK to Cloudflare (Android-safe bundled deployment)..."
exec npx wrangler deploy "$@"

