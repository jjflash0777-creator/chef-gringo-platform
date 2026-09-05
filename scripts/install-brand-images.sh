#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/public/brand/editorial"
BATCH1="${1:-$HOME/Downloads/Chef Gringo Website Images.zip}"
BATCH2="${2:-$HOME/Downloads/chef gringo images 2.zip}"

if [ ! -f "$BATCH1" ]; then
  echo "Missing first image ZIP: $BATCH1"
  echo "Pass its path as the first argument."
  exit 1
fi

if [ ! -f "$BATCH2" ]; then
  echo "Missing second image ZIP: $BATCH2"
  echo "Pass its path as the second argument."
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/one" "$TMP/two" "$DEST"
unzip -q "$BATCH1" -d "$TMP/one"
unzip -q "$BATCH2" -d "$TMP/two"

install_image() {
  local search_root="$1"
  local source_name="$2"
  local output_name="$3"
  local max_px="$4"
  local source_path
  source_path="$(find "$search_root" -type f -name "$source_name" -not -path '*/__MACOSX/*' -print -quit)"
  if [ -z "$source_path" ]; then
    echo "Could not find $source_name"
    exit 1
  fi
  cp "$source_path" "$DEST/$output_name"
  sips -Z "$max_px" -s format jpeg -s formatOptions 80 "$DEST/$output_name" >/dev/null
  echo "Installed $output_name"
}

install_image "$TMP/one" "BYAjRaV8OrmPB47Ug48z--0--Ihjzf.jpg" "hero-kitchen.jpg" 1800
install_image "$TMP/one" "AMIwfhhN51UXCjIkHmqm--0--0Fyjs.jpg" "refrigeration.jpg" 1600
install_image "$TMP/one" "WnB97psNRFtnnjHhL3Eg--0--cZf6V_resized_3.9063x-real-esrgan-x4-plus(1).jpg" "cooking-line.jpg" 1600
install_image "$TMP/one" "ePIbLfwBRclH7sdgqlTD--0--aOPnt_resized_5x-real-esrgan-x4-plus.jpg" "prep-station.jpg" 1600
install_image "$TMP/one" "MTQsi2H0Zre9iLCNwxZs--0--NPxGF(1).jpg" "food-truck.jpg" 1600
install_image "$TMP/two" "99TjloUIOoPj8XPI4kpT--0--a9K_4.jpg" "operator-intelligence.jpg" 1800
install_image "$TMP/two" "b7ZKLKULTMTdGhQDMJEA--0--bGMO_.jpg" "repair-replace.jpg" 1600
install_image "$TMP/two" "5yJoiNcjXFltcmRGSDxK--0--vw87S.jpg" "dish-pit.jpg" 1800
install_image "$TMP/two" "3rPBVElqWjlNn4BxFamf--0--ZRLE5.jpg" "senior-living.jpg" 1600
install_image "$TMP/two" "aWTH7isHwEXsO5eB7Dol--0--IZaY0.jpg" "empty-kitchen.jpg" 1800

echo
printf 'Chef Gringo brand images installed in %s\n' "$DEST"
echo "Run: git status"
