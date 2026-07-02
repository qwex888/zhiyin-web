#!/usr/bin/env python3
"""GitHub Release Notes（双语、分类、含作者与 PR）。"""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from typing import Iterable

COMMIT_PATTERN = re.compile(
    r"^(feat|fix|perf|refactor|docs|build|ci|style|test|chore)(\(([^)]*)\))?!?:\s*(.+)$",
    re.IGNORECASE,
)
PR_PATTERN = re.compile(r"\(#(\d+)\)")

I18N_SCOPES = frozenset({"lang", "i18n", "locale", "l10n"})

# (internal_key, english_header, chinese_header, conventional_types)
CATEGORY_DEFS: list[tuple[str, str, str, frozenset[str]]] = [
    ("feature", "🆕 Features", "🆕 新特性", frozenset({"feat"})),
    ("fix", "🐛 Bug Fixes", "🐛 Bug Fixes", frozenset({"fix"})),
    ("perf", "⚡ Performance", "⚡ 性能优化", frozenset({"perf"})),
    ("refactor", "♻️ Refactor", "♻️ 重构", frozenset({"refactor"})),
    ("docs", "📖 Document", "📖 文档", frozenset({"docs"})),
    ("i18n", "🌎 Internationalization", "🌎 国际化", frozenset()),
    ("build", "🔧 Build", "🔧 构建", frozenset({"build"})),
    ("ci", "👷 CI", "👷 CI", frozenset({"ci"})),
    ("style", "💄 Style", "💄 样式", frozenset({"style"})),
    ("test", "✅ Tests", "✅ 测试", frozenset({"test"})),
    ("chore", "🔨 Chore", "🔨 杂项", frozenset({"chore"})),
]

TYPE_TO_KEY = {
    "feat": "feature",
    "fix": "fix",
    "perf": "perf",
    "refactor": "refactor",
    "docs": "docs",
    "build": "build",
    "ci": "ci",
    "style": "style",
    "test": "test",
    "chore": "chore",
}


@dataclass
class CommitEntry:
    kind: str
    scope: str
    message: str
    author: str
    pr: str | None
    raw_subject: str

    @property
    def category_key(self) -> str:
        if self.kind == "feat" and self.scope.lower() in I18N_SCOPES:
            return "i18n"
        return TYPE_TO_KEY.get(self.kind, "chore")

    def bullet(self) -> str:
        pr_suffix = f" (#{self.pr})" if self.pr else ""
        return f"* {self.raw_subject} @{self.author}{pr_suffix}"


def parse_commit_line(line: str) -> CommitEntry | None:
    line = line.strip()
    if not line:
        return None
    if line.startswith("release:") or line.startswith("docs(release):"):
        return None

    if "|||" in line:
        subject, author = line.split("|||", 1)
        author = author.strip() or "unknown"
    else:
        subject, author = line, "unknown"

    subject = subject.strip()
    m = COMMIT_PATTERN.match(subject)
    if not m:
        return None

    kind = m.group(1).lower()
    scope = (m.group(3) or "").strip()
    message = m.group(4).strip()
    pr_match = PR_PATTERN.search(subject)
    pr = pr_match.group(1) if pr_match else None

    return CommitEntry(
        kind=kind,
        scope=scope,
        message=message,
        author=author,
        pr=pr,
        raw_subject=subject,
    )


def group_commits(commits: Iterable[CommitEntry]) -> dict[str, list[CommitEntry]]:
    grouped: dict[str, list[CommitEntry]] = {key: [] for key, *_ in CATEGORY_DEFS}
    for commit in commits:
        grouped[commit.category_key].append(commit)
    return grouped


def _render_section(grouped: dict[str, list[CommitEntry]], use_chinese: bool) -> list[str]:
    lines: list[str] = []
    for key, en_header, zh_header, _ in CATEGORY_DEFS:
        items = grouped.get(key) or []
        if not items:
            continue
        header = zh_header if use_chinese else en_header
        lines.append(f"\n## {header}\n")
        for item in items:
            lines.append(f"{item.bullet()}\n")
    return lines


def format_release_notes(
    commit_lines: Iterable[str],
    *,
    bilingual: bool = True,
    extra_en: list[str] | None = None,
    extra_zh: list[str] | None = None,
) -> str:
    commits = [c for line in commit_lines if (c := parse_commit_line(line))]
    grouped = group_commits(commits)

    parts: list[str] = ["# Release notes\n"]
    parts.extend(_render_section(grouped, use_chinese=False))
    if extra_en:
        parts.extend(extra_en)

    if bilingual:
        parts.append("\n# 更新日志\n")
        parts.extend(_render_section(grouped, use_chinese=True))
        if extra_zh:
            parts.extend(extra_zh)

    return "".join(parts).rstrip() + "\n"


def changes_dict_from_commits(commit_lines: Iterable[str]) -> dict[str, list[str]]:
    """生成 frontend/backend-releases.json 使用的 changes 结构。"""
    commits = [c for line in commit_lines if (c := parse_commit_line(line))]
    grouped = group_commits(commits)
    result: dict[str, list[str]] = {}
    for key, *_ in CATEGORY_DEFS:
        result[key] = [c.raw_subject for c in grouped.get(key) or []]
    return result


def summary_from_changes(changes: dict[str, list[str]]) -> str:
    labels = [
        ("feature", "新功能"),
        ("fix", "修复"),
        ("perf", "性能"),
    ]
    parts = [f"{len(changes[k])} 项{label}" for k, label in labels if changes.get(k)]
    return "、".join(parts) if parts else "版本更新"


def main() -> int:
    if len(sys.argv) < 2:
        print("用法: format_release_notes.py <commits-file> [output-file]", file=sys.stderr)
        return 1

    commits_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None

    with open(commits_path, "r", encoding="utf-8") as f:
        content = format_release_notes(f.readlines())

    if output_path:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)
    else:
        sys.stdout.write(content)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
