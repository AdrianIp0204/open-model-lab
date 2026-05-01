from __future__ import annotations

from dataclasses import dataclass, field
import json
import os
import re
from typing import Any, Iterable, Protocol
from urllib.error import HTTPError, URLError
from urllib.request import ProxyHandler, Request, build_opener

try:
    from .common import load_glossary, sha256_json
except ImportError:  # pragma: no cover - script execution path
    from common import load_glossary, sha256_json


PROVIDER_ENV = "OPEN_MODEL_LAB_I18N_PROVIDER"

OLLAMA_BASE_URL_ENV = "OPEN_MODEL_LAB_I18N_OLLAMA_BASE_URL"
OLLAMA_MODEL_ENV = "OPEN_MODEL_LAB_I18N_OLLAMA_MODEL"
OLLAMA_TIMEOUT_MS_ENV = "OPEN_MODEL_LAB_I18N_OLLAMA_TIMEOUT_MS"
OLLAMA_RETRIES_ENV = "OPEN_MODEL_LAB_I18N_OLLAMA_RETRIES"
OLLAMA_TEMPERATURE_ENV = "OPEN_MODEL_LAB_I18N_OLLAMA_TEMPERATURE"

OPENAI_COMPAT_BASE_URL_ENV = "OPEN_MODEL_LAB_I18N_OPENAI_BASE_URL"
OPENAI_COMPAT_MODEL_ENV = "OPEN_MODEL_LAB_I18N_OPENAI_MODEL"
OPENAI_COMPAT_API_KEY_ENV = "OPEN_MODEL_LAB_I18N_OPENAI_API_KEY"
OPENAI_COMPAT_TIMEOUT_MS_ENV = "OPEN_MODEL_LAB_I18N_OPENAI_TIMEOUT_MS"
OPENAI_COMPAT_RETRIES_ENV = "OPEN_MODEL_LAB_I18N_OPENAI_RETRIES"
OPENAI_COMPAT_TEMPERATURE_ENV = "OPEN_MODEL_LAB_I18N_OPENAI_TEMPERATURE"

LEGACY_MODEL_ENV = "OPEN_MODEL_LAB_I18N_MODEL"
LEGACY_BASE_URL_ENV = "OPEN_MODEL_LAB_I18N_BASE_URL"
LEGACY_TIMEOUT_MS_ENV = "OPEN_MODEL_LAB_I18N_TIMEOUT_MS"
LEGACY_RETRIES_ENV = "OPEN_MODEL_LAB_I18N_RETRIES"
LEGACY_TEMPERATURE_ENV = "OPEN_MODEL_LAB_I18N_TEMPERATURE"

DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434/v1"
DEFAULT_OLLAMA_MODEL = "qwen2.5:7b"
DEFAULT_TIMEOUT_MS = 120_000
DEFAULT_RETRIES = 2
DEFAULT_TEMPERATURE = 0.0
ALLOWED_RESPONSE_WRAPPER_KEYS = {"itemId", "itemKind", "sourceTitle", "context"}

LOCALE_LANGUAGE_NAMES = {
    "en": "English",
    "zh-HK": "Traditional Chinese (Hong Kong)",
}


@dataclass(frozen=True)
class TranslationJob:
    locale: str
    item_kind: str
    item_id: str
    source_title: str
    fields: dict[str, str]
    context: dict[str, Any]
    field_hints: dict[str, str] | None = None
    repair_instructions: str | None = None
    required_markers: dict[str, str] | None = None


@dataclass(frozen=True)
class ProviderOptions:
    base_url: str | None = None
    model: str | None = None
    timeout_ms: int | None = None
    retries: int | None = None
    temperature: float | None = None
    api_key: str | None = None


