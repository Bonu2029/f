#!/usr/bin/env bash
# Makes a .zip for each website folder, plus one "all-websites.zip" containing everything.
#
#   Usage:  bash zip-sites.sh
#   Output: dist/<site-name>.zip  and  dist/all-websites.zip

set -euo pipefail
cd "$(dirname "$0")"

rm -rf dist
mkdir -p dist

if [ ! -d sites ]; then
  echo "No 'sites' folder found. Nothing to zip."
  exit 1
fi

made=0
for dir in sites/*/; do
  name=$(basename "$dir")
  # Skip folders that only contain the placeholder README
  count=$(find "$dir" -type f ! -name 'README.md' ! -name '.gitkeep' | wc -l)
  if [ "$count" -eq 0 ]; then
    echo "skip:  $name (empty - add your files first)"
    continue
  fi
  (cd sites && zip -rq "../dist/$name.zip" "$name" -x '*.DS_Store' '*__MACOSX*')
  echo "made:  dist/$name.zip"
  made=$((made+1))
done

if [ "$made" -gt 0 ]; then
  zip -rq dist/all-websites.zip sites -x '*.DS_Store' '*__MACOSX*'
  echo "made:  dist/all-websites.zip  (everything in one file)"
else
  echo
  echo "All site folders are still empty. Copy your website files into"
  echo "sites/<name>/ first, then run this script again."
fi
