import { NextResponse } from "next/server";
import {
  normalizeLegacySavedCompareSetupDraft,
  normalizeSavedCompareSetupDraft,
  savedCompareSetupDeleteSchema,
  savedCompareSetupLegacyDraftSchema,
  savedCompareSetupRenameSchema,
} from "@/lib/account/compare-setups";
import { accountSavedCompareSetupsRequestSchema } from "@/lib/account/model";
import {
  getStoredCompareSetupsForSession,
  getStoredSavedCompareSetupsForSession,
  mergeStoredSavedCompareSetupsForSession,
  renameStoredCompareSetupForSession,
  deleteStoredCompareSetupForSession,
  saveStoredCompareSetupForSession,
} from "@/lib/account/server-store";
import { getConceptBySlug } from "@/lib/content";
import { normalizeSavedCompareSetupsSnapshot } from "@/lib/saved-compare-setups";
import {
  encodeConceptSimulationState,
  encodePublicExperimentCard,
  type ConceptSimulationStateSource,
} from "@/lib/share-links";

export const runtime = "nodejs";

function buildSimulationStateSource(
  concept: ReturnType<typeof getConceptBySlug>,
): ConceptSimulationStateSource {
  return {
    slug: concept.slug,
    simulation: {
      defaults: concept.simulation.defaults,
      presets: concept.simulation.presets,
      overlays: concept.simulation.overlays,
      graphs: concept.graphs,
    },
  };
}

function buildCompareSetupErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message === "premium_required") {
    return NextResponse.json(
      {
        code: "premium_required",
        error:
          "Supporter unlocks saved compare setups, synced compare libraries, and their exact-state setup links. The live compare bench still works without cloud saves.",
      },
      { status: 403 },
    );
  }

  if (message === "unknown_concept") {
    return NextResponse.json(
      {
        code: "unknown_concept",
        error: "Saved compare setups must target a published concept.",
      },
      { status: 400 },
    );
  }

  if (message === "concept_identity_mismatch") {
    return NextResponse.json(
      {
        code: "concept_identity_mismatch",
        error: "Saved compare setup concept identity did not match the current concept.",
      },
      { status: 400 },
    );
  }

  if (message === "compare_setup_limit_reached") {
    return NextResponse.json(
      {
        code: "compare_setup_limit_reached",
        error: "This concept already has the maximum saved compare setups for one library. Delete or reuse one before saving a new A/B scene.",
      },
      { status: 409 },
    );
  }

  if (message === "compare_setup_not_found") {
    return NextResponse.json(
      {
        code: "compare_setup_not_found",
        error: "That saved compare setup could not be found for this concept.",
      },
      { status: 404 },
    );
  }

  throw error;
}

function convertLegacyDraftToCanonicalDraft(input: unknown) {
  const legacyDraft = normalizeLegacySavedCompareSetupDraft(input);

  if (!legacyDraft) {
    return null;
  }

  const concept = getConceptBySlug(legacyDraft.conceptSlug);
  const simulationSource = buildSimulationStateSource(concept);
  const activeSetup =
    legacyDraft.compare.activeTarget === "a"
      ? legacyDraft.compare.setupA
      : legacyDraft.compare.setupB;
  const stateParam = encodeConceptSimulationState(simulationSource, {
    params: { ...activeSetup.params },
    activePresetId: activeSetup.activePresetId,
    activeGraphId:
      legacyDraft.activeGraphId &&
      concept.graphs.some((graph) => graph.id === legacyDraft.activeGraphId)
        ? legacyDraft.activeGraphId
        : (concept.graphs[0]?.id ?? null),
    overlayValues: Object.fromEntries(
      (concept.simulation.overlays ?? []).map((overlay) => [
        overlay.id,
        legacyDraft.overlayValues[overlay.id] ?? overlay.defaultOn,
      ]),
    ),
    focusedOverlayId:
      (concept.simulation.overlays ?? []).find(
        (overlay) => legacyDraft.overlayValues[overlay.id] ?? overlay.defaultOn,
      )?.id ??
      concept.simulation.overlays?.[0]?.id ??
      null,
    time: 0,
    timeSource: "live",
    compare: {
      activeTarget: legacyDraft.compare.activeTarget,
      setupA: {
        label: legacyDraft.compare.setupA.label,
        params: { ...legacyDraft.compare.setupA.params },
        activePresetId: legacyDraft.compare.setupA.activePresetId,
      },
      setupB: {
        label: legacyDraft.compare.setupB.label,
        params: { ...legacyDraft.compare.setupB.params },
        activePresetId: legacyDraft.compare.setupB.activePresetId,
      },
    },
  });

  if (!stateParam) {
    return null;
  }

  return {
    conceptId: concept.id,
    conceptSlug: concept.slug,
    conceptTitle: concept.title,
    title: legacyDraft.name,
    stateParam,
    publicExperimentParam: encodePublicExperimentCard({
      conceptSlug: concept.slug,
      title: legacyDraft.name,
      prompt: `Open this saved compare bench and start testing ${legacyDraft.compare.setupA.label} against ${legacyDraft.compare.setupB.label} right away.`,
      kind: "saved-compare",
    }),
    setupALabel: legacyDraft.compare.setupA.label,
    setupBLabel: legacyDraft.compare.setupB.label,
    sourceType: "manual" as const,
  };
}

