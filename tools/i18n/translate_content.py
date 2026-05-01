from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from typing import Any

try:
    from .common import (
        CONTENT_ROOT,
        apply_translations,
        decode_translation_path,
        encode_translation_path,
        get_locale_root,
        iter_translatable_strings,
        load_manifest,
        load_memory,
        prune_identical_overlay,
        read_json,
        resolve_translation_tasks,
        save_manifest,
        save_memory,
        sha256_json,
        write_json,
    )
    from .provider import (
        ProviderOptions,
        TranslationJob,
        TranslationProviderError,
        ping_provider,
        select_provider,
    )
    from .tokens import ProtectedText, format_token_mismatch, protect_text, tokens_preserved
except ImportError:  # pragma: no cover - script execution path
    from common import (
        CONTENT_ROOT,
        apply_translations,
        decode_translation_path,
        encode_translation_path,
        get_locale_root,
        iter_translatable_strings,
        load_manifest,
        load_memory,
        prune_identical_overlay,
        read_json,
        resolve_translation_tasks,
        save_manifest,
        save_memory,
        sha256_json,
        write_json,
    )
    from provider import ProviderOptions, TranslationJob, TranslationProviderError, ping_provider, select_provider
    from tokens import ProtectedText, format_token_mismatch, protect_text, tokens_preserved


DEFAULT_MAX_FIELDS_PER_REQUEST = 24
DEFAULT_MAX_CHARS_PER_REQUEST = 2400
RETRYABLE_PROVIDER_ISSUES = {
    "invalid-json",
    "invalid-json-envelope",
    "invalid-response",
    "missing-alias",
    "non-object",
    "unexpected-alias",
    "wrapper-drift",
}


class ChunkTranslationError(RuntimeError):
    def __init__(
        self,
        *,
        kind: str,
        message: str,
        encoded_paths: tuple[str, ...],
        details: dict[str, Any] | None = None,
        retriable: bool = True,
    ) -> None:
        super().__init__(message)
        self.kind = kind
        self.encoded_paths = encoded_paths
        self.details = details or {}
        self.retriable = retriable


def _format_chunk_paths(paths: list[str], *, limit: int = 4) -> str:
    if not paths:
        return "[]"
    visible = ", ".join(paths[:limit])
    if len(paths) > limit:
        visible += f", ... (+{len(paths) - limit} more)"
    return f"[{visible}]"


def _is_retryable_provider_issue(issue: str | None) -> bool:
    return issue in RETRYABLE_PROVIDER_ISSUES


def _format_chunk_failure_message(
    *,
    task_key: str,
    paths: list[str],
    issue: str,
    strict: bool,
    details: dict[str, Any],
) -> str:
    chunk_label = _format_chunk_paths(paths)
    attempt_label = "repair" if strict else "initial"
    if issue == "missing-alias":
        missing = details.get("missingFields") or details.get("missingAliases") or ()
        missing_text = ", ".join(str(item) for item in missing) if missing else "unknown"
        return f"alias omission for {task_key} chunk {chunk_label} during {attempt_label} attempt: missing {missing_text}"
    if issue == "unexpected-alias":
        unexpected = details.get("unexpectedFields") or details.get("unexpectedAliases") or ()
        unexpected_text = ", ".join(str(item) for item in unexpected) if unexpected else "unknown"
        return (
            f"unexpected alias for {task_key} chunk {chunk_label} during {attempt_label} attempt: "
            f"unexpected {unexpected_text}"
        )
    if issue == "wrapper-drift":
        wrappers = details.get("wrapperKeys") or ()
        wrapper_text = ", ".join(str(item) for item in wrappers) if wrappers else "unknown"
        unexpected = details.get("unexpectedFields") or ()
        unexpected_text = ", ".join(str(item) for item in unexpected) if unexpected else "unknown"
        return (
            f"wrapper drift for {task_key} chunk {chunk_label} during {attempt_label} attempt: "
            f"ignored wrappers {wrapper_text}; unexpected {unexpected_text}"
        )
    if issue == "token-mismatch":
        field_path = details.get("encodedPath") or (paths[0] if paths else "unknown")
        mismatch = details.get("mismatch") or "protected tokens changed"
        return (
            f"token mismatch for {task_key} field {field_path} during {attempt_label} attempt: "
            f"{mismatch}"
        )
    if issue == "single-field-hard-failure":
        field_path = details.get("encodedPath") or (paths[0] if paths else "unknown")
        last_issue = details.get("lastIssue") or "unknown"
        last_error = details.get("lastError") or "unknown error"
        return (
            f"single-field hard failure for {task_key} field {field_path}: "
            f"{last_issue}: {last_error}"
        )
    return f"{issue} for {task_key} chunk {chunk_label} during {attempt_label} attempt"


