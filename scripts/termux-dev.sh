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
  echo "Missing .dev.vars. Run ./scripts/termux-setup.sh first." >&2
  exit 1
fi

# Android/Termux can fail while Wrangler starts its local workerd binary with
# a 1 GiB virtual-memory allocation. Remote mode keeps that runtime off-phone.
exec npx wrangler dev --remote --inspector-port 0 --ip 0.0.0.0 "$@"
