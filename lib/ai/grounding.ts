import type { AiCoachCitation, AiCoachRequest, AiCoachResponse } from "./types";

export type AiGroundingResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: string;
    };

function normalizeForMatch(value: string) {
  return value
    .replace(/\\(?:frac|dfrac|tfrac)\s*\{([^{}]+)\}\s*\{([^{}]+)\}/gu, "$1/$2")
    .replace(/\\mathrm\s*\{([^{}]+)\}/gu, "$1")
    .replace(/\\(?:cdot|times)\b/gu, "*")
    .replace(/\\omega\b/gu, "omega")
    .replace(/\\phi\b/gu, "phi")
    .replace(/\\theta\b/gu, "theta")
    .replace(/\\pi\b/gu, "pi")
    .replace(/\\Delta\b/gu, "delta")
    .replace(/[{}]/gu, "")
    .toLowerCase()
    .replace(/\\[a-z]+/g, "")
    .replace(/[^a-z0-9=+\-*/^().]+/g, "");
}

function includesFormula(formula: string, candidate: string) {
  const normalizedFormula = normalizeForMatch(formula);
  const normalizedCandidate = normalizeForMatch(candidate);

  return (
    Boolean(normalizedFormula) &&
    Boolean(normalizedCandidate) &&
    (normalizedFormula.includes(normalizedCandidate) ||
      normalizedCandidate.includes(normalizedFormula))
  );
}

function getResponseText(response: AiCoachResponse) {
  return [
    response.action,
    response.observe,
    response.question,
    response.safetyNote ?? "",
    ...response.citations.map((citation) => citation.label),
  ].join(" ");
}

function extractFormulaLikeSnippets(text: string) {
  const formulaPattern =
    /[A-Za-z\\][A-Za-z0-9\\().^]*\s*=\s*[A-Za-z0-9\\().^\-]+(?:\s*[+\-*/^]\s*[A-Za-z0-9\\().^\-]+)*/g;
  const matches = text.match(formulaPattern);

  return matches?.map((match) => match.trim()).filter(Boolean) ?? [];
}

function citationMentionsKnownControl(
  citation: AiCoachCitation,
  controlKeys: string[],
) {
  const normalizedLabel = citation.label.toLowerCase();

  return controlKeys.some((key) => normalizedLabel.includes(key.toLowerCase()));
}

export function checkAiCoachGrounding({
  request,
  response,
}: {
  request: AiCoachRequest;
  response: AiCoachResponse;
}): AiGroundingResult {
  const formulas = request.context.page.formulas ?? [];
  const formulaSnippets = extractFormulaLikeSnippets(getResponseText(response));

  for (const snippet of formulaSnippets) {
    if (!formulas.some((formula) => includesFormula(formula, snippet))) {
      return {
        ok: false,
        reason: `Response mentioned an unsupported formula: ${snippet}`,
      };
    }
  }

  for (const citation of response.citations) {
    if (citation.type === "formula") {
      if (!formulas.some((formula) => includesFormula(formula, citation.label))) {
        return {
          ok: false,
          reason: `Formula citation is not in the supplied page formulas: ${citation.label}`,
        };
      }
    }

    if (citation.type === "simulation" && !request.context.simulation) {
      return {
        ok: false,
        reason: "Simulation citation was returned without simulation context.",
      };
    }

    if (citation.type === "learning-flow" && !request.context.learningFlow) {
      return {
        ok: false,
        reason: "Learning-flow citation was returned without learning flow context.",
      };
    }

    if (
      citation.type === "simulation" &&
      /\b(control|slider|toggle)\b/i.test(citation.label)
    ) {
      const controlKeys = Object.keys(request.context.simulation?.controls ?? {});

      if (controlKeys.length > 0 && !citationMentionsKnownControl(citation, controlKeys)) {
        return {
          ok: false,
          reason: `Simulation control citation does not match supplied controls: ${citation.label}`,
        };
      }
    }
  }

  return { ok: true };
}
