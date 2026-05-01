from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


REPO_ROOT = Path(__file__).resolve().parents[2]
CONTENT_ROOT = REPO_ROOT / "content"
CATALOG_ROOT = CONTENT_ROOT / "catalog"
CONCEPTS_ROOT = CONTENT_ROOT / "concepts"
I18N_ROOT = CONTENT_ROOT / "i18n"
NON_TRANSLATABLE_STRING_KEYS = {
    "id",
    "slug",
    "metric",
    "param",
    "setup",
    "presetId",
    "graphId",
    "compareTarget",
    "timeSource",
    "displayUnit",
}

CATALOG_SOURCE_FILE_NAMES = {
    "subjects": "subjects.json",
    "topics": "topics.json",
    "starterTracks": "starter-tracks.json",
    "guidedCollections": "guided-collections.json",
    "recommendedGoalPaths": "recommended-goal-paths.json",
}

CATALOG_OVERLAY_FILE_NAMES = {
    "subjects": "subjects.json",
    "topics": "topics.json",
    "starterTracks": "starterTracks.json",
    "guidedCollections": "guidedCollections.json",
    "recommendedGoalPaths": "recommendedGoalPaths.json",
}

CATALOG_DISPLAY_TITLES = {
    "subjects": "Subjects catalog",
    "topics": "Topics catalog",
    "starterTracks": "Starter tracks catalog",
    "guidedCollections": "Guided collections catalog",
    "recommendedGoalPaths": "Recommended goal paths catalog",
}

KNOWN_CHALLENGE_FIELD_LABELS = {
    "vx": "horizontal velocity",
    "vy": "vertical velocity",
    "x": "horizontal position",
    "y": "vertical position",
    "omega": "angular frequency",
    "componentDifference": "component mismatch",
    "normalizedIntensity": "relative intensity",
    "resultantAmplitude": "resultant amplitude",
    "resultantDisplacement": "instantaneous resultant displacement",
    "centripetalAcceleration": "centripetal acceleration",
    "wavelengthNm": "wavelength",
    "photonEnergyEv": "photon energy",
    "activeVisibleFlag": "visible-spectrum flag",
    "excitationFlag": "excitation mode",
    "fieldX": "horizontal field component",
    "fieldY": "vertical field component",
    "forceX": "horizontal force component",
    "forceY": "vertical force component",
}


@dataclass(frozen=True)
class TranslationTask:
    kind: str
    key: str
    source_title: str
    source_context: dict[str, Any]
    canonical_overlay: dict[str, Any]
    output_path: Path
    source_hash: str
    canonical_path: Path


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(value, ensure_ascii=False, indent=2)}\n", encoding="utf-8")


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def sha256_json(value: Any) -> str:
    return sha256_text(
        json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    )


def load_glossary(locale: str) -> dict[str, str]:
    glossary_path = REPO_ROOT / "tools" / "i18n" / "glossaries" / f"{locale}.json"
    if not glossary_path.exists():
        return {}

    payload = read_json(glossary_path)
    replacements = payload.get("replacements", {})
    if not isinstance(replacements, dict):
        return {}
    return {str(key): str(value) for key, value in replacements.items()}


def get_locale_root(locale: str, overlay_root: Path | None = None) -> Path:
    base_root = overlay_root.resolve() if overlay_root is not None else I18N_ROOT
    return base_root / locale


def get_manifest_path(locale: str, overlay_root: Path | None = None) -> Path:
    return get_locale_root(locale, overlay_root) / "manifest.json"


def get_memory_path(locale: str, overlay_root: Path | None = None) -> Path:
    return get_locale_root(locale, overlay_root) / ".translation-memory.json"


def load_manifest(locale: str, overlay_root: Path | None = None) -> dict[str, Any]:
    path = get_manifest_path(locale, overlay_root)
    if not path.exists():
        return {
            "version": 1,
            "locale": locale,
            "createdAt": None,
            "updatedAt": None,
            "entries": {},
        }
    return read_json(path)


def save_manifest(locale: str, manifest: dict[str, Any], overlay_root: Path | None = None) -> None:
    write_json(get_manifest_path(locale, overlay_root), manifest)