class TranslationProviderError(RuntimeError):
    def __init__(
        self,
        message: str,
        *,
        issue: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.issue = issue
        self.details = details or {}


class TranslationProvider(Protocol):
    kind: str

    def fingerprint(self) -> str:
        ...

    def translate(self, job: TranslationJob) -> dict[str, str]:
        ...

    def ping(self) -> dict[str, Any]:
        ...


def _apply_glossary(text: str, glossary: dict[str, str]) -> str:
    translated = text
    for source, target in sorted(glossary.items(), key=lambda item: len(item[0]), reverse=True):
        if not source or source == target:
            continue

        pattern = (
            re.compile(rf"\b{re.escape(source)}\b")
            if source.isascii() and re.match(r"^[A-Za-z0-9 _-]+$", source)
            else re.compile(re.escape(source))
        )
        translated = pattern.sub(target, translated)
    return translated


def _locale_language_name(locale: str) -> str:
    return LOCALE_LANGUAGE_NAMES.get(locale, locale)


def _is_translategemma_model(model: str | None) -> bool:
    if model is None:
        return False
    normalized = model.strip().lower()
    if not normalized:
        return False
    return normalized.split(":", 1)[0] == "translategemma"


def _normalize_provider_kind(kind: str | None) -> str:
    resolved = (kind or os.environ.get(PROVIDER_ENV) or "ollama").strip().lower()
    if resolved in {"mock", "deterministic"}:
        return "mock"
    if resolved in {"ollama", "real"}:
        return "ollama"
    if resolved in {"openai", "openai-compatible"}:
        return "openai-compatible"
    raise RuntimeError(f"unknown translation provider kind: {resolved}")


def _resolve_text_option(
    explicit: str | None,
    env_names: Iterable[str],
    *,
    default: str | None = None,
) -> str | None:
    if explicit is not None and explicit.strip():
        return explicit.strip()

    for name in env_names:
        value = os.environ.get(name)
        if value is not None and value.strip():
            return value.strip()

    return default


def _resolve_int_option(
    explicit: int | None,
    env_names: Iterable[str],
    *,
    default: int,
) -> int:
    if explicit is not None:
        return explicit

    for name in env_names:
        value = os.environ.get(name)
        if value is None or not value.strip():
            continue
        try:
            return int(value.strip())
        except ValueError as exc:
            raise RuntimeError(f"invalid integer value for {name}: {value}") from exc

    return default


def _resolve_float_option(
    explicit: float | None,
    env_names: Iterable[str],
    *,
    default: float,
) -> float:
    if explicit is not None:
        return explicit

    for name in env_names:
        value = os.environ.get(name)
        if value is None or not value.strip():
            continue
        try:
            return float(value.strip())
        except ValueError as exc:
            raise RuntimeError(f"invalid numeric value for {name}: {value}") from exc

    return default


def _normalize_base_url(base_url: str) -> str:
    normalized = base_url.strip().rstrip("/")
    if normalized.endswith("/v1"):
        return normalized
    return f"{normalized}/v1"


def _read_http_error(exc: HTTPError) -> str:
    try:
        body = exc.read().decode("utf-8", errors="replace").strip()
    except Exception:  # pragma: no cover - defensive fallback
        body = ""

    if not body:
        return f"{exc.code} {exc.reason}"

    try:
        parsed = json.loads(body)
    except json.JSONDecodeError:
        lowered = body.lower()
        if "model" in lowered and ("not found" in lowered or "does not exist" in lowered):
            return f"model unavailable: {body}"
        return f"{exc.code} {exc.reason}: {body}"

    if isinstance(parsed, dict):
        error = parsed.get("error")
        if isinstance(error, dict):
            message = error.get("message")
            if isinstance(message, str) and message.strip():
                lowered = message.lower()
                if "model" in lowered and ("not found" in lowered or "does not exist" in lowered):
                    return f"model unavailable: {message.strip()}"
                return f"{exc.code} {exc.reason}: {message.strip()}"

        for key in ("error", "message", "detail", "description"):
            value = parsed.get(key)
            if isinstance(value, str) and value.strip():
                lowered = value.lower()
                if "model" in lowered and ("not found" in lowered or "does not exist" in lowered):
                    return f"model unavailable: {value.strip()}"
                return f"{exc.code} {exc.reason}: {value.strip()}"

    return f"{exc.code} {exc.reason}: {body}"


def _raise_provider_error(
    message: str,
    *,
    issue: str,
    details: dict[str, Any] | None = None,
) -> None:
    raise TranslationProviderError(message, issue=issue, details=details)


def _find_matching_json_end(text: str, start: int) -> int | None:
    opening = text[start]
    closing = "}" if opening == "{" else "]"
    depth = 0
    in_string = False
    escaped = False

    for index in range(start, len(text)):
        char = text[index]
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue

        if char == '"':
            in_string = True
            continue
        if char == opening:
            depth += 1
            continue
        if char == closing:
            depth -= 1
            if depth == 0:
                return index

    return None


def _iter_json_candidates(text: str) -> Iterable[str]:
    stripped = text.strip()
    if stripped:
        yield stripped

    fence_match = re.search(r"```(?:json)?\s*(.*?)```", text, re.IGNORECASE | re.DOTALL)
    if fence_match:
        fenced = fence_match.group(1).strip()
        if fenced:
            yield fenced

    for start, char in enumerate(text):
        if char not in "{[":
            continue
        end = _find_matching_json_end(text, start)
        if end is None:
            continue
        candidate = text[start : end + 1].strip()
        if candidate:
            yield candidate


def _parse_translation_payload(raw_text: str, expected_fields: Iterable[str]) -> dict[str, str]:
    expected = list(expected_fields)
    expected_set = set(expected)
    last_error: TranslationProviderError | None = None

    for candidate in _iter_json_candidates(raw_text):
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError as exc:
            last_error = TranslationProviderError(
                f"translation provider returned invalid JSON: {exc}",
                issue="invalid-json",
            )
            continue

        if not isinstance(parsed, dict):
            last_error = TranslationProviderError(
                "translation provider returned a non-object payload",
                issue="non-object",
            )
            continue

        outer_keys = set(parsed.keys())
        if isinstance(parsed.get("translations"), dict):
            wrapper_keys = tuple(sorted(key for key in outer_keys if key in ALLOWED_RESPONSE_WRAPPER_KEYS))
            unexpected_outer = sorted(
                key for key in outer_keys if key not in {"translations"} and key not in ALLOWED_RESPONSE_WRAPPER_KEYS
            )
            if unexpected_outer:
                issue = "wrapper-drift" if wrapper_keys else "unexpected-alias"
                last_error = TranslationProviderError(
                    "translation provider returned unexpected field(s): " + ", ".join(unexpected_outer),
                    issue=issue,
                    details={
                        "expectedFields": tuple(expected),
                        "unexpectedFields": tuple(unexpected_outer),
                        "wrapperKeys": wrapper_keys,
                    },
                )
                continue
            parsed = parsed["translations"]

        if not isinstance(parsed, dict):
            last_error = TranslationProviderError(
                "translation provider returned a non-object payload",
                issue="non-object",
            )
            continue

        wrapper_keys = tuple(sorted(key for key in parsed if key in ALLOWED_RESPONSE_WRAPPER_KEYS))
        cleaned = {key: value for key, value in parsed.items() if key not in ALLOWED_RESPONSE_WRAPPER_KEYS}

        unknown_fields = sorted(set(cleaned.keys()) - expected_set)
        if unknown_fields:
            issue = "wrapper-drift" if wrapper_keys else "unexpected-alias"
            last_error = TranslationProviderError(
                "translation provider returned unexpected field(s): " + ", ".join(unknown_fields),
                issue=issue,
                details={
                    "expectedFields": tuple(expected),
                    "unexpectedFields": tuple(unknown_fields),
                    "wrapperKeys": wrapper_keys,
                },
            )
            continue

        missing_fields = [field for field in expected if not isinstance(cleaned.get(field), str)]
        if missing_fields:
            last_error = TranslationProviderError(
                "translation provider omitted field(s): " + ", ".join(sorted(missing_fields)),
                issue="missing-alias",
                details={
                    "expectedFields": tuple(expected),
                    "missingFields": tuple(sorted(missing_fields)),
                    "wrapperKeys": wrapper_keys,
                },
            )
            continue

        return {field: cleaned[field] for field in expected}

    if last_error is None:
        last_error = TranslationProviderError(
            "translation provider returned invalid JSON: no JSON object found",
            issue="invalid-json",
        )

    raise TranslationProviderError(
        f"translation provider returned invalid JSON: {last_error}",
        issue=last_error.issue,
        details=last_error.details,
    ) from last_error


def _build_request_messages(
    *,
    job: TranslationJob,
    glossary: dict[str, str],
    previous_error: str | None = None,
) -> tuple[str, str]:
    glossary_lines = [f"{source} => {target}" for source, target in sorted(glossary.items())]
    system_lines = [
        "You translate canonical English JSON content into a target locale overlay.",
        "Return a single JSON object only.",
        "Do not wrap the response in markdown or commentary.",
        "Use exactly the provided field aliases from the fields object and nothing else.",
        "Optional wrapper metadata like itemId, itemKind, sourceTitle, and context may appear, but do not invent any other keys.",
        "If you use a nested translations object, it must contain only the provided field aliases.",
        "Translate only the provided user-facing strings.",
        "Preserve placeholders, formulas, code-like tokens, ids, slugs, URLs, and route-like strings exactly.",
        "The source strings may contain compact protected markers like [[M0]], [[P1]], [[I2]], [[R3]], or [[S4]].",
        "Copy every protected marker exactly once. Never translate, drop, duplicate, or invent marker tokens.",
        "Keep the phrasing compact, natural, and pedagogically clear.",
    ]
    if job.required_markers:
        required_marker_list = ", ".join(job.required_markers.keys())
        system_lines.extend(
            [
                f"Required markers for this field: {required_marker_list}.",
                "Each required marker must appear exactly once in the translated value.",
                "Do not wrap required markers inside new $...$, `...`, or {{...}} fragments unless the source field already used that exact wrapped form.",
            ]
        )
    chunk_context = job.context.get("chunk")
    if isinstance(chunk_context, dict) and chunk_context.get("singleField"):
        system_lines.extend(
            [
                "This is a single-field repair job.",
                "Focus on correcting the marker-bearing field itself, not on rewriting the broader concept.",
            ]
        )
    if job.repair_instructions:
        system_lines.extend(
            [
                "Repair instructions for this retry:",
                job.repair_instructions,
            ]
        )
    if previous_error:
        system_lines.extend(
            [
                "The previous response was invalid.",
                f"Validation error: {previous_error}",
                "Return corrected JSON only.",
                "Do not add wrapper metadata, omit aliases, or invent any extra keys.",
            ]
        )
    system_lines.extend(glossary_lines)

    user_payload = {
        "targetLocale": job.locale,
        "itemKind": job.item_kind,
        "itemId": job.item_id,
        "sourceTitle": job.source_title,
        "context": job.context,
        "fields": job.fields,
    }
    if job.field_hints:
        user_payload["fieldHints"] = job.field_hints
    if job.repair_instructions:
        user_payload["repairInstructions"] = job.repair_instructions
    if job.required_markers:
        user_payload["requiredMarkers"] = tuple(job.required_markers.keys())
        user_payload["requiredMarkerMap"] = job.required_markers

    return "\n".join(system_lines), json.dumps(
        user_payload,
        ensure_ascii=False,
        indent=2,
        sort_keys=True,
    )


def _build_translategemma_user_message(*, locale: str, text: str) -> str:
    source_code = "en"
    source_language = _locale_language_name(source_code)
    target_code = locale
    target_language = _locale_language_name(locale)
    return (
        f"You are a professional {source_language} ({source_code}) to "
        f"{target_language} ({target_code}) translator. Your goal is to accurately "
        f"convey the meaning and nuances of the original {source_language} text while "
        f"adhering to {target_language} grammar, vocabulary, and cultural sensitivities.\n"
        f"Produce only the {target_language} translation, without any additional "
        f"explanations or commentary. Please translate the following {source_language} "
        f"text into {target_language}:\n\n\n{text}"
    )


def _request_json(
    *,
    base_url: str,
    path: str,
    method: str,
    timeout_ms: int,
    body: dict[str, Any] | None = None,
    api_key: str | None = None,
) -> Any:
    headers = {"Content-Type": "application/json"} if body is not None else {}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    request = Request(
        url=f"{base_url.rstrip('/')}{path}",
        data=json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None,
        headers=headers,
        method=method,
    )

    try:
        opener = build_opener(ProxyHandler({}))
        with opener.open(request, timeout=max(timeout_ms, 1) / 1000) as response:
            raw = response.read().decode("utf-8")
    except HTTPError as exc:
        raise TranslationProviderError(
            f"translation provider HTTP error: {_read_http_error(exc)}",
            issue="http-error",
        ) from exc
    except URLError as exc:
        raise TranslationProviderError(
            "translation provider connection error: "
            f"{exc.reason}. Start Ollama with `ollama serve` and confirm the base URL.",
            issue="connection-error",
        ) from exc

    if not raw.strip():
        raise TranslationProviderError("translation provider returned an empty response", issue="empty-response")

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise TranslationProviderError(
            f"translation provider returned invalid JSON envelope: {exc}",
            issue="invalid-json-envelope",
        ) from exc


def _extract_message_content(payload: dict[str, Any]) -> str:
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        raise TranslationProviderError(
            "translation provider response did not include any choices",
            issue="invalid-response",
        )

    first_choice = choices[0]
    if not isinstance(first_choice, dict):
        raise TranslationProviderError(
            "translation provider response choice was not an object",
            issue="invalid-response",
        )

    message = first_choice.get("message")
    if not isinstance(message, dict):
        raise TranslationProviderError(
            "translation provider response message was not an object",
            issue="invalid-response",
        )

    content = message.get("content")
    if not isinstance(content, str) or not content.strip():
        raise TranslationProviderError(
            "translation provider response content was empty",
            issue="invalid-response",
        )
    return content


class _ChatCompletionProviderMixin:
    locale: str
    api_key: str
    model: str
    base_url: str
    timeout_ms: int
    retries: int
    temperature: float
    glossary: dict[str, str]
    kind: str

    @property
    def requires_single_field_requests(self) -> bool:
        return _is_translategemma_model(self.model)

    def fingerprint(self) -> str:
        return sha256_json(
            {
                "kind": self.kind,
                "locale": self.locale,
                "base_url": self.base_url,
                "model": self.model,
                "timeout_ms": self.timeout_ms,
                "retries": self.retries,
                "temperature": self.temperature,
                "glossary": self.glossary,
            }
        )

    def _before_translate(self) -> None:
        return None

    def _chat_completion(self, job: TranslationJob, previous_error: str | None = None) -> str:
        if self.requires_single_field_requests:
            if len(job.fields) != 1:
                raise TranslationProviderError(
                    "translategemma requires single-field translation requests",
                    issue="invalid-request",
                    details={"fieldCount": len(job.fields)},
                )
            _, field_text = next(iter(job.fields.items()))
            messages = [
                {
                    "role": "user",
                    "content": _build_translategemma_user_message(
                        locale=job.locale,
                        text=field_text,
                    ),
                }
            ]
            body = {
                "model": self.model,
                "temperature": self.temperature,
                "stream": False,
                "messages": messages,
            }
        else:
            system, user = _build_request_messages(
                job=job,
                glossary=self.glossary,
                previous_error=previous_error,
            )
            body = {
                "model": self.model,
                "temperature": self.temperature,
                "stream": False,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
            }
        payload = _request_json(
            base_url=self.base_url,
            path="/chat/completions",
            method="POST",
            timeout_ms=self.timeout_ms,
            api_key=self.api_key,
            body=body,
        )
        if not isinstance(payload, dict):
            raise TranslationProviderError(
                "translation provider returned a non-object response envelope",
                issue="invalid-response",
            )
        error_payload = payload.get("error")
        if isinstance(error_payload, str) and error_payload.strip():
            raise TranslationProviderError(
                f"translation provider returned an error payload: {error_payload}",
                issue="provider-error",
            )
        return _extract_message_content(payload)

    def translate(self, job: TranslationJob) -> dict[str, str]:
        self._before_translate()
        attempts = max(self.retries, 0) + 1
        last_error: TranslationProviderError | None = None

        for attempt in range(attempts):
            try:
                content = self._chat_completion(job, previous_error=str(last_error) if attempt and last_error else None)
                if self.requires_single_field_requests:
                    alias, _ = next(iter(job.fields.items()))
                    return {alias: content.strip()}
                return _parse_translation_payload(content, job.fields.keys())
            except TranslationProviderError as exc:
                last_error = exc
                if attempt >= attempts - 1:
                    raise TranslationProviderError(
                        f"{self.kind} translation provider failed after {attempts} attempt(s): {last_error}",
                        issue=last_error.issue,
                        details=last_error.details,
                    ) from exc

        raise TranslationProviderError(
            f"{self.kind} translation provider failed: {last_error}",
            issue=last_error.issue if last_error else "provider-error",
            details=last_error.details if last_error else {},
        )

    def ping(self) -> dict[str, Any]:
        probe = self.translate(
            TranslationJob(
                locale=self.locale,
                item_kind="diagnostic",
                item_id="provider-health-check",
                source_title="Provider health check",
                fields={"probe": "Hello"},
                context={"probe": True},
            )
        )
        return {
            "status": "ok",
            "kind": self.kind,
            "baseUrl": self.base_url,
            "model": self.model,
            "probe": probe["probe"],
        }


@dataclass(frozen=True)
class MockTranslationProvider:
    locale: str
    glossary: dict[str, str]
    kind: str = "mock"

    def fingerprint(self) -> str:
        return sha256_json({"kind": self.kind, "locale": self.locale, "glossary": self.glossary})

    def translate(self, job: TranslationJob) -> dict[str, str]:
        locale_prefix = re.sub(r"[^A-Za-z0-9]+", "", job.locale) or "locale"
        return {
            path: f"[{locale_prefix}] {_apply_glossary(text, self.glossary)}"
            for path, text in job.fields.items()
        }

    def ping(self) -> dict[str, Any]:
        return {"status": "ok", "kind": self.kind, "mode": "mock"}


@dataclass
class OllamaProvider(_ChatCompletionProviderMixin):
    locale: str
    model: str
    base_url: str
    timeout_ms: int
    retries: int
    temperature: float
    glossary: dict[str, str]
    api_key: str = ""
    kind: str = "ollama"
    _available_models_cache: list[str] | None = field(default=None, init=False, repr=False)

    def __post_init__(self) -> None:
        self.base_url = _normalize_base_url(self.base_url)
        self.timeout_ms = max(self.timeout_ms, 1)
        self.retries = max(self.retries, 0)

    def _fetch_available_models(self) -> list[str]:
        payload = _request_json(
            base_url=self.base_url,
            path="/models",
            method="GET",
            timeout_ms=self.timeout_ms,
            api_key=self.api_key,
        )
        candidates: list[str] = []
        if isinstance(payload, dict):
            data = payload.get("data")
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict):
                        for key in ("id", "name", "model"):
                            value = item.get(key)
                            if isinstance(value, str) and value.strip():
                                candidates.append(value.strip())
        if self.model and candidates and self.model not in candidates:
            available = ", ".join(sorted(candidates))
            raise TranslationProviderError(
                f"model unavailable: {self.model} is not installed in local Ollama. Available models: {available}",
                issue="model-unavailable",
            )
        self._available_models_cache = sorted(set(candidates))
        return self._available_models_cache

    def _ensure_model_available(self) -> list[str]:
        if self._available_models_cache is None:
            return self._fetch_available_models()
        return self._available_models_cache

    def _before_translate(self) -> None:
        self._ensure_model_available()

    def ping(self) -> dict[str, Any]:
        available = self._ensure_model_available()
        report = super().ping()
        report["availableModels"] = available
        return report


