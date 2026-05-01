function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function withOptional(target, key, value, predicate = Boolean) {
  if (predicate(value)) {
    target[key] = value;
  }

  return target;
}

function getStableArrayKey(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  if (
    value.every((item) => isPlainObject(item) && typeof item.id === "string")
  ) {
    return "id";
  }

  if (
    value.every((item) => isPlainObject(item) && typeof item.slug === "string")
  ) {
    return "slug";
  }

  return null;
}

function sanitizeOverlayAgainstCanonical(overlay, canonical) {
  if (overlay === undefined || overlay === null || canonical === undefined || canonical === null) {
    return undefined;
  }

  if (Array.isArray(canonical)) {
    if (!Array.isArray(overlay)) {
      return undefined;
    }

    const stableKey = getStableArrayKey(canonical);

    if (stableKey) {
      const canonicalByStableKey = new Map(
        canonical.map((item) => [item[stableKey], item]),
      );
      const sanitizedItems = [];

      for (const item of overlay) {
        if (!isPlainObject(item) || typeof item[stableKey] !== "string") {
          continue;
        }

        const canonicalItem = canonicalByStableKey.get(item[stableKey]);

        if (!canonicalItem) {
          continue;
        }

        const sanitizedItem = sanitizeOverlayAgainstCanonical(item, canonicalItem);

        if (sanitizedItem !== undefined) {
          sanitizedItems.push(sanitizedItem);
        }
      }

      return sanitizedItems;
    }

    const canonicalSample =
      canonical.find((item) => item !== undefined) ?? canonical[0];

    if (canonicalSample === undefined) {
      return overlay;
    }

    return overlay
      .map((item) => sanitizeOverlayAgainstCanonical(item, canonicalSample))
      .filter((item) => item !== undefined);
  }

  if (isPlainObject(canonical)) {
    if (!isPlainObject(overlay)) {
      return undefined;
    }

    const sanitized = {};

    for (const [key, canonicalValue] of Object.entries(canonical)) {
      if (key === "id" || key === "slug") {
        if (key in canonical) {
          sanitized[key] = canonicalValue;
        }
        continue;
      }

      if (!(key in overlay)) {
        continue;
      }

      const sanitizedValue = sanitizeOverlayAgainstCanonical(overlay[key], canonicalValue);

      if (sanitizedValue !== undefined) {
        sanitized[key] = sanitizedValue;
      }
    }

    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
  }

  return overlay;
}

function mergeEditorialValue(base, override) {
  if (override === undefined) {
    return base;
  }

  if (Array.isArray(base)) {
    if (!Array.isArray(override)) {
      return base;
    }

    const stableKey = getStableArrayKey(base);

    if (
      stableKey &&
      Array.isArray(override) &&
      override.every((item) => isPlainObject(item) && typeof item[stableKey] === "string")
    ) {
      const overridesByStableKey = new Map(
        override.map((item) => [item[stableKey], item]),
      );

      return base.map((item) => {
        const itemOverride = overridesByStableKey.get(item[stableKey]);
        return mergeEditorialValue(item, itemOverride);
      });
    }

    // Primitive arrays and arrays without stable identity keys are replaced wholesale.
    return override;
  }

  if (isPlainObject(base) && isPlainObject(override)) {
    const merged = { ...base };

    for (const [key, value] of Object.entries(override)) {
      if (key === "id" || key === "slug") {
        merged[key] = base[key];
        continue;
      }

      merged[key] = mergeEditorialValue(base[key], value);
    }

    return merged;
  }

  return override;
}

function collectAllLeafPaths(value, pathSegments = []) {
  if (Array.isArray(value)) {
    const stableKey = getStableArrayKey(value);

    if (stableKey) {
      return value.flatMap((item) =>
        collectAllLeafPaths(item, [...pathSegments, `${stableKey}:${item[stableKey]}`]),
      );
    }

    return value.flatMap((item, index) =>
      collectAllLeafPaths(item, [...pathSegments, String(index)]),
    );
  }

  if (isPlainObject(value)) {
    return Object.entries(value).flatMap(([key, nestedValue]) => {
      if (key === "id" || key === "slug") {
        return [];
      }

      return collectAllLeafPaths(nestedValue, [...pathSegments, key]);
    });
  }

  return pathSegments.length > 0 ? [pathSegments.join(".")] : [];
}