def _build_repair_instructions(error: ChunkTranslationError | None) -> str | None:
    if error is None:
        return None

    details = error.details or {}
    if error.kind == "missing-alias":
        missing = details.get("missingFields") or details.get("missingAliases") or ()
        missing_text = ", ".join(str(item) for item in missing) if missing else "none"
        return (
            "Return one string value for every requested alias and do not omit any alias. "
            f"The previous response omitted: {missing_text}."
        )

    if error.kind in {"unexpected-alias", "wrapper-drift"}:
        unexpected = details.get("unexpectedFields") or details.get("unexpectedAliases") or ()
        unexpected_text = ", ".join(str(item) for item in unexpected) if unexpected else "none"
        wrapper_keys = details.get("wrapperKeys") or ()
        wrapper_text = ", ".join(str(item) for item in wrapper_keys) if wrapper_keys else "none"
        return (
            "Return only the requested alias keys. Do not add wrapper metadata or invented alias keys. "
            f"Unexpected keys in the previous response: {unexpected_text}. Ignored wrapper keys: {wrapper_text}."
        )

    if error.kind == "token-mismatch":
        encoded_path = details.get("encodedPath") or "unknown"
        mismatch = details.get("mismatch") or "protected markers changed"
        required_markers = details.get("requiredMarkers") or ()
        marker_text = ", ".join(str(item) for item in required_markers) if required_markers else "none"
        return (
            "Copy every protected marker token exactly once in the translated string. "
            f"Do not drop or invent markers for field {encoded_path}. Required markers: {marker_text}. Previous mismatch: {mismatch}."
        )

    if error.kind == "single-field-hard-failure":
        encoded_path = details.get("encodedPath") or "unknown"
        last_issue = details.get("lastIssue") or "unknown"
        return (
            f"This is a final single-field retry for {encoded_path}. "
            f"Correct the previous {last_issue} issue and return valid JSON with the requested alias only."
        )

    provider_error = details.get("providerError")
    if provider_error:
        return f"Correct the previous response issue: {provider_error}."

    return None


def _build_single_field_required_markers(
    chunk_paths: list[str],
    protected_fields: dict[str, ProtectedText],
) -> dict[str, str] | None:
    if len(chunk_paths) != 1:
        return None
    protected = protected_fields.get(chunk_paths[0])
    if protected is None or not protected.replacements:
        return None
    return protected.required_marker_map()


