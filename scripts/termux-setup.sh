#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

if [[ -n "${PREFIX:-}" && -d "$PREFIX" ]] && command -v pkg >/dev/null 2>&1; then
  pkg update -y
  pkg install -y nodejs-lts git
elif command -v apt-get >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y nodejs npm git ca-certificates
else
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

npm install --no-audit --no-fund
npm test

echo
echo "Setup complete. Start the Termux-safe development server with:"
echo "  npm run dev:termux"
echo
echo "The first remote run may ask you to sign in to Cloudflare."