function collectMissingOverlayLeafPaths(canonical, overlay, pathSegments = []) {
  if (overlay === undefined) {
    return collectAllLeafPaths(canonical, pathSegments);
  }

  if (Array.isArray(canonical)) {
    if (!Array.isArray(overlay)) {
      return collectAllLeafPaths(canonical, pathSegments);
    }

    const stableKey = getStableArrayKey(canonical);

    if (!stableKey) {
      return [];
    }

    const overlayByStableKey = new Map(
      overlay
        .filter((item) => isPlainObject(item) && typeof item[stableKey] === "string")
        .map((item) => [item[stableKey], item]),
    );

    return canonical.flatMap((item) =>
      collectMissingOverlayLeafPaths(
        item,
        overlayByStableKey.get(item[stableKey]),
        [...pathSegments, `${stableKey}:${item[stableKey]}`],
      ),
    );
  }

  if (isPlainObject(canonical)) {
    if (!isPlainObject(overlay)) {
      return collectAllLeafPaths(canonical, pathSegments);
    }

    return Object.entries(canonical).flatMap(([key, canonicalValue]) => {
      if (key === "id" || key === "slug") {
        return [];
      }

      return collectMissingOverlayLeafPaths(
        canonicalValue,
        overlay[key],
        [...pathSegments, key],
      );
    });
  }

  return [];
}

function collectIgnoredOverlayPaths(overlay, canonical, pathSegments = []) {
  if (
    overlay === undefined ||
    overlay === null ||
    canonical === undefined ||
    canonical === null
  ) {
    return [];
  }

  if (Array.isArray(overlay) && Array.isArray(canonical)) {
    const stableKey = getStableArrayKey(canonical);

    if (stableKey) {
      const canonicalByStableKey = new Map(
        canonical.map((item) => [item[stableKey], item]),
      );

      return overlay.flatMap((item) => {
        if (!isPlainObject(item) || typeof item[stableKey] !== "string") {
          return [];
        }

        const canonicalItem = canonicalByStableKey.get(item[stableKey]);
        if (!canonicalItem) {
          return [];
        }

        return collectIgnoredOverlayPaths(item, canonicalItem, [
          ...pathSegments,
          `${stableKey}:${item[stableKey]}`,
        ]);
      });
    }

    const canonicalSample =
      canonical.find((item) => item !== undefined) ?? canonical[0];

    if (canonicalSample === undefined) {
      return [];
    }

    return overlay.flatMap((item, index) =>
      collectIgnoredOverlayPaths(item, canonicalSample, [...pathSegments, String(index)]),
    );
  }

  if (isPlainObject(overlay) && isPlainObject(canonical)) {
    return Object.entries(overlay).flatMap(([key, value]) => {
      const childPath = [...pathSegments, key];

      if (!(key in canonical)) {
        return [childPath.join(".")];
      }

      return collectIgnoredOverlayPaths(value, canonical[key], childPath);
    });
  }

  return [];
}