def _build_token_focus_repair_instructions(
    *,
    encoded_path: str,
    protected: ProtectedText,
    previous_error: ChunkTranslationError,
) -> str:
    marker_text = ", ".join(protected.required_markers()) or "none"
    original_text = ", ".join(repr(item["original"]) for item in protected.marker_descriptors()) or "none"
    mismatch = previous_error.details.get("mismatch") or str(previous_error)
    previous_invalid_translation = previous_error.details.get("translatedText") or "none"
    return (
        f"This is a token-focused single-field repair for {encoded_path}. "
        f"Translate only the surrounding prose. Required markers: {marker_text}. "
        f"Those markers restore to: {original_text}. "
        f"The previous invalid translation was: {previous_invalid_translation!r}. "
        "Return a corrected version of that translation rather than a fresh rewrite whenever possible. "
        "Copy every required marker exactly once, keep them as literal standalone substrings, "
        "and do not rename them, wrap them in new math/code/placeholder syntax, or merge them into new structured fragments. "
        "If you cannot localize the surrounding prose cleanly without changing the markers, keep the surrounding English wording instead of inventing new symbol-like text. "
        f"Previous token mismatch: {mismatch}."
    )


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _configure_stdout() -> None:
    reconfigure = getattr(sys.stdout, "reconfigure", None)
    if not callable(reconfigure):
        return
    try:
        reconfigure(encoding="utf-8")
    except Exception:
        return


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate locale overlay shards from canonical English JSON content."
    )
    parser.add_argument(
        "source",
        nargs="?",
        default=str(CONTENT_ROOT),
        help="Canonical English content file or directory. Defaults to the repo content root.",
    )
    parser.add_argument(
        "--locale",
        default=None,
        help="Target locale, for example zh-HK. Required for translation runs and optional for --ping.",
    )
    parser.add_argument(
        "--overlay-root",
        default=None,
        help="Overlay root directory. Defaults to content/i18n.",
    )
    parser.add_argument(
        "--concept",
        action="append",
        dest="concepts",
        default=None,
        help="Translate only the named concept slug. Repeat for batch mode.",
    )
    parser.add_argument(
        "--provider",
        default=None,
        help="Provider kind: mock, ollama, or optional openai-compatible. Defaults to ollama for real runs.",
    )
    parser.add_argument(
        "--base-url",
        default=None,
        help="Provider base URL. For Ollama, defaults to http://127.0.0.1:11434/v1.",
    )
    parser.add_argument(
        "--model",
        default=None,
        help="Model name to use for translation, for example qwen2.5:7b.",
    )
    parser.add_argument(
        "--timeout-ms",
        type=int,
        default=None,
        help="HTTP timeout in milliseconds for provider requests.",
    )
    parser.add_argument(
        "--retries",
        type=int,
        default=None,
        help="Retry count for malformed or incomplete provider responses.",
    )
    parser.add_argument(
        "--temperature",
        type=float,
        default=None,
        help="Sampling temperature for provider requests.",
    )
    parser.add_argument(
        "--max-fields-per-request",
        type=int,
        default=DEFAULT_MAX_FIELDS_PER_REQUEST,
        help=(
            "Maximum number of translatable fields to send in a single provider request. "
            "Use 0 to disable the field-count limit."
        ),
    )
    parser.add_argument(
        "--max-chars-per-request",
        type=int,
        default=DEFAULT_MAX_CHARS_PER_REQUEST,
        help=(
            "Maximum total source-character budget to send in a single provider request. "
            "Use 0 to disable the character-budget limit."
        ),
    )
    parser.add_argument(
        "--ping",
        action="store_true",
        help="Check that the configured provider is reachable and the structured response path works.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Report pending work without writing shards.")
    parser.add_argument(
        "--changed-only",
        action="store_true",
        help="Translate only changed or failed items. This is the default behavior.",
    )
    parser.add_argument(
        "--all",
        dest="changed_only",
        action="store_false",
        help="Translate all selected items, even if the manifest shows them as current.",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume a prior run by retrying failed items and skipping current ones.",
    )
    parser.add_argument("--force", action="store_true", help="Force a retranslation of selected items.")
    parser.set_defaults(changed_only=True)
    return parser.parse_args(argv)


def _provider_options_from_args(args: argparse.Namespace) -> ProviderOptions:
    return ProviderOptions(
        base_url=args.base_url,
        model=args.model,
        timeout_ms=args.timeout_ms,
        retries=args.retries,
        temperature=args.temperature,
    )


def _memory_key(provider_fingerprint: str, source_text: str) -> str:
    return sha256_json({"provider": provider_fingerprint, "source": source_text})


def _path_label(path: Path, repo_root: Path) -> str:
    try:
        return path.resolve().relative_to(repo_root.resolve()).as_posix()
    except ValueError:
        return path.resolve().as_posix()


def _load_translations_from_memory(
    memory: dict[str, Any],
    provider_fingerprint: str,
    raw_fields: dict[str, str],
) -> tuple[dict[str, str], dict[str, str]]:
    restored_fields: dict[str, str] = {}
    pending_fields: dict[str, str] = {}
    entries = memory.get("entries", {})

    for field_path, source_text in raw_fields.items():
        key = _memory_key(provider_fingerprint, source_text)
        cached = entries.get(key)
        if isinstance(cached, dict) and cached.get("source") == source_text and isinstance(
            cached.get("translation"), str
        ):
            restored_fields[field_path] = cached["translation"]
        else:
            pending_fields[field_path] = source_text

    return restored_fields, pending_fields


