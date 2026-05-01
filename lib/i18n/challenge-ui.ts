import type { ConceptChallengeCheck } from "@/lib/content";

type ChallengeUiKey =
  | "checks.compareMode"
  | "checks.compareSetup"
  | "checks.graphActive"
  | "checks.overlayHidden"
  | "checks.overlayVisible"
  | "cues.compareMode"
  | "cues.graphLinked"
  | "cues.guidedStart"
  | "cues.inspectTime"
  | "cues.multipleHints"
  | "cues.singleHint"
  | "styles.condition"
  | "styles.match"
  | "styles.maximize"
  | "styles.minimize"
  | "styles.target"
  | "values.compare.explore"
  | "values.off"
  | "values.on"
  | `checks.timeSource.${"inspect" | "live" | "preview"}`
  | `setup.${"a" | "b"}`
  | `values.time.${"inspect" | "live" | "preview"}`;

type ChallengeUiValues = Record<string, Date | number | string>;

type ChallengeUiTranslator = (key: ChallengeUiKey, values?: ChallengeUiValues) => string;

type ChallengeUiMaps = {
  graphLabels?: Map<string, string>;
  overlayLabels?: Map<string, string>;
};

function getSetupLabel(setup: "a" | "b", t: ChallengeUiTranslator) {
  return t(`setup.${setup}`);
}

export function translateChallengeStyleLabel<T extends ChallengeUiTranslator>(
  style: string,
  t: T,
) {
  switch (style) {
    case "target-setting":
      return t("styles.target");
    case "parameter-match":
      return t("styles.match");
    case "maximize":
      return t("styles.maximize");
    case "minimize":
      return t("styles.minimize");
    case "visible-condition":
      return t("styles.condition");
    default:
      return style;
  }
}

export function translateChallengeCueLabel<T extends ChallengeUiTranslator>(
  label: string,
  t: T,
) {
  if (label === "Compare mode") {
    return t("cues.compareMode");
  }

  if (label === "Inspect time") {
    return t("cues.inspectTime");
  }

  if (label === "Graph-linked") {
    return t("cues.graphLinked");
  }

  if (label === "Guided start") {
    return t("cues.guidedStart");
  }

  const hintMatch = label.match(/^(\d+)\s+hint(?:s)?$/i);
  if (hintMatch) {
    const count = Number(hintMatch[1]);
    return count === 1 ? t("cues.singleHint") : t("cues.multipleHints", { count });
  }

  return label;
}

export function translateChallengeCheckLabel<T extends ChallengeUiTranslator>(
  check: ConceptChallengeCheck,
  t: T,
  maps?: ChallengeUiMaps,
) {
  switch (check.type) {
    case "graph-active": {
      const label = maps?.graphLabels?.get(check.graphId) ?? check.graphId;
      return t("checks.graphActive", { label });
    }
    case "overlay-active": {
      const label = maps?.overlayLabels?.get(check.overlayId) ?? check.overlayId;
      return t(check.value === false ? "checks.overlayHidden" : "checks.overlayVisible", { label });
    }
    case "time-source":
      return t(`checks.timeSource.${check.source}`);
    case "compare-active":
      return check.target
        ? t("checks.compareSetup", { setup: getSetupLabel(check.target, t) })
        : t("checks.compareMode");
    default:
      return check.label;
  }
}

export function translateChallengeCurrentValue<T extends ChallengeUiTranslator>(
  check: ConceptChallengeCheck,
  currentValue: string | undefined,
  t: T,
) {
  if (!currentValue) {
    return currentValue;
  }

  switch (check.type) {
    case "overlay-active":
      return currentValue === "On" ? t("values.on") : currentValue === "Off" ? t("values.off") : currentValue;
    case "time-source":
      return currentValue === "live"
        ? t("values.time.live")
        : currentValue === "inspect"
          ? t("values.time.inspect")
          : currentValue === "preview"
            ? t("values.time.preview")
            : currentValue;
    case "compare-active":
      if (currentValue === "Explore") {
        return t("values.compare.explore");
      }

      if (currentValue === "Setup A") {
        return getSetupLabel("a", t);
      }

      if (currentValue === "Setup B") {
        return getSetupLabel("b", t);
      }

      return currentValue;
    default:
      return currentValue;
  }
}
