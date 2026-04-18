from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path


def _run_git(args: list[str]) -> str:
    proc = subprocess.run(["git", *args], check=False, capture_output=True, text=True)
    if proc.returncode != 0:
        return ""
    return proc.stdout.strip()


def _changed_files(base_sha: str, head_sha: str) -> list[str]:
    if base_sha and base_sha != "0000000000000000000000000000000000000000":
        out = _run_git(["diff", "--name-only", f"{base_sha}..{head_sha}"])
        if out:
            return [line for line in out.splitlines() if line.strip()]

    out = _run_git(["diff", "--name-only", "HEAD~1..HEAD"])
    if out:
        return [line for line in out.splitlines() if line.strip()]

    out = _run_git(["ls-files"])
    return [line for line in out.splitlines() if line.strip()]


def _commit_messages(base_sha: str, head_sha: str) -> str:
    if base_sha and base_sha != "0000000000000000000000000000000000000000":
        out = _run_git(["log", "--format=%s", f"{base_sha}..{head_sha}"])
        if out:
            return out
    return _run_git(["log", "-1", "--format=%s"])


def _is_bugfix_context(messages: str, ref_name: str) -> bool:
    hay = f"{messages}\n{ref_name}".lower()
    return bool(re.search(r"\b(fix|bug|bugfix|hotfix|regression)\b", hay))


def _file_contains_markers(path: Path, markers: list[str]) -> bool:
    if not path.exists():
        return False
    text = path.read_text(encoding="utf-8")
    return all(marker in text for marker in markers)


def main() -> int:
    repo = Path.cwd()
    base_sha = os.environ.get("BUGFIX_BASE_SHA", "").strip()
    head_sha = os.environ.get("BUGFIX_HEAD_SHA", "HEAD").strip() or "HEAD"
    ref_name = os.environ.get("GITHUB_REF_NAME", "")

    changed = _changed_files(base_sha, head_sha)
    messages = _commit_messages(base_sha, head_sha)
    bugfix_context = _is_bugfix_context(messages, ref_name)

    changed_tests = [f for f in changed if f.startswith("tests/") and Path(f).name.startswith("test_")]
    changed_installer_code = [f for f in changed if f.startswith("installer/")]

    failures: list[str] = []
    notes: list[str] = []

    lifecycle_file = repo / "tests" / "installer" / "test_installer_lifecycle.py"
    required_lifecycle_tests = [
        "test_fresh_install",
        "test_reinstall_over_existing",
        "test_repair_recovers_missing_core_file",
        "test_uninstall_removes_orphans",
        "test_corrupted_detection_uninstall_entry_only",
        "test_version_upgrade_updates_installed_version",
    ]

    if not lifecycle_file.exists():
        failures.append("Missing tests/installer/test_installer_lifecycle.py")
    else:
        text = lifecycle_file.read_text(encoding="utf-8")
        for name in required_lifecycle_tests:
            if f"def {name}(" not in text:
                failures.append(f"Missing required lifecycle test: {name}")

    if bugfix_context:
        if not changed_tests:
            failures.append("Bugfix context detected but no test files were changed.")
        else:
            marker_ok = False
            expansion_ok = False
            for rel in changed_tests:
                path = repo / rel
                if not path.exists():
                    continue
                content = path.read_text(encoding="utf-8")
                if "FAIL-FIRST" in content:
                    marker_ok = True
                if all(token in content for token in ["EDGE-CASE", "BOUNDARY", "FAILURE-MODE"]):
                    expansion_ok = True

            if not marker_ok:
                failures.append("Bugfix tests must include a FAIL-FIRST marker to prove fail-first workflow.")
            if not expansion_ok:
                failures.append(
                    "Bugfix tests must include EDGE-CASE, BOUNDARY, and FAILURE-MODE markers for coverage expansion."
                )

    if changed_installer_code and not changed_tests:
        failures.append("Installer code changed without corresponding test changes.")

    report = {
        "bugfixContext": bugfix_context,
        "baseSha": base_sha,
        "headSha": head_sha,
        "changedFiles": changed,
        "changedTests": changed_tests,
        "changedInstallerCode": changed_installer_code,
        "failures": failures,
        "notes": notes,
    }

    report_dir = repo / "tests" / "installer" / "reports"
    report_dir.mkdir(parents=True, exist_ok=True)
    report_path = report_dir / "bugfix-policy-report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Wrote policy report: {report_path}")

    if failures:
        for failure in failures:
            print(f"ERROR: {failure}")
        return 1

    print("Bugfix policy validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