def _translate_pending_fields(
    *,
    locale: str,
    provider,
    task_kind: str,
    task_key: str,
    task_source_title: str,
    task_source_context: dict[str, Any],
    encoded_pending_fields: dict[str, str],
    protected_fields: dict[str, Any],
    max_fields_per_request: int,
    max_chars_per_request: int,
) -> dict[str, str]:
    translated_fields: dict[str, str] = {}
    if not encoded_pending_fields:
        return translated_fields

    if getattr(provider, "requires_single_field_requests", False):
        max_fields_per_request = 1

    ordered_paths = list(encoded_pending_fields.keys())
    alias_by_path = {path: f"f{index + 1:04d}" for index, path in enumerate(ordered_paths)}
    path_by_alias = {alias: path for path, alias in alias_by_path.items()}
    chunk_paths = _chunk_pending_paths(
        encoded_pending_fields,
        max_fields_per_request=max_fields_per_request,
        max_chars_per_request=max_chars_per_request,
    )

    for chunk_index, paths in enumerate(chunk_paths):
        translated_fields.update(
            _translate_chunk_with_fallback(
                locale=locale,
                provider=provider,
                task_kind=task_kind,
                task_key=task_key,
                task_source_title=task_source_title,
                task_source_context=task_source_context,
                encoded_pending_fields=encoded_pending_fields,
                protected_fields=protected_fields,
                alias_by_path=alias_by_path,
                path_by_alias=path_by_alias,
                chunk_paths=paths,
                chunk_index=chunk_index,
                chunk_total=len(chunk_paths),
                split_depth=0,
            )
        )

    return translated_fields


def _translate_chunk_with_fallback(
    *,
    locale: str,
    provider,
    task_kind: str,
    task_key: str,
    task_source_title: str,
    task_source_context: dict[str, Any],
    encoded_pending_fields: dict[str, str],
    protected_fields: dict[str, Any],
    alias_by_path: dict[str, str],
    path_by_alias: dict[str, str],
    chunk_paths: list[str],
    chunk_index: int,
    chunk_total: int,
    split_depth: int,
) -> dict[str, str]:
    last_error: ChunkTranslationError | None = None
    single_field_required_markers = _build_single_field_required_markers(chunk_paths, protected_fields)
    for strict in (False, True):
        repair_instructions = _build_repair_instructions(last_error) if strict else None
        try:
            return _translate_chunk_once(
                locale=locale,
                provider=provider,
                task_kind=task_kind,
                task_key=task_key,
                task_source_title=task_source_title,
                task_source_context=task_source_context,
                encoded_pending_fields=encoded_pending_fields,
                protected_fields=protected_fields,
                alias_by_path=alias_by_path,
                path_by_alias=path_by_alias,
                chunk_paths=chunk_paths,
                chunk_index=chunk_index,
                chunk_total=chunk_total,
                split_depth=split_depth,
                mode="single-field-repair" if strict and len(chunk_paths) == 1 else ("repair" if strict else "initial"),
                repair_instructions=repair_instructions,
                required_markers=single_field_required_markers if strict else None,
            )
        except ChunkTranslationError as exc:
            last_error = exc
            if not exc.retriable:
                raise
            if len(chunk_paths) == 1 and strict:
                break

    if len(chunk_paths) == 1 and last_error is not None and last_error.kind == "token-mismatch":
        path = chunk_paths[0]
        protected = protected_fields[path]
        token_repair_instructions = _build_token_focus_repair_instructions(
            encoded_path=path,
            protected=protected,
            previous_error=last_error,
        )
        try:
            return _translate_chunk_once(
                locale=locale,
                provider=provider,
                task_kind=task_kind,
                task_key=task_key,
                task_source_title=task_source_title,
                task_source_context=task_source_context,
                encoded_pending_fields=encoded_pending_fields,
                protected_fields=protected_fields,
                alias_by_path=alias_by_path,
                path_by_alias=path_by_alias,
                chunk_paths=chunk_paths,
                chunk_index=chunk_index,
                chunk_total=chunk_total,
                split_depth=split_depth,
                mode="token-focused-single-field-repair",
                repair_instructions=token_repair_instructions,
                required_markers=single_field_required_markers,
            )
        except ChunkTranslationError as exc:
            last_error = exc

    if len(chunk_paths) == 1:
        assert last_error is not None
        path = chunk_paths[0]
        raise ChunkTranslationError(
            kind="single-field-hard-failure",
            message=_format_chunk_failure_message(
                task_key=task_key,
                paths=chunk_paths,
                issue="single-field-hard-failure",
                strict=True,
                details={
                    "encodedPath": path,
                    "lastIssue": last_error.kind,
                    "lastError": str(last_error),
                },
            ),
            encoded_paths=tuple(chunk_paths),
            details={
                "encodedPath": path,
                "lastIssue": last_error.kind,
                "lastError": str(last_error),
                "lastDetails": last_error.details,
            },
            retriable=False,
        ) from last_error

    left_paths, right_paths = _split_chunk_paths(chunk_paths)
    left_result = _translate_chunk_with_fallback(
        locale=locale,
        provider=provider,
        task_kind=task_kind,
        task_key=task_key,
        task_source_title=task_source_title,
        task_source_context=task_source_context,
        encoded_pending_fields=encoded_pending_fields,
        protected_fields=protected_fields,
        alias_by_path=alias_by_path,
        path_by_alias=path_by_alias,
        chunk_paths=left_paths,
        chunk_index=chunk_index,
        chunk_total=chunk_total,
        split_depth=split_depth + 1,
    )
    right_result = _translate_chunk_with_fallback(
        locale=locale,
        provider=provider,
        task_kind=task_kind,
        task_key=task_key,
        task_source_title=task_source_title,
        task_source_context=task_source_context,
        encoded_pending_fields=encoded_pending_fields,
        protected_fields=protected_fields,
        alias_by_path=alias_by_path,
        path_by_alias=path_by_alias,
        chunk_paths=right_paths,
        chunk_index=chunk_index,
        chunk_total=chunk_total,
        split_depth=split_depth + 1,
    )
    merged = dict(left_result)
    merged.update(right_result)
    return merged


