from __future__ import annotations

import argparse
import json
from pathlib import Path

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
    return parser.parse_args(argv)


def _path_label(path: Path) -> str:
    try:
        return path.resolve().relative_to(CONTENT_ROOT.parent.resolve()).as_posix()
    except ValueError:
        return path.resolve().as_posix()


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

        problems.extend(validate_overlay_subset(overlay, task.canonical_overlay))

        try:
            merge_overlay(task.canonical_overlay, overlay)
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