function buildConceptEditorialOverlaySource(conceptMetadata, conceptContent) {
  // Only user-facing editorial copy belongs in overlay sources. Structural identity, simulation
  // config, formulas/tokens, URLs, and other non-editorial fields stay canonical and are stripped
  // from optimized/localized overlays during sanitization.
  const overlay = {};

  for (const key of ["title", "shortTitle", "summary", "highlights", "topic", "subtopic"]) {
    if (conceptMetadata?.[key]) {
      overlay[key] = conceptMetadata[key];
    }
  }

  if (Array.isArray(conceptMetadata?.recommendedNext) && conceptMetadata.recommendedNext.length > 0) {
    overlay.recommendedNext = conceptMetadata.recommendedNext.map((item) =>
      withOptional({ slug: item.slug }, "reasonLabel", item.reasonLabel),
    );
  }

  const sections = {};
  const explanation = conceptContent?.sections?.explanation;
  if (explanation) {
    sections.explanation = {
      paragraphs: explanation.paragraphs ?? [],
    };
  }

  if (Array.isArray(conceptContent?.sections?.keyIdeas) && conceptContent.sections.keyIdeas.length > 0) {
    sections.keyIdeas = conceptContent.sections.keyIdeas;
  }

  const misconception = conceptContent?.sections?.commonMisconception;
  if (misconception) {
    sections.commonMisconception = {
      myth: misconception.myth ?? "",
      correction: misconception.correction ?? [],
    };
  }

  const workedExamples = conceptContent?.sections?.workedExamples;
  if (workedExamples) {
    sections.workedExamples = {
      title: workedExamples.title ?? "",
      intro: workedExamples.intro ?? "",
      items: (workedExamples.items ?? []).map((item) => {
        const localizedItem = { id: item.id };
        withOptional(localizedItem, "title", item.title);
        withOptional(localizedItem, "prompt", item.prompt);

        if (Array.isArray(item.variables) && item.variables.length > 0) {
          localizedItem.variables = item.variables.map((variable) => {
            const localizedVariable = { id: variable.id };
            withOptional(localizedVariable, "label", variable.label);
            return localizedVariable;
          });
        }

        if (Array.isArray(item.steps) && item.steps.length > 0) {
          localizedItem.steps = item.steps.map((step) => {
            const localizedStep = { id: step.id };
            withOptional(localizedStep, "label", step.label);
            return localizedStep;
          });
        }

        withOptional(localizedItem, "resultLabel", item.resultLabel);
        withOptional(localizedItem, "resultTemplate", item.resultTemplate);

        if (item.applyAction) {
          localizedItem.applyAction = { label: item.applyAction.label ?? "" };
          withOptional(
            localizedItem.applyAction,
            "observationHint",
            item.applyAction.observationHint,
          );
        }

        return localizedItem;
      }),
    };
  }

  const miniChallenge = conceptContent?.sections?.miniChallenge;
  if (miniChallenge) {
    sections.miniChallenge = Object.fromEntries(
      ["prompt", "prediction", "answer", "explanation"]
        .filter((key) => Boolean(miniChallenge[key]))
        .map((key) => [key, miniChallenge[key]]),
    );
  }

  if (Object.keys(sections).length > 0) {
    overlay.sections = sections;
  }

  const quickTest = conceptContent?.quickTest;
  if (quickTest) {
    overlay.quickTest = {
      ...withOptional({}, "title", quickTest.title),
      ...withOptional({}, "intro", quickTest.intro),
      questions: (quickTest.questions ?? []).map((question) => {
        const localizedQuestion = { id: question.id };
        withOptional(localizedQuestion, "prompt", question.prompt);

        if (Array.isArray(question.choices) && question.choices.length > 0) {
          localizedQuestion.choices = question.choices.map((choice) => ({
            id: choice.id,
            label: choice.label,
          }));
        }

        withOptional(localizedQuestion, "explanation", question.explanation);
        withOptional(
          localizedQuestion,
          "selectedWrongExplanations",
          question.selectedWrongExplanations,
        );

        if (question.showMeAction) {
          localizedQuestion.showMeAction = { label: question.showMeAction.label ?? "" };
          withOptional(
            localizedQuestion.showMeAction,
            "observationHint",
            question.showMeAction.observationHint,
          );
        }

        return localizedQuestion;
      }),
    };
  }

  const accessibility = conceptContent?.accessibility;
  if (accessibility) {
    overlay.accessibility = {
      simulationDescription: {
        paragraphs: accessibility.simulationDescription?.paragraphs ?? [],
      },
      graphSummary: {
        paragraphs: accessibility.graphSummary?.paragraphs ?? [],
      },
    };
  }

  const pageFramework = conceptContent?.pageFramework;
  if (pageFramework) {
    const localizedPageFramework = {};

    if (Array.isArray(pageFramework.sections) && pageFramework.sections.length > 0) {
      localizedPageFramework.sections = pageFramework.sections.map((section) => {
        const localizedSection = { id: section.id };
        withOptional(localizedSection, "title", section.title);
        return localizedSection;
      });
    }

    if (Array.isArray(pageFramework.featuredSetups) && pageFramework.featuredSetups.length > 0) {
      localizedPageFramework.featuredSetups = pageFramework.featuredSetups.map((setup) => {
        const localizedSetup = { id: setup.id };
        withOptional(localizedSetup, "label", setup.label);
        withOptional(localizedSetup, "description", setup.description);

        if (setup.setup) {
          localizedSetup.setup = {};
          withOptional(localizedSetup.setup, "note", setup.setup.note);
        }

        return localizedSetup;
      });
    }

    if (Object.keys(localizedPageFramework).length > 0) {
      overlay.pageFramework = localizedPageFramework;
    }
  }

  const pageIntro = conceptContent?.pageIntro;
  if (pageIntro) {
    const localizedPageIntro = {};
    withOptional(localizedPageIntro, "definition", pageIntro.definition);
    withOptional(localizedPageIntro, "whyItMatters", pageIntro.whyItMatters);
    withOptional(localizedPageIntro, "keyTakeaway", pageIntro.keyTakeaway);

    if (Object.keys(localizedPageIntro).length > 0) {
      overlay.pageIntro = localizedPageIntro;
    }
  }

  if (Array.isArray(conceptContent?.equations) && conceptContent.equations.length > 0) {
    overlay.equations = conceptContent.equations.map((equation) => {
      const localizedEquation = { id: equation.id };
      withOptional(localizedEquation, "label", equation.label);
      withOptional(localizedEquation, "meaning", equation.meaning);
      withOptional(localizedEquation, "notes", equation.notes);
      return localizedEquation;
    });
  }

  if (Array.isArray(conceptContent?.variableLinks) && conceptContent.variableLinks.length > 0) {
    overlay.variableLinks = conceptContent.variableLinks.map((item) => {
      const localizedVariableLink = { id: item.id };
      withOptional(localizedVariableLink, "label", item.label);
      withOptional(localizedVariableLink, "description", item.description);
      return localizedVariableLink;
    });
  }

  const simulation = conceptContent?.simulation;
  if (simulation) {
    const localizedSimulation = {};

    if (isPlainObject(simulation.ui)) {
      const localizedSimulationUi = {};
      withOptional(localizedSimulationUi, "initialGraphId", simulation.ui.initialGraphId);
      withOptional(localizedSimulationUi, "primaryGraphIds", simulation.ui.primaryGraphIds);
      withOptional(localizedSimulationUi, "primaryControlIds", simulation.ui.primaryControlIds);
      withOptional(localizedSimulationUi, "primaryPresetIds", simulation.ui.primaryPresetIds);
      withOptional(localizedSimulationUi, "starterExploreTasks", simulation.ui.starterExploreTasks);

      if (Object.keys(localizedSimulationUi).length > 0) {
        localizedSimulation.ui = localizedSimulationUi;
      }
    }

    if (Array.isArray(simulation.controls) && simulation.controls.length > 0) {
      localizedSimulation.controls = simulation.controls.map((control) => {
        const localizedControl = { id: control.id };
        withOptional(localizedControl, "label", control.label);
        withOptional(localizedControl, "description", control.description);
        return localizedControl;
      });
    }

    if (Array.isArray(simulation.presets) && simulation.presets.length > 0) {
      localizedSimulation.presets = simulation.presets.map((preset) => {
        const localizedPreset = { id: preset.id };
        withOptional(localizedPreset, "label", preset.label);
        withOptional(localizedPreset, "description", preset.description);
        return localizedPreset;
      });
    }

    if (Array.isArray(simulation.overlays) && simulation.overlays.length > 0) {
      localizedSimulation.overlays = simulation.overlays.map((item) => {
        const localizedOverlay = { id: item.id };
        withOptional(localizedOverlay, "label", item.label);
        withOptional(localizedOverlay, "shortDescription", item.shortDescription);
        withOptional(localizedOverlay, "whatToNotice", item.whatToNotice);
        withOptional(localizedOverlay, "whyItMatters", item.whyItMatters);
        return localizedOverlay;
      });
    }

    if (Object.keys(localizedSimulation).length > 0) {
      overlay.simulation = localizedSimulation;
    }
  }

  if (Array.isArray(conceptContent?.graphs) && conceptContent.graphs.length > 0) {
    overlay.graphs = conceptContent.graphs.map((graph) => {
      const localizedGraph = { id: graph.id };
      withOptional(localizedGraph, "label", graph.label);
      withOptional(localizedGraph, "xLabel", graph.xLabel);
      withOptional(localizedGraph, "yLabel", graph.yLabel);
      withOptional(localizedGraph, "description", graph.description);
      return localizedGraph;
    });
  }

  const noticePrompts = conceptContent?.noticePrompts;
  if (noticePrompts) {
    overlay.noticePrompts = {
      ...withOptional({}, "title", noticePrompts.title),
      ...withOptional({}, "intro", noticePrompts.intro),
      items: (noticePrompts.items ?? []).map((item) => {
        const localizedNoticePrompt = { id: item.id };
        withOptional(localizedNoticePrompt, "text", item.text);
        withOptional(localizedNoticePrompt, "tryThis", item.tryThis);
        withOptional(localizedNoticePrompt, "whyItMatters", item.whyItMatters);
        return localizedNoticePrompt;
      }),
    };
  }

  const predictionMode = conceptContent?.predictionMode;
  if (predictionMode) {
    overlay.predictionMode = {
      ...withOptional({}, "title", predictionMode.title),
      ...withOptional({}, "intro", predictionMode.intro),
      items: (predictionMode.items ?? []).map((item) => {
        const localizedItem = { id: item.id };
        withOptional(localizedItem, "prompt", item.prompt);
        withOptional(localizedItem, "scenarioLabel", item.scenarioLabel);
        withOptional(localizedItem, "changeLabel", item.changeLabel);

        if (Array.isArray(item.choices) && item.choices.length > 0) {
          localizedItem.choices = item.choices.map((choice) => ({
            id: choice.id,
            label: choice.label,
          }));
        }

        withOptional(localizedItem, "explanation", item.explanation);
        withOptional(localizedItem, "observationHint", item.observationHint);
        return localizedItem;
      }),
    };
  }

  const challengeMode = conceptContent?.challengeMode;
  if (challengeMode) {
    overlay.challengeMode = {
      ...withOptional({}, "title", challengeMode.title),
      ...withOptional({}, "intro", challengeMode.intro),
      items: (challengeMode.items ?? []).map((item) => {
        const localizedItem = { id: item.id };
        withOptional(localizedItem, "title", item.title);
        withOptional(localizedItem, "prompt", item.prompt);
        withOptional(localizedItem, "successMessage", item.successMessage);

        if (item.setup) {
          localizedItem.setup = {};
          withOptional(localizedItem.setup, "note", item.setup.note);
        }

        withOptional(localizedItem, "hints", item.hints);

        if (Array.isArray(item.checks) && item.checks.length > 0) {
          localizedItem.checks = item.checks.map((check) => {
            const localizedCheck = {};
            withOptional(localizedCheck, "label", check.label);
            return localizedCheck;
          });
        }

        if (Array.isArray(item.targets) && item.targets.length > 0) {
          localizedItem.targets = item.targets.map((target) => ({
            label: buildChallengeTargetLabel(target),
          }));
        }

        return localizedItem;
      }),
    };
  }

  return overlay;
}