def _translate_chunk_once(
    *,
    locale: str,
    provider,
    task_kind: str,
    task_key: str,
    task_source_title: str,
    task_source_context: dict[str, Any],
    encoded_pending_fields: dict[str, str],
    protected_fields: dict[str, Any],
    alias_by_path: dict[str, str],
    path_by_alias: dict[str, str],
    chunk_paths: list[str],
    chunk_index: int,
    chunk_total: int,
    split_depth: int,
    mode: str,
    repair_instructions: str | None,
    required_markers: dict[str, str] | None,
) -> dict[str, str]:
    aliased_fields = {alias_by_path[path]: encoded_pending_fields[path] for path in chunk_paths}
    chunk_char_count = sum(len(encoded_pending_fields[path]) for path in chunk_paths)
    translated_masked: dict[str, str]
    try:
        translated_masked = provider.translate(
            TranslationJob(
                locale=locale,
                item_kind=task_kind,
                item_id=task_key,
                source_title=task_source_title,
                fields=aliased_fields,
                context={
                    **task_source_context,
                    "chunk": {
                        "index": chunk_index + 1,
                        "total": chunk_total,
                        "fieldCount": len(chunk_paths),
                        "charCount": chunk_char_count,
                        "splitDepth": split_depth,
                        "attempt": 1 if mode == "initial" else (3 if mode == "token-focused-single-field-repair" else 2),
                        "mode": mode,
                        "singleField": len(chunk_paths) == 1,
                        "fieldPath": chunk_paths[0] if len(chunk_paths) == 1 else None,
                        "requiredMarkers": tuple(required_markers.keys()) if required_markers else (),
                    },
                },
                repair_instructions=repair_instructions,
                required_markers=required_markers,
                field_hints={alias_by_path[path]: path for path in chunk_paths},
            )
        )
    except TranslationProviderError as exc:
        retriable = _is_retryable_provider_issue(exc.issue)
        raise ChunkTranslationError(
            kind=exc.issue or "provider-error",
            message=_format_chunk_failure_message(
                task_key=task_key,
                paths=chunk_paths,
                issue=exc.issue or "provider-error",
                strict=mode != "initial",
                details=exc.details,
            ),
            encoded_paths=tuple(chunk_paths),
            details={
                "issue": exc.issue,
                "providerError": str(exc),
                "providerDetails": exc.details,
                "mode": mode,
                "splitDepth": split_depth,
            },
            retriable=retriable,
        ) from exc

    translated_fields: dict[str, str] = {}
    for alias, masked_translation in translated_masked.items():
        encoded_path = path_by_alias.get(alias)
        if encoded_path is None or encoded_path not in protected_fields:
            raise ChunkTranslationError(
                kind="unexpected-alias",
                message=_format_chunk_failure_message(
                    task_key=task_key,
                    paths=chunk_paths,
                    issue="unexpected-alias",
                    strict=mode != "initial",
                    details={"unexpectedAliases": (alias,), "expectedAliases": tuple(aliased_fields.keys())},
                ),
                encoded_paths=tuple(chunk_paths),
                details={
                    "unexpectedAliases": (alias,),
                    "expectedAliases": tuple(aliased_fields.keys()),
                    "mode": mode,
                    "splitDepth": split_depth,
                },
                retriable=True,
            )

        protected = protected_fields[encoded_path]
        restored_translation = protected.restore(masked_translation)
        source_text = protected.restore()
        if not tokens_preserved(source_text, restored_translation):
            mismatch = format_token_mismatch(source_text, restored_translation)
            raise ChunkTranslationError(
                kind="token-mismatch",
                message=_format_chunk_failure_message(
                    task_key=task_key,
                    paths=[encoded_path],
                    issue="token-mismatch",
                    strict=mode != "initial",
                    details={
                        "encodedPath": encoded_path,
                        "mismatch": mismatch,
                        "requiredMarkers": tuple(required_markers.keys()) if required_markers else (),
                    },
                ),
                encoded_paths=(encoded_path,),
                details={
                    "encodedPath": encoded_path,
                    "mismatch": mismatch,
                    "requiredMarkers": tuple(required_markers.keys()) if required_markers else (),
                    "sourceText": source_text,
                    "maskedSourceText": protected.masked,
                    "translatedText": restored_translation,
                    "maskedTranslation": masked_translation,
                    "mode": mode,
                    "splitDepth": split_depth,
                },
                retriable=True,
            )
        translated_fields[encoded_path] = restored_translation

    expected_aliases = set(aliased_fields)
    missing_aliases = sorted(expected_aliases - set(translated_masked))
    if missing_aliases:
        raise ChunkTranslationError(
            kind="missing-alias",
            message=_format_chunk_failure_message(
                task_key=task_key,
                paths=chunk_paths,
                issue="missing-alias",
                strict=mode != "initial",
                details={"missingFields": tuple(missing_aliases)},
            ),
            encoded_paths=tuple(chunk_paths),
            details={
                "missingFields": tuple(missing_aliases),
                "expectedAliases": tuple(expected_aliases),
                "mode": mode,
                "splitDepth": split_depth,
            },
            retriable=True,
        )

    return translated_fields