def load_memory(locale: str, overlay_root: Path | None = None) -> dict[str, Any]:
    path = get_memory_path(locale, overlay_root)
    if not path.exists():
        return {"version": 1, "locale": locale, "entries": {}}
    payload = read_json(path)
    if not isinstance(payload, dict):
        return {"version": 1, "locale": locale, "entries": {}}
    entries = payload.get("entries", {})
    if not isinstance(entries, dict):
        entries = {}
    return {
        "version": int(payload.get("version", 1)),
        "locale": str(payload.get("locale", locale)),
        "entries": entries,
    }


def save_memory(locale: str, memory: dict[str, Any], overlay_root: Path | None = None) -> None:
    write_json(get_memory_path(locale, overlay_root), memory)


def encode_translation_path(path: tuple[str, ...]) -> str:
    return json.dumps(list(path), ensure_ascii=False, separators=(",", ":"))


def decode_translation_path(value: str) -> tuple[str, ...]:
    decoded = json.loads(value)
    if not isinstance(decoded, list) or not all(isinstance(item, str) for item in decoded):
        raise ValueError(f"invalid encoded translation path: {value}")
    return tuple(decoded)


def _format_challenge_number(value: float) -> str:
    abs_value = abs(value)
    digits = 0 if abs_value >= 100 else 1 if abs_value >= 10 else 2 if abs_value >= 1 else 3 if abs_value >= 0.1 else 4
    return f"{value:.{digits}f}".rstrip("0").rstrip(".")


def _format_challenge_bound(value: float, unit: str | None = None) -> str:
    formatted = _format_challenge_number(value)
    return f"{formatted} {unit}" if unit else formatted


def _format_challenge_range(
    minimum: float | None,
    maximum: float | None,
    unit: str | None = None,
) -> str:
    if minimum is not None and maximum is not None:
        return (
            f"between {_format_challenge_bound(minimum, unit)} "
            f"and {_format_challenge_bound(maximum, unit)}"
        )
    if minimum is not None:
        return f"at least {_format_challenge_bound(minimum, unit)}"
    return f"at most {_format_challenge_bound(maximum or 0, unit)}"


def _humanize_challenge_field(value: str) -> str:
    if value in KNOWN_CHALLENGE_FIELD_LABELS:
        return KNOWN_CHALLENGE_FIELD_LABELS[value]

    return value.replace("-", " ").replace("_", " ").strip().lower()


def _build_challenge_target_label(target: dict[str, Any]) -> str:
    if target.get("label"):
        return str(target["label"])

    subject = _humanize_challenge_field(
        str(target.get("metric") or target.get("param") or "target")
    )
    setup_prefix = f"Setup {str(target['setup']).upper()} " if target.get("setup") else ""
    minimum = target.get("min")
    maximum = target.get("max")
    return f"Keep {setup_prefix}{subject} {_format_challenge_range(minimum, maximum, target.get('displayUnit'))}."


def load_concept_catalog() -> list[dict[str, Any]]:
    return read_json(CATALOG_ROOT / "concepts.json")


def load_catalog_file(kind: str) -> list[dict[str, Any]]:
    file_name = CATALOG_SOURCE_FILE_NAMES[kind]
    return read_json(CATALOG_ROOT / file_name)


def get_catalog_entry_map() -> dict[str, dict[str, Any]]:
    return {entry["slug"]: entry for entry in load_concept_catalog()}


def load_concept_content(slug: str, concept_entry_map: dict[str, dict[str, Any]] | None = None) -> dict[str, Any]:
    concept_entry_map = concept_entry_map or get_catalog_entry_map()
    concept_entry = concept_entry_map[slug]
    content_file = concept_entry["contentFile"]
    return read_json(CONCEPTS_ROOT / f"{content_file}.json")


