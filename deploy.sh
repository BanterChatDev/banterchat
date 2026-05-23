#!/usr/bin/env bash
set -e

read -p "commit message: " MSG
if [ -z "$MSG" ]; then
  echo "no message, aborting"
  exit 1
fi

LAST_TAG="$(git describe --tags --abbrev=0 2>/dev/null || echo "")"
if [ -z "$LAST_TAG" ]; then
  NEW_TAG="0.1.0"
else
  MAJOR="$(echo "$LAST_TAG" | cut -d. -f1)"
  MINOR="$(echo "$LAST_TAG" | cut -d. -f2)"
  PATCH="$(echo "$LAST_TAG" | cut -d. -f3)"
  NEW_TAG="$MAJOR.$MINOR.$((PATCH + 1))"
fi

git add -A
git commit -m "$MSG"
git tag "$NEW_TAG"
git push
git push --tags

echo ""
echo "pushed $NEW_TAG"