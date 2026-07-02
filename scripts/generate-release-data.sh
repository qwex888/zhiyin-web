#!/usr/bin/env bash
# 前端版本发布数据生成
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NEW_VERSION="${1:-}"
PREV_TAG="${2:-}"

if [ -z "$NEW_VERSION" ]; then
  echo "用法: $0 <新版本号> [上一版本tag]" >&2
  exit 1
fi

TAG="v${NEW_VERSION}"
OUTPUT_DIR="${OUTPUT_DIR:-$ROOT/releases}"
mkdir -p "$OUTPUT_DIR"

if [ -z "$PREV_TAG" ]; then
  PREV_TAG=$(git tag -l 'v*' --sort=-v:refname | grep -v "^${TAG}$" | head -1 || true)
fi

if [ -n "$PREV_TAG" ]; then
  GIT_RANGE="${PREV_TAG}..HEAD"
else
  GIT_RANGE="HEAD"
fi

PUBLISHED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
COMMITS_FILE=$(mktemp)
trap 'rm -f "$COMMITS_FILE"' EXIT
git log "$GIT_RANGE" --pretty=format:"%s|||%an" --no-merges > "$COMMITS_FILE" || true

export COMMITS_FILE TAG NEW_VERSION PUBLISHED_AT OUTPUT_DIR ROOT
python3 << 'PY'
import json
import os
import sys

root = os.environ["ROOT"]
sys.path.insert(0, os.path.join(root, "scripts"))
from format_release_notes import (
    changes_dict_from_commits,
    format_release_notes,
    summary_from_changes,
)

commits_file = os.environ["COMMITS_FILE"]
tag = os.environ["TAG"]
published_at = os.environ["PUBLISHED_AT"]
output_dir = os.environ["OUTPUT_DIR"]

with open(commits_file, "r", encoding="utf-8") as f:
    commit_lines = f.readlines()

changes = changes_dict_from_commits(commit_lines)
summary = summary_from_changes(changes) if any(changes.values()) else f"发布 {tag}"

entry = {
    "version": tag,
    "published_at": published_at,
    "summary": summary,
    "changes": changes,
}

path = os.path.join(output_dir, "frontend-releases.json")
items = []
if os.path.exists(path):
    with open(path, "r", encoding="utf-8") as f:
        items = json.load(f)
items = [r for r in items if r.get("version") != tag]
items.insert(0, entry)
with open(path, "w", encoding="utf-8") as f:
    json.dump(items, f, ensure_ascii=False, indent=2)
    f.write("\n")

notes = format_release_notes(commit_lines, bilingual=True)
with open(os.path.join(output_dir, "..", "release_notes.md"), "w", encoding="utf-8") as f:
    f.write(notes)

print(f"✓ 已生成 {path} 和 release_notes.md")
PY