def build_concept_overlay_source(
    concept_metadata: dict[str, Any], concept_content: dict[str, Any]
) -> dict[str, Any]:
    overlay: dict[str, Any] = {}

    for key in ("title", "shortTitle", "summary", "highlights", "topic", "subtopic"):
        value = concept_metadata.get(key)
        if value:
            overlay[key] = value

    if concept_metadata.get("recommendedNext"):
        overlay["recommendedNext"] = [
            {
                "slug": item["slug"],
                **({"reasonLabel": item["reasonLabel"]} if item.get("reasonLabel") else {}),
            }
            for item in concept_metadata["recommendedNext"]
        ]

    sections: dict[str, Any] = {}

    explanation = concept_content.get("sections", {}).get("explanation")
    if explanation:
        sections["explanation"] = {
            "paragraphs": explanation.get("paragraphs", []),
        }

    key_ideas = concept_content.get("sections", {}).get("keyIdeas")
    if key_ideas:
        sections["keyIdeas"] = key_ideas

    common_misconception = concept_content.get("sections", {}).get("commonMisconception")
    if common_misconception:
        sections["commonMisconception"] = {
            "myth": common_misconception.get("myth", ""),
            "correction": common_misconception.get("correction", []),
        }

    worked_examples = concept_content.get("sections", {}).get("workedExamples")
    if worked_examples:
        sections["workedExamples"] = {
            "title": worked_examples.get("title", ""),
            "intro": worked_examples.get("intro", ""),
            "items": [
                {
                    "id": item["id"],
                    **({"title": item["title"]} if item.get("title") else {}),
                    **({"prompt": item["prompt"]} if item.get("prompt") else {}),
                    **(
                        {
                            "variables": [
                                {
                                    "id": variable["id"],
                                    **({"label": variable["label"]} if variable.get("label") else {}),
                                }
                                for variable in item.get("variables", [])
                            ]
                        }
                        if item.get("variables")
                        else {}
                    ),
                    **(
                        {
                            "steps": [
                                {
                                    "id": step["id"],
                                    **({"label": step["label"]} if step.get("label") else {}),
                                }
                                for step in item.get("steps", [])
                            ]
                        }
                        if item.get("steps")
                        else {}
                    ),
                    **({"resultLabel": item["resultLabel"]} if item.get("resultLabel") else {}),
                    **(
                        {
                            "applyAction": {
                                "label": item["applyAction"].get("label", ""),
                                **(
                                    {"observationHint": item["applyAction"]["observationHint"]}
                                    if item["applyAction"].get("observationHint")
                                    else {}
                                ),
                            }
                        }
                        if item.get("applyAction")
                        else {}
                    ),
                }
                for item in worked_examples.get("items", [])
            ],
        }

    mini_challenge = concept_content.get("sections", {}).get("miniChallenge")
    if mini_challenge:
        sections["miniChallenge"] = {
            key: mini_challenge[key]
            for key in ("prompt", "prediction", "answer", "explanation")
            if mini_challenge.get(key)
        }

    if sections:
        overlay["sections"] = sections

    quick_test = concept_content.get("quickTest")
    if quick_test:
        overlay["quickTest"] = {
            **({"title": quick_test["title"]} if quick_test.get("title") else {}),
            **({"intro": quick_test["intro"]} if quick_test.get("intro") else {}),
            "questions": [
                {
                    "id": question["id"],
                    **({"prompt": question["prompt"]} if question.get("prompt") else {}),
                    **(
                        {"choices": [{"id": choice["id"], "label": choice["label"]} for choice in question["choices"]]}
                        if question.get("choices")
                        else {}
                    ),
                    **({"explanation": question["explanation"]} if question.get("explanation") else {}),
                    **(
                        {"selectedWrongExplanations": question["selectedWrongExplanations"]}
                        if question.get("selectedWrongExplanations")
                        else {}
                    ),
                    **(
                        {
                            "showMeAction": {
                                "label": question["showMeAction"].get("label", ""),
                                **(
                                    {"observationHint": question["showMeAction"]["observationHint"]}
                                    if question["showMeAction"].get("observationHint")
                                    else {}
                                ),
                            }
                        }
                        if question.get("showMeAction")
                        else {}
                    ),
                }
                for question in quick_test.get("questions", [])
            ],
        }

    accessibility = concept_content.get("accessibility")
    if accessibility:
        overlay["accessibility"] = {
            "simulationDescription": {
                "paragraphs": accessibility.get("simulationDescription", {}).get("paragraphs", [])
            },
            "graphSummary": {
                "paragraphs": accessibility.get("graphSummary", {}).get("paragraphs", [])
            },
        }

    page_framework = concept_content.get("pageFramework")
    if page_framework:
        localized_page_framework: dict[str, Any] = {}

        if page_framework.get("sections"):
            localized_page_framework["sections"] = [
                {
                    "id": section["id"],
                    **({"title": section["title"]} if section.get("title") else {}),
                }
                for section in page_framework["sections"]
            ]

        if page_framework.get("featuredSetups"):
            localized_page_framework["featuredSetups"] = [
                {
                    "id": setup["id"],
                    **({"label": setup["label"]} if setup.get("label") else {}),
                    **({"description": setup["description"]} if setup.get("description") else {}),
                    **(
                        {
                            "setup": {
                                **(
                                    {"note": setup["setup"]["note"]}
                                    if setup.get("setup", {}).get("note")
                                    else {}
                                )
                            }
                        }
                        if setup.get("setup")
                        else {}
                    ),
                }
                for setup in page_framework["featuredSetups"]
            ]

        if localized_page_framework:
            overlay["pageFramework"] = localized_page_framework

    page_intro = concept_content.get("pageIntro")
    if page_intro:
        localized_page_intro: dict[str, Any] = {}
        if page_intro.get("definition"):
            localized_page_intro["definition"] = page_intro["definition"]
        if page_intro.get("whyItMatters"):
            localized_page_intro["whyItMatters"] = page_intro["whyItMatters"]
        if page_intro.get("keyTakeaway"):
            localized_page_intro["keyTakeaway"] = page_intro["keyTakeaway"]
        if localized_page_intro:
            overlay["pageIntro"] = localized_page_intro

    equations = concept_content.get("equations")
    if equations:
        overlay["equations"] = [
            {
                "id": equation["id"],
                **({"label": equation["label"]} if equation.get("label") else {}),
                **({"meaning": equation["meaning"]} if equation.get("meaning") else {}),
                **({"notes": equation["notes"]} if equation.get("notes") else {}),
            }
            for equation in equations
        ]

    variable_links = concept_content.get("variableLinks")
    if variable_links:
        overlay["variableLinks"] = [
            {
                "id": item["id"],
                **({"label": item["label"]} if item.get("label") else {}),
                **({"description": item["description"]} if item.get("description") else {}),
            }
            for item in variable_links
        ]

    simulation = concept_content.get("simulation")
    if simulation:
        localized_simulation: dict[str, Any] = {}

        if simulation.get("controls"):
            localized_simulation["controls"] = [
                {
                    "id": control["id"],
                    **({"label": control["label"]} if control.get("label") else {}),
                    **({"description": control["description"]} if control.get("description") else {}),
                }
                for control in simulation["controls"]
            ]

        if simulation.get("presets"):
            localized_simulation["presets"] = [
                {
                    "id": preset["id"],
                    **({"label": preset["label"]} if preset.get("label") else {}),
                    **({"description": preset["description"]} if preset.get("description") else {}),
                }
                for preset in simulation["presets"]
            ]

        if simulation.get("overlays"):
            localized_simulation["overlays"] = [
                {
                    "id": item["id"],
                    **({"label": item["label"]} if item.get("label") else {}),
                    **(
                        {"shortDescription": item["shortDescription"]}
                        if item.get("shortDescription")
                        else {}
                    ),
                    **({"whatToNotice": item["whatToNotice"]} if item.get("whatToNotice") else {}),
                    **({"whyItMatters": item["whyItMatters"]} if item.get("whyItMatters") else {}),
                }
                for item in simulation["overlays"]
            ]

        if localized_simulation:
            overlay["simulation"] = localized_simulation

    graphs = concept_content.get("graphs")
    if graphs:
        overlay["graphs"] = [
            {
                "id": graph["id"],
                **({"label": graph["label"]} if graph.get("label") else {}),
                **({"xLabel": graph["xLabel"]} if graph.get("xLabel") else {}),
                **({"yLabel": graph["yLabel"]} if graph.get("yLabel") else {}),
                **({"description": graph["description"]} if graph.get("description") else {}),
            }
            for graph in graphs
        ]

    notice_prompts = concept_content.get("noticePrompts")
    if notice_prompts:
        overlay["noticePrompts"] = {
            **({"title": notice_prompts["title"]} if notice_prompts.get("title") else {}),
            **({"intro": notice_prompts["intro"]} if notice_prompts.get("intro") else {}),
            "items": [
                {
                    "id": item["id"],
                    **({"text": item["text"]} if item.get("text") else {}),
                    **({"tryThis": item["tryThis"]} if item.get("tryThis") else {}),
                    **({"whyItMatters": item["whyItMatters"]} if item.get("whyItMatters") else {}),
                }
                for item in notice_prompts.get("items", [])
            ],
        }

    prediction_mode = concept_content.get("predictionMode")
    if prediction_mode:
        overlay["predictionMode"] = {
            **({"title": prediction_mode["title"]} if prediction_mode.get("title") else {}),
            **({"intro": prediction_mode["intro"]} if prediction_mode.get("intro") else {}),
            "items": [
                {
                    "id": item["id"],
                    **({"prompt": item["prompt"]} if item.get("prompt") else {}),
                    **({"scenarioLabel": item["scenarioLabel"]} if item.get("scenarioLabel") else {}),
                    **({"changeLabel": item["changeLabel"]} if item.get("changeLabel") else {}),
                    **(
                        {"choices": [{"id": choice["id"], "label": choice["label"]} for choice in item["choices"]]}
                        if item.get("choices")
                        else {}
                    ),
                    **({"explanation": item["explanation"]} if item.get("explanation") else {}),
                    **({"observationHint": item["observationHint"]} if item.get("observationHint") else {}),
                }
                for item in prediction_mode.get("items", [])
            ],
        }

    challenge_mode = concept_content.get("challengeMode")
    if challenge_mode:
        overlay["challengeMode"] = {
            **({"title": challenge_mode["title"]} if challenge_mode.get("title") else {}),
            **({"intro": challenge_mode["intro"]} if challenge_mode.get("intro") else {}),
            "items": [
                {
                    "id": item["id"],
                    **({"title": item["title"]} if item.get("title") else {}),
                    **({"prompt": item["prompt"]} if item.get("prompt") else {}),
                    **({"successMessage": item["successMessage"]} if item.get("successMessage") else {}),
                    **(
                        {
                            "setup": {
                                **({"note": item["setup"]["note"]} if item.get("setup", {}).get("note") else {}),
                            }
                        }
                        if item.get("setup")
                        else {}
                    ),
                    **({"hints": item["hints"]} if item.get("hints") else {}),
                    **(
                        {
                            "checks": [
                                {
                                    **({"label": check["label"]} if check.get("label") else {}),
                                }
                                for check in item["checks"]
                            ]
                        }
                        if item.get("checks")
                        else {}
                    ),
                    **(
                        {
                            "targets": [
                                {
                                    "label": _build_challenge_target_label(target),
                                }
                                for target in item["targets"]
                            ]
                        }
                        if item.get("targets")
                        else {}
                    ),
                }
                for item in challenge_mode.get("items", [])
            ],
        }

    return overlay