function formatChallengeNumber(value) {
  const absValue = Math.abs(value);
  const digits =
    absValue >= 100 ? 0 : absValue >= 10 ? 1 : absValue >= 1 ? 2 : absValue >= 0.1 ? 3 : 4;
  return value.toFixed(digits).replace(/\.?0+$/u, "");
}

function formatChallengeBound(value, unit) {
  const formatted = formatChallengeNumber(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

function formatChallengeRange(minimum, maximum, unit) {
  if (minimum !== undefined && minimum !== null && maximum !== undefined && maximum !== null) {
    return `between ${formatChallengeBound(minimum, unit)} and ${formatChallengeBound(maximum, unit)}`;
  }

  if (minimum !== undefined && minimum !== null) {
    return `at least ${formatChallengeBound(minimum, unit)}`;
  }

  return `at most ${formatChallengeBound(maximum ?? 0, unit)}`;
}

const knownChallengeFieldLabels = {
  vx: "horizontal velocity",
  vy: "vertical velocity",
  x: "horizontal position",
  y: "vertical position",
  omega: "angular frequency",
  componentDifference: "component mismatch",
  normalizedIntensity: "relative intensity",
  resultantAmplitude: "resultant amplitude",
  resultantDisplacement: "instantaneous resultant displacement",
  centripetalAcceleration: "centripetal acceleration",
  wavelengthNm: "wavelength",
  photonEnergyEv: "photon energy",
  activeVisibleFlag: "visible-spectrum flag",
  excitationFlag: "excitation mode",
  fieldX: "horizontal field component",
  fieldY: "vertical field component",
  forceX: "horizontal force component",
  forceY: "vertical force component",
};

function humanizeChallengeField(value) {
  if (value in knownChallengeFieldLabels) {
    return knownChallengeFieldLabels[value];
  }

  return value.replaceAll("-", " ").replaceAll("_", " ").trim().toLowerCase();
}

function buildChallengeTargetLabel(target) {
  if (typeof target?.label === "string" && target.label.length > 0) {
    return target.label;
  }

  const subject = humanizeChallengeField(String(target?.metric ?? target?.param ?? "target"));
  const setupPrefix = target?.setup ? `Setup ${String(target.setup).toUpperCase()} ` : "";
  return `Keep ${setupPrefix}${subject} ${formatChallengeRange(
    target?.min,
    target?.max,
    target?.displayUnit,
  )}.`;
}

export {
  buildConceptEditorialOverlaySource,
  collectIgnoredOverlayPaths,
  collectMissingOverlayLeafPaths,
  isPlainObject,
  mergeEditorialValue,
  sanitizeOverlayAgainstCanonical,
};
