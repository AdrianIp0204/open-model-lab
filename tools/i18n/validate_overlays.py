from __future__ import annotations

import argparse
import json
from pathlib import Path
import subprocess
import sys
from typing import Any

try:
    from .common import (
        CONTENT_ROOT,
        CATALOG_OVERLAY_FILE_NAMES,
        get_locale_root,
        load_manifest,
        merge_overlay,
        read_json,
        resolve_translation_tasks,
        sha256_json,
        validate_overlay_subset,
    )
except ImportError:  # pragma: no cover - script execution path
    from common import (
        CONTENT_ROOT,
        CATALOG_OVERLAY_FILE_NAMES,
        get_locale_root,
        load_manifest,
        merge_overlay,
        read_json,
        resolve_translation_tasks,
        sha256_json,
        validate_overlay_subset,
    )


def _normalize_argv(argv: list[str] | None = None) -> list[str]:
    normalized = list(sys.argv[1:] if argv is None else argv)
    if normalized[:1] == ["--"]:
        return normalized[1:]
    return normalized


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate locale overlay shards against canonical English content."
    )
    parser.add_argument("--locale", required=True, help="Locale to validate, for example zh-HK.")
    parser.add_argument(
        "--overlay-root",
        default=None,
        help="Overlay root directory. Defaults to content/i18n.",
    )
    return parser.parse_args(_normalize_argv(argv))


def _path_label(path: Path) -> str:
    try:
        return path.resolve().relative_to(CONTENT_ROOT.parent.resolve()).as_posix()
    except ValueError:
        return path.resolve().as_posix()


def _effective_validation_overlay(task) -> dict[str, Any]:
    if task.kind != "concept":
        return task.canonical_overlay

    runtime_overlays = _load_runtime_concept_validation_overlays()
    runtime_overlay = runtime_overlays.get(task.key)
    if isinstance(runtime_overlay, dict):
        return runtime_overlay

    optimized_path = CONTENT_ROOT / "optimized" / "concepts" / f"{task.key}.json"
    if not optimized_path.exists():
        return task.canonical_overlay
    optimized_overlay = read_json(optimized_path)
    return merge_overlay(task.canonical_overlay, optimized_overlay)


_RUNTIME_CONCEPT_VALIDATION_OVERLAYS: dict[str, Any] | None = None


def _load_runtime_concept_validation_overlays() -> dict[str, Any]:
    global _RUNTIME_CONCEPT_VALIDATION_OVERLAYS

    if _RUNTIME_CONCEPT_VALIDATION_OVERLAYS is not None:
        return _RUNTIME_CONCEPT_VALIDATION_OVERLAYS

    repo_root = CONTENT_ROOT.parent
    script = r"""
import fs from "node:fs";
import path from "node:path";
import {
  buildConceptEditorialOverlaySource,
  mergeEditorialValue,
} from "./lib/content/editorial-overlays.mjs";
import { generateContentVariantBundle } from "./scripts/generate-content-variant-bundle.mjs";

const repoRoot = process.cwd();
const contentRoot = path.join(repoRoot, "content");
const catalog = JSON.parse(fs.readFileSync(path.join(contentRoot, "catalog", "concepts.json"), "utf8"));
const { optimizedBundle } = generateContentVariantBundle(repoRoot, { writeFiles: false });
const overlays = {};

for (const metadata of catalog) {
  const canonicalConcept = JSON.parse(
    fs.readFileSync(path.join(contentRoot, "concepts", `${metadata.contentFile}.json`), "utf8"),
  );
  const canonicalOverlay = buildConceptEditorialOverlaySource(metadata, canonicalConcept);
  overlays[metadata.slug] = optimizedBundle[metadata.slug]
    ? mergeEditorialValue(canonicalOverlay, optimizedBundle[metadata.slug])
    : canonicalOverlay;
}

process.stdout.write(JSON.stringify(overlays));
"""

    try:
        result = subprocess.run(
            ["node", "--input-type=module", "-e", script],
            cwd=repo_root,
            check=True,
            capture_output=True,
            text=True,
        )
        parsed = json.loads(result.stdout)
        _RUNTIME_CONCEPT_VALIDATION_OVERLAYS = parsed if isinstance(parsed, dict) else {}
    except Exception:
        _RUNTIME_CONCEPT_VALIDATION_OVERLAYS = {}

    return _RUNTIME_CONCEPT_VALIDATION_OVERLAYS


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    overlay_root = Path(args.overlay_root).resolve() if args.overlay_root else None
    locale_root = get_locale_root(args.locale, overlay_root)
    tasks = resolve_translation_tasks(CONTENT_ROOT, args.locale, overlay_root=locale_root.parent)
    manifest = load_manifest(args.locale, overlay_root)

    problems: list[str] = []
    missing_items: list[str] = []
    stale_items: list[str] = []
    seen_output_files: set[Path] = set()
    task_by_id = {f"{task.kind}:{task.key}": task for task in tasks}

    for task in tasks:
        seen_output_files.add(task.output_path.resolve())
        task_id = f"{task.kind}:{task.key}"

        if not task.output_path.exists():
            missing_items.append(task_id)
            continue

        try:
            overlay = read_json(task.output_path)
        except Exception as exc:
            problems.append(f"{task_id}: invalid JSON in {_path_label(task.output_path)} ({exc})")
            continue

        validation_overlay = _effective_validation_overlay(task)
        problems.extend(validate_overlay_subset(overlay, validation_overlay))

        try:
            merge_overlay(validation_overlay, overlay)
        except Exception as exc:
            problems.append(f"{task_id}: overlay merge failed ({exc})")

        manifest_entry = manifest.get("entries", {}).get(task_id)
        if manifest_entry:
            if manifest_entry.get("sourceHash") != task.source_hash:
                stale_items.append(task_id)
            if manifest_entry.get("outputHash") != sha256_json(overlay):
                problems.append(f"{task_id}: output hash does not match manifest")

    catalog_root = locale_root / "catalog"
    concept_root = locale_root / "concepts"
    allowed_catalog_files = {catalog_root / file_name for file_name in CATALOG_OVERLAY_FILE_NAMES.values()}
    if catalog_root.exists():
        for file_path in sorted(catalog_root.glob("*.json")):
            if file_path.resolve() not in {path.resolve() for path in allowed_catalog_files}:
                problems.append(f"orphaned catalog overlay file: {_path_label(file_path)}")

    if concept_root.exists():
        canonical_concept_files = {
            task.output_path.resolve()
            for task in tasks
            if task.kind == "concept"
        }
        for file_path in sorted(concept_root.glob("*.json")):
            if file_path.resolve() not in canonical_concept_files:
                problems.append(f"orphaned concept overlay file: {_path_label(file_path)}")

    for task_id in manifest.get("entries", {}):
        if task_id not in task_by_id:
            problems.append(f"orphaned manifest entry: {task_id}")

    report = {
        "locale": args.locale,
        "missingItems": missing_items,
        "overlayRoot": _path_label(locale_root),
        "problems": problems,
        "staleItems": stale_items,
        "valid": not problems,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["valid"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