def build_catalog_overlay_source(kind: str, entries: Iterable[dict[str, Any]]) -> dict[str, Any]:
    overlay: dict[str, Any] = {}

    for entry in entries:
        item: dict[str, Any] = {}

        if kind in {"subjects", "topics"}:
            for key in ("title", "description", "introduction"):
                if entry.get(key):
                    item[key] = entry[key]
            if kind == "topics" and entry.get("conceptGroups"):
                item["groups"] = [
                    {
                        "id": group["id"],
                        **({"title": group["title"]} if group.get("title") else {}),
                        **(
                            {"description": group["description"]}
                            if group.get("description")
                            else {}
                        ),
                    }
                    for group in entry["conceptGroups"]
                    if isinstance(group, dict) and group.get("id")
                ]
        elif kind == "starterTracks":
            for key in ("title", "summary", "introduction", "sequenceRationale", "highlights"):
                if entry.get(key):
                    item[key] = entry[key]
            if entry.get("entryDiagnostic"):
                item["entryDiagnostic"] = {
                    **(
                        {"title": entry["entryDiagnostic"]["title"]}
                        if entry["entryDiagnostic"].get("title")
                        else {}
                    ),
                    **(
                        {"summary": entry["entryDiagnostic"]["summary"]}
                        if entry["entryDiagnostic"].get("summary")
                        else {}
                    ),
                    **(
                        {
                            "probes": [
                                {
                                    "id": probe["id"],
                                    **({"title": probe["title"]} if probe.get("title") else {}),
                                    **({"summary": probe["summary"]} if probe.get("summary") else {}),
                                }
                                for probe in entry["entryDiagnostic"].get("probes", [])
                            ]
                        }
                        if entry["entryDiagnostic"].get("probes")
                        else {}
                    ),
                }
            if entry.get("checkpoints"):
                item["checkpoints"] = [
                    {
                        "id": checkpoint["id"],
                        **({"title": checkpoint["title"]} if checkpoint.get("title") else {}),
                        **(
                            {"summary": checkpoint["summary"]}
                            if checkpoint.get("summary")
                            else {}
                        ),
                    }
                    for checkpoint in entry["checkpoints"]
                ]
        elif kind == "guidedCollections":
            for key in (
                "title",
                "summary",
                "introduction",
                "sequenceRationale",
                "educatorNote",
                "highlights",
            ):
                if entry.get(key):
                    item[key] = entry[key]
            if entry.get("entryDiagnostic"):
                item["entryDiagnostic"] = {
                    **(
                        {"title": entry["entryDiagnostic"]["title"]}
                        if entry["entryDiagnostic"].get("title")
                        else {}
                    ),
                    **(
                        {"summary": entry["entryDiagnostic"]["summary"]}
                        if entry["entryDiagnostic"].get("summary")
                        else {}
                    ),
                    **(
                        {
                            "probes": [
                                {
                                    "id": probe["id"],
                                    **({"title": probe["title"]} if probe.get("title") else {}),
                                    **({"summary": probe["summary"]} if probe.get("summary") else {}),
                                }
                                for probe in entry["entryDiagnostic"].get("probes", [])
                            ]
                        }
                        if entry["entryDiagnostic"].get("probes")
                        else {}
                    ),
                }
            if entry.get("steps"):
                item["steps"] = [
                    {
                        "id": step["id"],
                        **({"title": step["title"]} if step.get("title") else {}),
                        **({"summary": step["summary"]} if step.get("summary") else {}),
                        **({"purpose": step["purpose"]} if step.get("purpose") else {}),
                        **({"actionLabel": step["actionLabel"]} if step.get("actionLabel") else {}),
                    }
                    for step in entry["steps"]
                ]
        elif kind == "recommendedGoalPaths":
            for key in (
                "title",
                "summary",
                "objective",
                "sequenceRationale",
                "educatorNote",
                "highlights",
            ):
                if entry.get(key):
                    item[key] = entry[key]
            if entry.get("steps"):
                item["steps"] = [
                    {
                        "id": step["id"],
                        **({"title": step["title"]} if step.get("title") else {}),
                        **({"summary": step["summary"]} if step.get("summary") else {}),
                        **({"purpose": step["purpose"]} if step.get("purpose") else {}),
                    }
                    for step in entry["steps"]
                ]

        if item:
            overlay[entry["slug"]] = item

    return overlay


