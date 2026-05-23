#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-win}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

case "$TARGET" in
  win|windows)
    EB_FLAG="--win"
    EXPECT_EXT="exe"
    ;;
  mac|macos|darwin)
    EB_FLAG="--mac"
    EXPECT_EXT="dmg"
    ;;
  linux)
    EB_FLAG="--linux"
    EXPECT_EXT="AppImage"
    ;;
  *)
    echo "usage: $0 [win|mac|linux]   (default: win)" >&2
    exit 1
    ;;
esac

echo "==> target: $TARGET"

if [ ! -f build/icon.ico ] || [ ! -f build/icon.png ]; then
  echo "ERROR: missing build/icon.ico or build/icon.png" >&2
  echo "       generate them from src/ui/assets/logo.webp first" >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "==> installing deps"
  npm install
fi

echo "==> building UI"
npm run build:ui

echo "==> running electron-builder"
npx electron-builder $EB_FLAG

mkdir -p out
shopt -s nullglob
artifacts=(dist/*."$EXPECT_EXT")
if [ ${#artifacts[@]} -eq 0 ]; then
  echo "warn: no .$EXPECT_EXT artifact found in dist/ — listing what was produced:" >&2
  ls -la dist/ >&2
  exit 1
fi

for f in "${artifacts[@]}"; do
  cp "$f" "out/$(basename "$f")"
  echo "==> $(basename "$f") -> out/"
done

echo "==> done. artifacts in $HERE/out/"