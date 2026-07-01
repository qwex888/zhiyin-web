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
git log "$GIT_RANGE" --pretty=format:"%s" --no-merges > "$COMMITS_FILE" || true

export COMMITS_FILE TAG NEW_VERSION PUBLISHED_AT OUTPUT_DIR
python3 << 'PY'
import json, os, re

commits_file = os.environ["COMMITS_FILE"]
tag = os.environ["TAG"]
published_at = os.environ["PUBLISHED_AT"]
output_dir = os.environ["OUTPUT_DIR"]

CATEGORIES = {
    "feat": "feature", "fix": "fix", "perf": "perf", "refactor": "refactor",
    "docs": "docs", "build": "build", "ci": "ci", "style": "style",
    "test": "test", "chore": "chore",
}
changes = {v: [] for v in CATEGORIES.values()}
pattern = re.compile(r"^(feat|fix|perf|refactor|docs|build|ci|style|test|chore)(\([^)]+\))?!?:\s*(.+)$")

with open(commits_file, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("release:"):
            continue
        m = pattern.match(line)
        if not m:
            continue
        kind, scope, msg = m.group(1), m.group(2) or "", m.group(3).strip()
        entry = f"{scope.strip('()')}: {msg}" if scope else msg
        changes[CATEGORIES[kind]].append(entry)

summary_parts = []
for key, label in [("feature", "新功能"), ("fix", "修复"), ("perf", "性能")]:
    if changes[key]:
        summary_parts.append(f"{len(changes[key])} 项{label}")
summary = "、".join(summary_parts) if summary_parts else f"发布 {tag}"

entry = {"version": tag, "published_at": published_at, "summary": summary, "changes": changes}
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

rn = [f"# {tag}\n\n{summary}\n"]
for cat_key, cat_label in [
    ("feature", "✨ Features"), ("fix", "🐛 Fixes"), ("perf", "⚡ Performance"),
    ("refactor", "♻️ Refactor"), ("docs", "📝 Docs"), ("build", "🔧 Build"),
    ("ci", "👷 CI"), ("style", "💄 Style"), ("test", "✅ Tests"), ("chore", "🔨 Chore"),
]:
    if changes[cat_key]:
        rn.append(f"\n## {cat_label}\n")
        for item in changes[cat_key]:
            rn.append(f"- {item}\n")
with open(os.path.join(output_dir, "..", "release_notes.md"), "w", encoding="utf-8") as f:
    f.writelines(rn)
print(f"✓ 已生成 {path} 和 release_notes.md")
PY
rm -f "$COMMITS_FILE"