def prune_identical_overlay(overlay: Any, source: Any) -> Any:
    if isinstance(overlay, list) and isinstance(source, list):
        if overlay == source:
            return None
        pruned_items = []
        source_by_id = {
            item["id"]: item for item in source if isinstance(item, dict) and "id" in item
        }
        for index, item in enumerate(overlay):
            source_item = (
                source_by_id.get(item.get("id"))
                if isinstance(item, dict) and item.get("id") in source_by_id
                else source[index] if index < len(source) else None
            )
            pruned_item = prune_identical_overlay(item, source_item)
            if pruned_item not in (None, {}, []):
                pruned_items.append(pruned_item)
        return pruned_items or None

    if isinstance(overlay, dict) and isinstance(source, dict):
        pruned: dict[str, Any] = {}
        for key, value in overlay.items():
            source_value = source.get(key)
            if key in {"id", "slug"} and value == source_value:
                pruned[key] = value
                continue
            pruned_value = prune_identical_overlay(value, source_value)
            if pruned_value not in (None, {}, []):
                pruned[key] = pruned_value
        return pruned or None

    return None if overlay == source else overlay


def iter_translatable_strings(value: Any, path: tuple[str, ...] = ()) -> Iterable[tuple[tuple[str, ...], str]]:
    if isinstance(value, str):
        yield path, value
        return

    if isinstance(value, list):
        for index, item in enumerate(value):
            if isinstance(item, dict) and "id" in item:
                next_path = path + (f"id:{item['id']}",)
            else:
                next_path = path + (str(index),)
            yield from iter_translatable_strings(item, next_path)
        return

    if isinstance(value, dict):
        for key, item in value.items():
            if key in NON_TRANSLATABLE_STRING_KEYS:
                continue
            yield from iter_translatable_strings(item, path + (key,))


