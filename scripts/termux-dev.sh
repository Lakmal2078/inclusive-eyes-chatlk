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

# Android/Termux can fail while Wrangler starts its local workerd binary with
# a 1 GiB virtual-memory allocation. Remote mode keeps that runtime off-phone.
exec npx wrangler dev --remote --inspector-port 0 --ip 0.0.0.0 "$@"