def _chunk_pending_paths(
    encoded_pending_fields: dict[str, str],
    *,
    max_fields_per_request: int,
    max_chars_per_request: int,
) -> list[list[str]]:
    field_limit = max_fields_per_request if max_fields_per_request > 0 else None
    char_limit = max_chars_per_request if max_chars_per_request > 0 else None

    chunks: list[list[str]] = []
    current: list[str] = []
    current_chars = 0

    for encoded_path, masked_text in encoded_pending_fields.items():
        masked_length = len(masked_text)
        should_flush = bool(
            current
            and (
                (field_limit is not None and len(current) >= field_limit)
                or (char_limit is not None and current_chars + masked_length > char_limit)
            )
        )
        if should_flush:
            chunks.append(current)
            current = []
            current_chars = 0

        current.append(encoded_path)
        current_chars += masked_length

    if current:
        chunks.append(current)

    return chunks


def _split_chunk_paths(paths: list[str]) -> tuple[list[str], list[str]]:
    midpoint = max(1, len(paths) // 2)
    return paths[:midpoint], paths[midpoint:]


def _get_output_hash(path: Path) -> str | None:
    if not path.exists():
        return None

    try:
        return sha256_json(read_json(path))
    except Exception:
        return None


def _is_task_current(
    task,
    manifest_entry: dict[str, Any],
    output_exists: bool,
    output_hash: str | None,
) -> bool:
    if not manifest_entry:
        return False

    return (
        output_exists
        and manifest_entry.get("status") == "done"
        and manifest_entry.get("sourceHash") == task.source_hash
        and manifest_entry.get("outputHash") == output_hash
    )


def _is_task_stale(
    task,
    manifest_entry: dict[str, Any],
    output_exists: bool,
    output_hash: str | None,
) -> bool:
    if not manifest_entry:
        return False

    return (
        manifest_entry.get("sourceHash") != task.source_hash
        or (
            manifest_entry.get("status") == "done"
            and (
                not output_exists
                or manifest_entry.get("outputHash") != output_hash
            )
        )
    )


def _task_needs_resume(
    task,
    manifest_entry: dict[str, Any],
    output_exists: bool,
    output_hash: str | None,
) -> bool:
    if not manifest_entry:
        return False

    return not _is_task_current(task, manifest_entry, output_exists, output_hash)


def _selection_reason(
    *,
    args: argparse.Namespace,
    task,
    manifest_entry: dict[str, Any],
    output_exists: bool,
    output_hash: str | None,
) -> tuple[bool, str]:
    if args.force or not args.changed_only:
        return True, "selected-all"

    current_done = _is_task_current(task, manifest_entry, output_exists, output_hash)
    if args.resume:
        if _task_needs_resume(task, manifest_entry, output_exists, output_hash):
            return True, "resume-pending"
        if manifest_entry:
            return False, "resume-current"
        return False, "resume-untracked"

    if current_done:
        return False, "current"

    return True, "changed"


def main(argv: list[str] | None = None) -> int:
    _configure_stdout()
    args = _parse_args(argv)
    options = _provider_options_from_args(args)

    if args.ping:
        locale = args.locale or "zh-HK"
        try:
            report = ping_provider(locale, kind=args.provider, options=options)
            report.update({"locale": locale, "ok": True})
        except Exception as exc:  # pragma: no cover - exercised via CLI tests
            report = {
                "error": str(exc),
                "locale": locale,
                "ok": False,
                "provider": args.provider or "ollama",
            }
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0 if report.get("ok") else 1

    if not args.locale:
        raise SystemExit("--locale is required unless --ping is supplied")

    source = Path(args.source).resolve()
    overlay_root = Path(args.overlay_root).resolve() if args.overlay_root else None
    locale_root = get_locale_root(args.locale, overlay_root)
    manifest = load_manifest(args.locale, overlay_root)
    memory = load_memory(args.locale, overlay_root)
    concepts = args.concepts or None
    tasks = resolve_translation_tasks(source, args.locale, concepts, locale_root.parent)

    report_items: list[dict[str, Any]] = []
    translated_count = 0
    cached_count = 0
    skipped_count = 0
    stale_count = 0
    failed_count = 0
    provider = None
    provider_fingerprint = None

    entries = manifest.setdefault("entries", {})
    if manifest.get("createdAt") is None:
        manifest["createdAt"] = utc_now()
    manifest["updatedAt"] = utc_now()
    memory.setdefault("entries", {})

    for task in tasks:
        task_id = f"{task.kind}:{task.key}"
        manifest_entry = entries.get(task_id, {})
        output_exists = task.output_path.exists()
        output_hash = _get_output_hash(task.output_path)
        is_stale = _is_task_stale(task, manifest_entry, output_exists, output_hash)
        field_pairs = list(iter_translatable_strings(task.canonical_overlay))
        field_count = len(field_pairs)

        should_process, selection_reason = _selection_reason(
            args=args,
            task=task,
            manifest_entry=manifest_entry,
            output_exists=output_exists,
            output_hash=output_hash,
        )

        if not should_process:
            skipped_count += 1
            report_items.append(
                {
                    "fieldCount": field_count,
                    "itemId": task_id,
                    "outputPath": _path_label(task.output_path, CONTENT_ROOT.parent),
                    "reason": selection_reason,
                    "sourcePath": _path_label(task.canonical_path, CONTENT_ROOT.parent),
                    "status": "skipped",
                }
            )
            continue

        if is_stale:
            stale_count += 1

        if args.dry_run:
            report_items.append(
                {
                    "fieldCount": field_count,
                    "itemId": task_id,
                    "outputPath": _path_label(task.output_path, CONTENT_ROOT.parent),
                    "reason": selection_reason,
                    "sourcePath": _path_label(task.canonical_path, CONTENT_ROOT.parent),
                    "status": "planned",
                }
            )
            continue

        try:
            if provider is None:
                provider = select_provider(args.locale, kind=args.provider, options=options)
                provider_fingerprint = provider.fingerprint()

            raw_fields = {encode_translation_path(path): text for path, text in field_pairs}
            protected_fields = {path: protect_text(text) for path, text in raw_fields.items()}
            cached_fields, pending_fields = _load_translations_from_memory(
                memory,
                provider_fingerprint,
                {path: protected.restore() for path, protected in protected_fields.items()},
            )

            translated_fields = dict(cached_fields)
            if pending_fields:
                encoded_pending_fields = {
                    path: protected_fields[path].masked for path in pending_fields
                }
                translated_fields.update(
                    _translate_pending_fields(
                        locale=args.locale,
                        provider=provider,
                        task_kind=task.kind,
                        task_key=task.key,
                        task_source_title=task.source_title,
                        task_source_context={
                            "key": task.key,
                            "kind": task.kind,
                            **task.source_context,
                        },
                        encoded_pending_fields=encoded_pending_fields,
                        protected_fields=protected_fields,
                        max_fields_per_request=args.max_fields_per_request,
                        max_chars_per_request=args.max_chars_per_request,
                    )
                )

            translated_count += 1 if pending_fields else 0
            cached_count += 1 if not pending_fields and translated_fields else 0

            for encoded_path, translation in translated_fields.items():
                memory["entries"][_memory_key(provider_fingerprint, raw_fields[encoded_path])] = {
                    "provider": provider.kind,
                    "source": raw_fields[encoded_path],
                    "translation": translation,
                    "updatedAt": utc_now(),
                }

            translated_overlay = apply_translations(
                task.canonical_overlay,
                {
                    decode_translation_path(path): value
                    for path, value in translated_fields.items()
                },
            )
            overlay = prune_identical_overlay(translated_overlay, task.canonical_overlay) or {}
            write_json(task.output_path, overlay)
            output_hash = sha256_json(overlay)
            entries[task_id] = {
                "attempts": int(manifest_entry.get("attempts", 0)) + 1,
                "fieldCount": field_count,
                "lastError": None,
                "outputHash": output_hash,
                "outputPath": str(task.output_path),
                "provider": provider.kind,
                "sourceHash": task.source_hash,
                "sourcePath": str(task.canonical_path),
                "status": "done",
                "translatedAt": utc_now(),
            }
            report_items.append(
                {
                    "fieldCount": field_count,
                    "itemId": task_id,
                    "outputPath": _path_label(task.output_path, CONTENT_ROOT.parent),
                    "reason": selection_reason,
                    "sourcePath": _path_label(task.canonical_path, CONTENT_ROOT.parent),
                    "status": "translated" if pending_fields else "cached",
                }
            )
        except Exception as exc:  # pragma: no cover - exercised via CLI tests
            failed_count += 1
            entries[task_id] = {
                "attempts": int(manifest_entry.get("attempts", 0)) + 1,
                "fieldCount": field_count,
                "lastError": str(exc),
                "outputHash": None,
                "outputPath": str(task.output_path),
                "provider": provider.kind if provider is not None else args.provider or "ollama",
                "sourceHash": task.source_hash,
                "sourcePath": str(task.canonical_path),
                "status": "failed",
                "translatedAt": None,
            }
            report_items.append(
                {
                    "error": str(exc),
                    "fieldCount": field_count,
                    "itemId": task_id,
                    "outputPath": _path_label(task.output_path, CONTENT_ROOT.parent),
                    "reason": selection_reason,
                    "sourcePath": _path_label(task.canonical_path, CONTENT_ROOT.parent),
                    "status": "failed",
                }
            )

    if not args.dry_run:
        save_manifest(args.locale, manifest, overlay_root)
        save_memory(args.locale, memory, overlay_root)

    report = {
        "cached": cached_count,
        "changedOnly": args.changed_only,
        "dryRun": args.dry_run,
        "failed": failed_count,
        "items": report_items,
        "locale": args.locale,
        "outputRoot": str(locale_root),
        "resume": args.resume,
        "skipped": skipped_count,
        "stale": stale_count,
        "total": len(tasks),
        "translated": translated_count,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if failed_count else 0


if __name__ == "__main__":
    raise SystemExit(main())