export async function GET(request: Request) {
  const conceptSlug = new URL(request.url).searchParams.get("concept")?.trim();

  try {
    if (conceptSlug) {
      const items = await getStoredCompareSetupsForSession(request, conceptSlug);

      if (!items) {
        return NextResponse.json(
          {
            code: "unauthorized",
            error: "Sign in to read saved compare setups.",
          },
          { status: 401 },
        );
      }

      return NextResponse.json({ items });
    }

    const savedCompareSetups = await getStoredSavedCompareSetupsForSession(request);

    if (!savedCompareSetups) {
      return NextResponse.json(
        {
          code: "unauthorized",
          error: "Sign in to read synced saved compare setups.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(savedCompareSetups);
  } catch (error) {
    return buildCompareSetupErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        code: "invalid_json",
        error: "Saved compare setup sync payload must be valid JSON.",
      },
      { status: 400 },
    );
  }

  const parsed = accountSavedCompareSetupsRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        code: "invalid_payload",
        error: "Saved compare setup sync payload did not pass validation.",
      },
      { status: 400 },
    );
  }

  const snapshot = normalizeSavedCompareSetupsSnapshot(parsed.data.snapshot);

  try {
    const mergedSavedCompareSetups = await mergeStoredSavedCompareSetupsForSession(
      request,
      snapshot,
    );

    if (!mergedSavedCompareSetups) {
      return NextResponse.json(
        {
          code: "unauthorized",
          error: "Sign in to sync saved compare setups.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(mergedSavedCompareSetups);
  } catch (error) {
    return buildCompareSetupErrorResponse(error);
  }
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        code: "invalid_json",
        error: "Saved compare setup payload must be valid JSON.",
      },
      { status: 400 },
    );
  }

  const canonicalDraft =
    normalizeSavedCompareSetupDraft(payload) ?? convertLegacyDraftToCanonicalDraft(payload);

  if (!canonicalDraft) {
    const legacyParsed = savedCompareSetupLegacyDraftSchema.safeParse(payload);

    return NextResponse.json(
      {
        code: legacyParsed.success ? "invalid_state_payload" : "invalid_payload",
        error: legacyParsed.success
          ? "Saved compare setup state could not be encoded into the canonical exact-state format."
          : "Saved compare setup payload did not pass validation.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await saveStoredCompareSetupForSession(request, canonicalDraft);

    if (!result) {
      return NextResponse.json(
        {
          code: "unauthorized",
          error: "Sign in to save compare setups.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return buildCompareSetupErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        code: "invalid_json",
        error: "Saved compare setup delete payload must be valid JSON.",
      },
      { status: 400 },
    );
  }

  const parsed = savedCompareSetupDeleteSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        code: "invalid_payload",
        error: "Saved compare setup delete payload did not pass validation.",
      },
      { status: 400 },
    );
  }

  try {
    const items = await deleteStoredCompareSetupForSession(request, parsed.data);

    if (!items) {
      return NextResponse.json(
        {
          code: "unauthorized",
          error: "Sign in to delete saved compare setups.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json({ items });
  } catch (error) {
    return buildCompareSetupErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        code: "invalid_json",
        error: "Saved compare setup rename payload must be valid JSON.",
      },
      { status: 400 },
    );
  }

  const parsed = savedCompareSetupRenameSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        code: "invalid_payload",
        error: "Saved compare setup rename payload did not pass validation.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await renameStoredCompareSetupForSession(request, parsed.data);

    if (!result) {
      return NextResponse.json(
        {
          code: "unauthorized",
          error: "Sign in to rename saved compare setups.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return buildCompareSetupErrorResponse(error);
  }
}