def apply_translations(value: Any, translations: dict[tuple[str, ...], str], path: tuple[str, ...] = ()) -> Any:
    if isinstance(value, str):
        return translations.get(path, value)

    if isinstance(value, list):
        translated_items = []
        for index, item in enumerate(value):
            next_path = (
                path + (f"id:{item['id']}",)
                if isinstance(item, dict) and "id" in item
                else path + (str(index),)
            )
            translated_items.append(apply_translations(item, translations, next_path))
        return translated_items

    if isinstance(value, dict):
        return {
            key: apply_translations(item, translations, path + (key,))
            for key, item in value.items()
        }

    return value


def resolve_translation_tasks(
    source: Path,
    locale: str,
    concept_slugs: list[str] | None = None,
    overlay_root: Path | None = None,
) -> list[TranslationTask]:
    concept_entry_map = get_catalog_entry_map()
    tasks: list[TranslationTask] = []
    concept_slugs = concept_slugs or []
    locale_root = get_locale_root(locale, overlay_root).resolve()

    if source.resolve() == CONTENT_ROOT.resolve():
        tasks.extend(resolve_translation_tasks(CONCEPTS_ROOT, locale, concept_slugs, locale_root.parent))
        tasks.extend(resolve_translation_tasks(CATALOG_ROOT, locale, overlay_root=locale_root.parent))
        return tasks

    if source.resolve() == CONCEPTS_ROOT.resolve():
        selected_slugs = concept_slugs or sorted(concept_entry_map.keys())
        for slug in selected_slugs:
            metadata = concept_entry_map[slug]
            canonical_overlay = build_concept_overlay_source(metadata, load_concept_content(slug, concept_entry_map))
            tasks.append(
                TranslationTask(
                    kind="concept",
                    key=slug,
                    source_title=metadata.get("title") or slug,
                    source_context={
                        "slug": slug,
                        "canonicalTitle": metadata.get("title") or slug,
                        "subject": metadata.get("subject"),
                        "topic": metadata.get("topic"),
                    },
                    canonical_overlay=canonical_overlay,
                    output_path=locale_root / "concepts" / f"{slug}.json",
                    source_hash=sha256_json(canonical_overlay),
                    canonical_path=CONCEPTS_ROOT / f"{metadata['contentFile']}.json",
                )
            )
        return tasks

    if source.resolve() in (CATALOG_ROOT.resolve(),):
        for kind in CATALOG_SOURCE_FILE_NAMES:
            canonical_overlay = build_catalog_overlay_source(kind, load_catalog_file(kind))
            tasks.append(
                TranslationTask(
                    kind="catalog",
                    key=kind,
                    source_title=CATALOG_DISPLAY_TITLES[kind],
                    source_context={
                        "catalogKind": kind,
                        "catalogLabel": CATALOG_DISPLAY_TITLES[kind],
                        "entryCount": len(canonical_overlay),
                    },
                    canonical_overlay=canonical_overlay,
                    output_path=locale_root / "catalog" / CATALOG_OVERLAY_FILE_NAMES[kind],
                    source_hash=sha256_json(canonical_overlay),
                    canonical_path=CATALOG_ROOT / CATALOG_SOURCE_FILE_NAMES[kind],
                )
            )
        return tasks

    if source.parent.resolve() == CONCEPTS_ROOT.resolve():
        slug = source.stem
        metadata = concept_entry_map[slug]
        canonical_overlay = build_concept_overlay_source(metadata, read_json(source))
        return [
            TranslationTask(
                kind="concept",
                key=slug,
                source_title=metadata.get("title") or slug,
                source_context={
                    "slug": slug,
                    "canonicalTitle": metadata.get("title") or slug,
                    "subject": metadata.get("subject"),
                    "topic": metadata.get("topic"),
                },
                canonical_overlay=canonical_overlay,
                output_path=locale_root / "concepts" / f"{slug}.json",
                source_hash=sha256_json(canonical_overlay),
                canonical_path=source,
            )
        ]

    for kind, file_name in CATALOG_SOURCE_FILE_NAMES.items():
        if source.resolve() == (CATALOG_ROOT / file_name).resolve():
            canonical_overlay = build_catalog_overlay_source(kind, read_json(source))
            return [
                TranslationTask(
                    kind="catalog",
                    key=kind,
                    source_title=CATALOG_DISPLAY_TITLES[kind],
                    source_context={
                        "catalogKind": kind,
                        "catalogLabel": CATALOG_DISPLAY_TITLES[kind],
                        "entryCount": len(canonical_overlay),
                    },
                    canonical_overlay=canonical_overlay,
                    output_path=locale_root / "catalog" / CATALOG_OVERLAY_FILE_NAMES[kind],
                    source_hash=sha256_json(canonical_overlay),
                    canonical_path=source,
                )
            ]

    raise ValueError(f"Unsupported source path for translation: {source}")


