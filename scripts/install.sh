#!/usr/bin/env bash
# glorbit one-shot install: clone + bootstrap.
# Intended for:  bash <(curl -fsSL https://raw.githubusercontent.com/hwashburn1011/glorbit/main/scripts/install.sh)

set -euo pipefail

REPO="${GLORBIT_REPO:-https://github.com/hwashburn1011/glorbit.git}"
BRANCH="${GLORBIT_BRANCH:-main}"
TARGET="${GLORBIT_DIR:-$PWD/glorbit}"

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
err()  { printf '\033[31m✗\033[0m %s\n' "$*" >&2; }

if ! command -v git >/dev/null 2>&1; then
  err "git not found. install it first (xcode-select --install on Mac, or brew install git)."
  exit 1
fi

if [ -e "$TARGET" ]; then
  err "$TARGET already exists. Remove it or set GLORBIT_DIR=/some/other/path."
  exit 1
fi

bold "cloning $REPO ($BRANCH) → $TARGET"
git clone --branch "$BRANCH" --single-branch "$REPO" "$TARGET"

cd "$TARGET"
./scripts/bootstrap.sh
