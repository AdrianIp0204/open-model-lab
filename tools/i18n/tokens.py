from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
import re


_TOKEN_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("math", re.compile(r"\$\$.*?\$\$", re.DOTALL)),
    ("math", re.compile(r"\\\(.+?\\\)", re.DOTALL)),
    ("math", re.compile(r"\\\[.+?\\\]", re.DOTALL)),
    ("math", re.compile(r"\$(?!\s)(?:\\.|[^$])+?(?<!\s)\$", re.DOTALL)),
    ("code", re.compile(r"`[^`]+`")),
    ("placeholder", re.compile(r"\{\{[^{}]+\}\}")),
    ("url", re.compile(r"https?://[^\s<>()]+[A-Za-z0-9/_#=&%-]")),
    ("route", re.compile(r"(?<![A-Za-z0-9])/(?:[A-Za-z0-9._~%-]+(?:/[A-Za-z0-9._~%-]+)*)")),
    ("identifier", re.compile(r"(?<![\w/.-])[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+(?=[^\w/.-]|$)")),
)
_STANDALONE_SLUG_PATTERN = re.compile(r"^\s*([A-Za-z0-9]+(?:-[A-Za-z0-9]+){2,})\s*$")
_TOKEN_KIND_PREFIXES = {
    "math": "M",
    "code": "C",
    "placeholder": "P",
    "url": "U",
    "route": "R",
    "identifier": "I",
    "slug": "S",
}
_MARKER_PATTERN = re.compile(r"^\[\[([A-Z])(\d+)\]\]$")
_MARKER_KIND_LABELS = {
    "M": "math",
    "C": "code",
    "P": "placeholder",
    "U": "url",
    "R": "route",
    "I": "identifier",
    "S": "slug",
}


@dataclass(frozen=True)
class ProtectedText:
    masked: str
    replacements: tuple[tuple[str, str], ...]

    def restore(self, text: str | None = None) -> str:
        restored = self.masked if text is None else text
        for placeholder, original in self.replacements:
            restored = restored.replace(placeholder, original)
        return restored

    def required_markers(self) -> tuple[str, ...]:
        return tuple(placeholder for placeholder, _ in self.replacements)

    def required_marker_map(self) -> dict[str, str]:
        return {placeholder: original for placeholder, original in self.replacements}

    def marker_descriptors(self) -> tuple[dict[str, str], ...]:
        descriptors: list[dict[str, str]] = []
        for placeholder, original in self.replacements:
            match = _MARKER_PATTERN.match(placeholder)
            prefix = match.group(1) if match else "?"
            descriptors.append(
                {
                    "kind": _MARKER_KIND_LABELS.get(prefix, "unknown"),
                    "marker": placeholder,
                    "original": original,
                }
            )
        return tuple(descriptors)


def protect_text(text: str) -> ProtectedText:
    masked = text
    replacements: list[tuple[str, str]] = []
    token_index = 0

    for token_kind, pattern in _TOKEN_PATTERNS:
        while True:
            match = pattern.search(masked)
            if not match:
                break
            prefix = _TOKEN_KIND_PREFIXES[token_kind]
            placeholder = f"[[{prefix}{token_index}]]"
            token_index += 1
            replacements.append((placeholder, match.group(0)))
            masked = f"{masked[: match.start()]}{placeholder}{masked[match.end() :]}"

    slug_match = _STANDALONE_SLUG_PATTERN.match(masked)
    if slug_match:
        original = slug_match.group(1)
        placeholder = f"[[{_TOKEN_KIND_PREFIXES['slug']}{token_index}]]"
        replacements.append((placeholder, original))
        masked = masked.replace(original, placeholder, 1)

    return ProtectedText(masked=masked, replacements=tuple(replacements))


def restore_text(masked_text: str, replacements: tuple[tuple[str, str], ...]) -> str:
    restored = masked_text
    for placeholder, original in replacements:
        restored = restored.replace(placeholder, original)
    return restored


def token_sequence(text: str) -> tuple[str, ...]:
    return tuple(original for _, original in protect_text(text).replacements)


def tokens_preserved(source: str, translated: str) -> bool:
    return Counter(token_sequence(source)) == Counter(token_sequence(translated))


def token_mismatch_details(source: str, translated: str) -> dict[str, tuple[str, ...]] | None:
    source_tokens = token_sequence(source)
    translated_tokens = token_sequence(translated)
    if Counter(source_tokens) == Counter(translated_tokens):
        return None

    source_counts = Counter(source_tokens)
    translated_counts = Counter(translated_tokens)
    missing: list[str] = []
    unexpected: list[str] = []

    for token, count in source_counts.items():
        diff = count - translated_counts.get(token, 0)
        if diff > 0:
            missing.extend([token] * diff)

    for token, count in translated_counts.items():
        diff = count - source_counts.get(token, 0)
        if diff > 0:
            unexpected.extend([token] * diff)

    return {
        "sourceTokens": source_tokens,
        "translatedTokens": translated_tokens,
        "missingTokens": tuple(missing),
        "unexpectedTokens": tuple(unexpected),
    }


def format_token_mismatch(source: str, translated: str, *, limit: int = 5) -> str:
    details = token_mismatch_details(source, translated)
    if details is None:
        return "tokens preserved"

    def format_tokens(tokens: tuple[str, ...]) -> str:
        if not tokens:
            return "none"
        visible = ", ".join(repr(token) for token in tokens[:limit])
        if len(tokens) > limit:
            visible += f", ... (+{len(tokens) - limit} more)"
        return visible

    return (
        f"missing: {format_tokens(details['missingTokens'])}; "
        f"unexpected: {format_tokens(details['unexpectedTokens'])}; "
        f"source tokens: {format_tokens(details['sourceTokens'])}; "
        f"translated tokens: {format_tokens(details['translatedTokens'])}"
    )