def merge_overlay(base: Any, override: Any) -> Any:
    if override is None:
        return base

    if isinstance(base, list) and isinstance(override, list):
        if all(isinstance(item, dict) and "id" in item for item in base) and all(
            isinstance(item, dict) and "id" in item for item in override
        ):
            override_by_id = {item["id"]: item for item in override}
            return [
                merge_overlay(item, override_by_id.get(item["id"]))
                for item in base
            ]
        return override

    if isinstance(base, dict) and isinstance(override, dict):
        merged = dict(base)
        for key, value in override.items():
            merged[key] = merge_overlay(base.get(key), value)
        return merged

    return override


def validate_overlay_subset(
    overlay: Any,
    canonical: Any,
    path: tuple[str, ...] = (),
) -> list[str]:
    problems: list[str] = []
    path_label = ".".join(path) if path else "<root>"

    if canonical is None:
        problems.append(f"{path_label}: overlay path does not exist in canonical content")
        return problems

    if isinstance(overlay, dict):
        if not isinstance(canonical, dict):
            problems.append(f"{path_label}: expected {type(canonical).__name__}, found object")
            return problems

        for key, value in overlay.items():
            if key not in canonical:
                child_path = ".".join((*path, key))
                problems.append(f"{child_path}: key is not translatable for this overlay")
                continue
            problems.extend(validate_overlay_subset(value, canonical[key], (*path, key)))
        return problems

    if isinstance(overlay, list):
        if not isinstance(canonical, list):
            problems.append(f"{path_label}: expected {type(canonical).__name__}, found array")
            return problems

        overlay_has_ids = all(isinstance(item, dict) and isinstance(item.get("id"), str) for item in overlay)
        canonical_has_ids = all(
            isinstance(item, dict) and isinstance(item.get("id"), str) for item in canonical
        )
        overlay_has_slugs = all(
            isinstance(item, dict) and isinstance(item.get("slug"), str) for item in overlay
        )
        canonical_has_slugs = all(
            isinstance(item, dict) and isinstance(item.get("slug"), str) for item in canonical
        )

        if overlay_has_ids and canonical_has_ids:
            canonical_by_id = {
                item["id"]: item for item in canonical if isinstance(item, dict) and isinstance(item.get("id"), str)
            }
            for item in overlay:
                item_id = item["id"]
                if item_id not in canonical_by_id:
                    problems.append(f"{path_label}.id:{item_id}: id does not exist in canonical content")
                    continue
                problems.extend(
                    validate_overlay_subset(
                        item,
                        canonical_by_id[item_id],
                        (*path, f"id:{item_id}"),
                    )
                )
            return problems

        if canonical_has_ids and not overlay_has_ids:
            for index, item in enumerate(overlay):
                child_path = ".".join((*path, str(index)))
                if not isinstance(item, dict):
                    problems.append(f"{child_path}: expected object with stable id")
                    continue
                if not isinstance(item.get("id"), str):
                    problems.append(f"{child_path}: missing stable id required for safe overlay merge")
            return problems

        if canonical_has_slugs and overlay_has_slugs:
            canonical_by_slug = {
                item["slug"]: item
                for item in canonical
                if isinstance(item, dict) and isinstance(item.get("slug"), str)
            }
            for item in overlay:
                item_slug = item["slug"]
                if item_slug not in canonical_by_slug:
                    problems.append(f"{path_label}.slug:{item_slug}: slug does not exist in canonical content")
                    continue
                problems.extend(
                    validate_overlay_subset(
                        item,
                        canonical_by_slug[item_slug],
                        (*path, f"slug:{item_slug}"),
                    )
                )
            return problems

        if canonical_has_slugs and not overlay_has_slugs:
            for index, item in enumerate(overlay):
                child_path = ".".join((*path, str(index)))
                if not isinstance(item, dict):
                    problems.append(f"{child_path}: expected object with stable slug")
                    continue
                if not isinstance(item.get("slug"), str):
                    problems.append(f"{child_path}: missing stable slug required for safe overlay merge")
            return problems

        if len(overlay) != len(canonical):
            problems.append(
                f"{path_label}: primitive/string arrays must keep canonical length "
                f"({len(canonical)} expected, {len(overlay)} found)"
            )
            return problems

        for index, value in enumerate(overlay):
            problems.extend(validate_overlay_subset(value, canonical[index], (*path, str(index))))
        return problems

    if isinstance(overlay, str):
        if not isinstance(canonical, str):
            problems.append(f"{path_label}: expected {type(canonical).__name__}, found string")
        return problems

    if type(overlay) is not type(canonical):
        problems.append(
            f"{path_label}: expected {type(canonical).__name__}, found {type(overlay).__name__}"
        )

    return problems
