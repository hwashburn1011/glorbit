#!/usr/bin/env bash
# glorbit post-clone bootstrap.
# Idempotent: safe to re-run.

set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m•\033[0m %s\n' "$*"; }
err()  { printf '  \033[31m✗\033[0m %s\n' "$*" >&2; }

bold "glorbit bootstrap — $ROOT"

# --- node ---
if ! command -v node >/dev/null 2>&1; then
  err "node not found. install Node 20+ (https://nodejs.org, nvm, fnm, or volta)."
  exit 1
fi
node_major="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$node_major" -lt 20 ]; then
  err "node $node_major detected; glorbit needs 20+."
  exit 1
fi
ok "node $(node -v)"

# --- pnpm ---
if ! command -v pnpm >/dev/null 2>&1; then
  warn "pnpm not found; attempting corepack enable…"
  if command -v corepack >/dev/null 2>&1; then
    corepack enable pnpm || true
  fi
fi
if ! command -v pnpm >/dev/null 2>&1; then
  err "pnpm still not found. install with: npm i -g pnpm"
  exit 1
fi
ok "pnpm $(pnpm --version)"

# --- install deps ---
bold "installing workspace dependencies"
pnpm install

# --- env ---
if [ ! -f "$ROOT/.env" ] && [ ! -f "$ROOT/apps/server/.env" ]; then
  if [ -f "$ROOT/.env.example" ]; then
    cp "$ROOT/.env.example" "$ROOT/.env"
    ok "wrote .env at repo root from .env.example"
  fi
else
  ok ".env already present"
fi

# --- done ---
cat <<EOF

$(bold "ready.")

next steps:
  # seed mode (no real agents — boots with 4 fake ones)
  pnpm --filter @glorbit/server seed &
  pnpm --filter @glorbit/web dev

  # real mode (attach your own terminals from the UI)
  pnpm dev

then open http://localhost:3000

env lives in .env (or apps/server/.env) — either is fine.
EOF