@dataclass
class OpenAICompatibleProvider(_ChatCompletionProviderMixin):
    locale: str
    model: str
    base_url: str
    timeout_ms: int
    retries: int
    temperature: float
    glossary: dict[str, str]
    api_key: str = ""
    kind: str = "openai-compatible"

    def __post_init__(self) -> None:
        self.base_url = _normalize_base_url(self.base_url)
        self.timeout_ms = max(self.timeout_ms, 1)
        self.retries = max(self.retries, 0)


def select_provider(
    locale: str,
    kind: str | None = None,
    options: ProviderOptions | None = None,
) -> TranslationProvider:
    provider_kind = _normalize_provider_kind(kind)
    glossary = load_glossary(locale)
    options = options or ProviderOptions()

    if provider_kind == "mock":
        return MockTranslationProvider(locale=locale, glossary=glossary)

    if provider_kind == "ollama":
        return OllamaProvider(
            locale=locale,
            base_url=_resolve_text_option(
                options.base_url,
                (OLLAMA_BASE_URL_ENV, LEGACY_BASE_URL_ENV),
                default=DEFAULT_OLLAMA_BASE_URL,
            )
            or DEFAULT_OLLAMA_BASE_URL,
            model=_resolve_text_option(
                options.model,
                (OLLAMA_MODEL_ENV, LEGACY_MODEL_ENV),
                default=DEFAULT_OLLAMA_MODEL,
            )
            or DEFAULT_OLLAMA_MODEL,
            timeout_ms=_resolve_int_option(
                options.timeout_ms,
                (OLLAMA_TIMEOUT_MS_ENV, LEGACY_TIMEOUT_MS_ENV),
                default=DEFAULT_TIMEOUT_MS,
            ),
            retries=_resolve_int_option(
                options.retries,
                (OLLAMA_RETRIES_ENV, LEGACY_RETRIES_ENV),
                default=DEFAULT_RETRIES,
            ),
            temperature=_resolve_float_option(
                options.temperature,
                (OLLAMA_TEMPERATURE_ENV, LEGACY_TEMPERATURE_ENV),
                default=DEFAULT_TEMPERATURE,
            ),
            glossary=glossary,
            api_key=options.api_key or "",
        )

    if provider_kind == "openai-compatible":
        return OpenAICompatibleProvider(
            locale=locale,
            base_url=_resolve_text_option(
                options.base_url,
                (OPENAI_COMPAT_BASE_URL_ENV,),
                default=DEFAULT_OLLAMA_BASE_URL,
            )
            or DEFAULT_OLLAMA_BASE_URL,
            model=_resolve_text_option(
                options.model,
                (OPENAI_COMPAT_MODEL_ENV,),
                default=DEFAULT_OLLAMA_MODEL,
            )
            or DEFAULT_OLLAMA_MODEL,
            timeout_ms=_resolve_int_option(
                options.timeout_ms,
                (OPENAI_COMPAT_TIMEOUT_MS_ENV,),
                default=DEFAULT_TIMEOUT_MS,
            ),
            retries=_resolve_int_option(
                options.retries,
                (OPENAI_COMPAT_RETRIES_ENV,),
                default=DEFAULT_RETRIES,
            ),
            temperature=_resolve_float_option(
                options.temperature,
                (OPENAI_COMPAT_TEMPERATURE_ENV,),
                default=DEFAULT_TEMPERATURE,
            ),
            glossary=glossary,
            api_key=_resolve_text_option(
                options.api_key,
                (OPENAI_COMPAT_API_KEY_ENV,),
                default="",
            )
            or "",
        )

    raise RuntimeError(f"unknown translation provider kind: {provider_kind}")


def ping_provider(
    locale: str,
    kind: str | None = None,
    options: ProviderOptions | None = None,
) -> dict[str, Any]:
    provider = select_provider(locale, kind=kind, options=options)
    return provider.ping()
