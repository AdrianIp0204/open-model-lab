"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAccountSession } from "@/lib/account/client";
import type { GuidedCollectionSummary } from "@/lib/content";
import type { AppLocale } from "@/i18n/routing";
import {
  GUIDED_COLLECTION_ASSIGNMENT_NOTE_MAX_LENGTH,
  MAX_SAVED_ASSIGNMENTS_PER_COLLECTION,
  resolveGuidedCollectionAssignment,
  type GuidedCollectionAssignmentRecord,
  type ResolvedGuidedCollectionAssignment,
} from "@/lib/guided/assignments";
import {
  getDefaultGuidedCollectionConceptBundleDraft,
  MAX_SAVED_CONCEPT_BUNDLES_PER_COLLECTION,
  resolveGuidedCollectionConceptBundle,
  type GuidedCollectionConceptBundleRecord,
  type ResolvedGuidedCollectionConceptBundle,
} from "@/lib/guided/concept-bundles";
import {
  getGuidedConceptBundleProgressSummary,
  type ProgressSnapshot,
} from "@/lib/progress";
import {
  buildGuidedCollectionAssignmentShareTargets,
  buildGuidedCollectionBundleShareTargets,
  guidedCollectionShareAnchorIds,
} from "@/lib/share-links";
import { ShareLinkButton } from "@/components/share/ShareLinkButton";
import { ShareLinksPanel } from "@/components/share/ShareLinksPanel";

type ConceptBundleBuilderProps = {
  locale?: AppLocale;
  collection: GuidedCollectionSummary;
  snapshot: ProgressSnapshot;
  usingSyncedSnapshot: boolean;
  activeBundle?: ResolvedGuidedCollectionConceptBundle | null;
};

type SavedConceptBundlesResponse = {
  items: GuidedCollectionConceptBundleRecord[];
  error?: string;
};

type SavedConceptBundleSaveResponse = SavedConceptBundlesResponse & {
  savedBundle: GuidedCollectionConceptBundleRecord;
  replacedExisting: boolean;
};

type SavedAssignmentsResponse = {
  items: GuidedCollectionAssignmentRecord[];
  error?: string;
};

type SavedAssignmentSaveResponse = SavedAssignmentsResponse & {
  savedAssignment: GuidedCollectionAssignmentRecord;
  replacedExisting: boolean;
};

function copyText(locale: AppLocale, english: string, zhHongKong: string) {
  return locale === "zh-HK" ? zhHongKong : english;
}

function localizeGuidedBundleShareTargets(
  targets: ReturnType<typeof buildGuidedCollectionBundleShareTargets>,
  locale: AppLocale,
) {
  return targets.map((target) => {
    switch (target.id) {
      case "guided-collection-bundle":
        return {
          ...target,
          label: copyText(locale, "Bundle page", "組合包頁面"),
          ariaLabel: copyText(locale, "Copy concept bundle link", "複製概念組合包連結"),
          buttonLabel: copyText(locale, "Copy bundle link", "複製組合包連結"),
          shareLabel: copyText(locale, "Share bundle", "分享組合包"),
          copiedText: copyText(locale, "Copied bundle link", "已複製組合包連結"),
          sharedText: copyText(locale, "Shared bundle", "已分享組合包"),
        };
      case "guided-collection-bundle-launch":
        return {
          ...target,
          label: copyText(locale, "Launch step", "啟動步驟"),
          ariaLabel: copyText(locale, "Copy bundle launch step link", "複製組合包啟動步驟連結"),
        };
      default:
        return target;
    }
  });
}

function localizeGuidedAssignmentShareTargets(
  targets: ReturnType<typeof buildGuidedCollectionAssignmentShareTargets>,
  locale: AppLocale,
) {
  return targets.map((target) => {
    switch (target.id) {
      case "guided-collection-assignment":
        return {
          ...target,
          label: copyText(locale, "Assignment page", "作業頁面"),
          ariaLabel: copyText(locale, "Copy assignment page link", "複製作業頁面連結"),
          buttonLabel: copyText(locale, "Copy assignment link", "複製作業連結"),
          shareLabel: copyText(locale, "Share assignment", "分享作業"),
          copiedText: copyText(locale, "Copied assignment link", "已複製作業連結"),
          sharedText: copyText(locale, "Shared assignment", "已分享作業"),
        };
      case "guided-collection-assignment-steps":
        return {
          ...target,
          label: copyText(locale, "Assigned steps", "已指派步驟"),
          ariaLabel: copyText(locale, "Copy assigned steps link", "複製已指派步驟連結"),
        };
      case "guided-collection-assignment-launch":
        return {
          ...target,
          label: copyText(locale, "Launch step", "啟動步驟"),
          ariaLabel: copyText(locale, "Copy assignment launch step link", "複製作業啟動步驟連結"),
        };
      default:
        return target;
    }
  });
}

function getStepKindLabel(
  step: GuidedCollectionSummary["steps"][number],
  locale: AppLocale,
) {
  switch (step.kind) {
    case "concept":
      return copyText(locale, "Concept", "概念");
    case "track":
      return copyText(locale, "Starter track", "入門路徑");
    case "challenge":
      return copyText(locale, "Challenge", "挑戰");
    case "surface":
      switch (step.surfaceKind) {
        case "topic":
          return copyText(locale, "Topic page", "主題頁");
        case "challenge-hub":
          return copyText(locale, "Open challenges", "打開挑戰");
        default:
          return copyText(locale, "Reference", "參考頁面");
      }
    default:
      return copyText(locale, "Step", "步驟");
  }
}

function formatTimestamp(value: string, locale: AppLocale) {
  try {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return copyText(locale, "Saved recently", "最近已保存");
  }
}

function getBundleStatusLabel(
  status: ReturnType<typeof getGuidedConceptBundleProgressSummary>["status"],
  locale: AppLocale,
) {
  if (status === "completed") {
    return copyText(locale, "Completed", "已完成");
  }

  if (status === "in-progress") {
    return copyText(locale, "In progress", "進行中");
  }

  return copyText(locale, "Not started", "未開始");
}

function buildInitialDraftState(
  collection: GuidedCollectionSummary,
  activeBundle?: ResolvedGuidedCollectionConceptBundle | null,
) {
  if (!activeBundle) {
    return getDefaultGuidedCollectionConceptBundleDraft(collection);
  }

  return {
    collectionSlug: collection.slug,
    title: activeBundle.title,
    summary: activeBundle.summary,
    stepIds: [...activeBundle.stepIds],
    launchStepId: activeBundle.launchStep.id,
  };
}

function normalizeTeacherNote(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized || null;
}

export function ConceptBundleBuilder({
  locale = "en",
  collection,
  snapshot,
  usingSyncedSnapshot,
  activeBundle = null,
}: ConceptBundleBuilderProps) {
  const session = useAccountSession();
  const initialDraftState = useMemo(
    () => buildInitialDraftState(collection, activeBundle),
    [activeBundle, collection],
  );
  const [draft, setDraft] = useState(initialDraftState);
  const [savedBundles, setSavedBundles] = useState<GuidedCollectionConceptBundleRecord[]>([]);
  const [savedAssignments, setSavedAssignments] = useState<GuidedCollectionAssignmentRecord[]>([]);
  const [bundlePendingAction, setBundlePendingAction] = useState<
    "loading" | "saving" | "deleting" | null
  >(null);
  const [assignmentPendingAction, setAssignmentPendingAction] = useState<
    "loading" | "saving" | "deleting" | null
  >(null);
  const [pendingBundleId, setPendingBundleId] = useState<string | null>(null);
  const [pendingAssignmentId, setPendingAssignmentId] = useState<string | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [assignmentNote, setAssignmentNote] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraft(initialDraftState);
    setSelectedAssignmentId(null);
    setAssignmentNote("");
  }, [initialDraftState]);

  useEffect(() => {
    let active = true;

    if (!session.initialized) {
      setBundlePendingAction("loading");
      return () => {
        active = false;
      };
    }

    if (session.status !== "signed-in") {
      setSavedBundles([]);
      setBundlePendingAction(null);
      setPendingBundleId(null);
      setErrorMessage(null);
      setStatusMessage(null);

      return () => {
        active = false;
      };
    }

    setBundlePendingAction("loading");
    setPendingBundleId(null);
    setErrorMessage(null);
    setStatusMessage(null);

    void fetch(
      `/api/account/concept-bundles?collection=${encodeURIComponent(collection.slug)}`,
      {
        cache: "no-store",
      },
    )
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as SavedConceptBundlesResponse;

        if (!response.ok) {
          throw new Error(
            payload.error ??
              copyText(locale, "Saved concept bundles could not be loaded.", "無法載入已保存的概念組合包。"),
          );
        }

        return payload.items ?? [];
      })
      .then((items) => {
        if (!active) {
          return;
        }

        setSavedBundles(items);
        setBundlePendingAction(null);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setBundlePendingAction(null);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : copyText(locale, "Saved concept bundles could not be loaded.", "無法載入已保存的概念組合包。"),
        );
      });

    return () => {
      active = false;
    };
  }, [collection.slug, locale, session.initialized, session.status, session.user?.id]);

  useEffect(() => {
    let active = true;

    if (!session.initialized) {
      setAssignmentPendingAction("loading");
      return () => {
        active = false;
      };
    }

    if (session.status !== "signed-in") {
      setSavedAssignments([]);
      setAssignmentPendingAction(null);
      setPendingAssignmentId(null);
      setSelectedAssignmentId(null);
      setAssignmentNote("");
      return () => {
        active = false;
      };
    }

    setAssignmentPendingAction("loading");
    setPendingAssignmentId(null);

    void fetch(`/api/account/assignments?collection=${encodeURIComponent(collection.slug)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as SavedAssignmentsResponse;

        if (!response.ok) {
          throw new Error(
            payload.error ??
              copyText(locale, "Saved assignments could not be loaded.", "無法載入已保存的作業連結。"),
          );
        }

        return payload.items ?? [];
      })
      .then((items) => {
        if (!active) {
          return;
        }

        setSavedAssignments(items);
        setAssignmentPendingAction(null);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setAssignmentPendingAction(null);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : copyText(locale, "Saved assignments could not be loaded.", "無法載入已保存的作業連結。"),
        );
      });

    return () => {
      active = false;
    };
  }, [collection.slug, locale, session.initialized, session.status, session.user?.id]);

  const bundlePreview = useMemo(
    () =>
      resolveGuidedCollectionConceptBundle(collection, {
        id: activeBundle?.id ?? "preview-bundle",
        title: draft.title,
        summary: draft.summary,
        stepIds: draft.stepIds,
        launchStepId: draft.launchStepId ?? null,
      }),
    [activeBundle?.id, collection, draft.launchStepId, draft.stepIds, draft.summary, draft.title],
  );
  const bundleProgress = useMemo(
    () =>
      bundlePreview ? getGuidedConceptBundleProgressSummary(snapshot, bundlePreview) : null,
    [bundlePreview, snapshot],
  );
  const shareTargets = useMemo(
    () =>
      bundlePreview
        ? localizeGuidedBundleShareTargets(
            buildGuidedCollectionBundleShareTargets(bundlePreview, locale),
            locale,
          )
        : [],
    [bundlePreview, locale],
  );
  const selectedAssignmentRecord = useMemo(
    () =>
      savedAssignments.find((assignment) => assignment.id === selectedAssignmentId) ?? null,
    [savedAssignments, selectedAssignmentId],
  );
  const selectedAssignmentPreview = useMemo<ResolvedGuidedCollectionAssignment | null>(
    () =>
      selectedAssignmentRecord
        ? resolveGuidedCollectionAssignment(collection, selectedAssignmentRecord)
        : null,
    [collection, selectedAssignmentRecord],
  );
  const assignmentShareTargets = useMemo(
    () =>
      selectedAssignmentPreview
        ? localizeGuidedAssignmentShareTargets(
            buildGuidedCollectionAssignmentShareTargets(selectedAssignmentPreview, locale),
            locale,
          )
        : [],
    [locale, selectedAssignmentPreview],
  );
  const selectedSteps = bundlePreview?.steps ?? [];
  const signedIn = session.status === "signed-in";

  function detachAssignmentLink(nextStatusMessage?: string) {
    setSelectedAssignmentId(null);
    if (nextStatusMessage) {
      setStatusMessage(nextStatusMessage);
      setErrorMessage(null);
    }
  }

  function updateSelectedSteps(nextStepIds: string[]) {
    const orderedStepIds = collection.steps
      .map((step) => step.id)
      .filter((stepId) => nextStepIds.includes(stepId));
    const fallbackLaunchStepId = orderedStepIds[0] ?? null;

    setDraft((current) => ({
      ...current,
      stepIds: orderedStepIds,
      launchStepId:
        current.launchStepId && orderedStepIds.includes(current.launchStepId)
          ? current.launchStepId
          : fallbackLaunchStepId,
    }));
  }

  async function handleSaveBundle() {
    if (!bundlePreview || session.status !== "signed-in") {
      return;
    }

    setBundlePendingAction("saving");
    setPendingBundleId(null);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/account/concept-bundles", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          collectionSlug: collection.slug,
          title: bundlePreview.title,
          summary: bundlePreview.summary,
          stepIds: bundlePreview.stepIds,
          launchStepId: bundlePreview.launchStep.id,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as
        | SavedConceptBundleSaveResponse
        | {
            error?: string;
          };

      if (!response.ok || !("savedBundle" in payload) || !payload.savedBundle) {
        throw new Error(
          "error" in payload && typeof payload.error === "string"
            ? payload.error
            : copyText(locale, "Concept bundle could not be saved.", "無法保存概念組合包。"),
        );
      }

      setSavedBundles(payload.items ?? []);
      setStatusMessage(
        payload.replacedExisting
          ? copyText(locale, `Updated "${payload.savedBundle.title}".`, `已更新「${payload.savedBundle.title}」。`)
          : copyText(locale, `Saved "${payload.savedBundle.title}".`, `已保存「${payload.savedBundle.title}」。`),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : copyText(locale, "Concept bundle could not be saved.", "無法保存概念組合包。"),
      );
    } finally {
      setBundlePendingAction(null);
    }
  }

  async function handleSaveAssignment() {
    if (!bundlePreview || session.status !== "signed-in") {
      return;
    }

    setAssignmentPendingAction("saving");
    setPendingAssignmentId(null);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/account/assignments", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: selectedAssignmentId ?? undefined,
          collectionSlug: collection.slug,
          title: bundlePreview.title,
          summary: bundlePreview.summary,
          stepIds: bundlePreview.stepIds,
          launchStepId: bundlePreview.launchStep.id,
          teacherNote: normalizeTeacherNote(assignmentNote),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as
        | SavedAssignmentSaveResponse
        | {
            error?: string;
          };

      if (!response.ok || !("savedAssignment" in payload) || !payload.savedAssignment) {
        throw new Error(
          "error" in payload && typeof payload.error === "string"
            ? payload.error
            : copyText(locale, "Assignment could not be saved.", "無法保存作業連結。"),
        );
      }

      setSavedAssignments(payload.items ?? []);
      setSelectedAssignmentId(payload.savedAssignment.id);
      setAssignmentNote(payload.savedAssignment.teacherNote ?? "");
      setStatusMessage(
        payload.replacedExisting
          ? copyText(locale, `Updated assignment "${payload.savedAssignment.title}".`, `已更新作業「${payload.savedAssignment.title}」。`)
          : copyText(locale, `Saved assignment "${payload.savedAssignment.title}".`, `已保存作業「${payload.savedAssignment.title}」。`),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : copyText(locale, "Assignment could not be saved.", "無法保存作業連結。"),
      );
    } finally {
      setAssignmentPendingAction(null);
    }
  }

  async function handleDeleteBundle(bundle: GuidedCollectionConceptBundleRecord) {
    if (session.status !== "signed-in") {
      return;
    }

    setBundlePendingAction("deleting");
    setPendingBundleId(bundle.id);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/account/concept-bundles", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          collectionSlug: collection.slug,
          id: bundle.id,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as SavedConceptBundlesResponse;

      if (!response.ok) {
        throw new Error(
          payload.error ??
            copyText(locale, "Concept bundle could not be deleted.", "無法刪除概念組合包。"),
        );
      }

      setSavedBundles(payload.items ?? []);
      setStatusMessage(copyText(locale, `Removed "${bundle.title}".`, `已移除「${bundle.title}」。`));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : copyText(locale, "Concept bundle could not be deleted.", "無法刪除概念組合包。"),
      );
    } finally {
      setPendingBundleId(null);
      setBundlePendingAction(null);
    }
  }

  async function handleDeleteAssignment(assignment: GuidedCollectionAssignmentRecord) {
    if (session.status !== "signed-in") {
      return;
    }

    setAssignmentPendingAction("deleting");
    setPendingAssignmentId(assignment.id);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/account/assignments", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          collectionSlug: collection.slug,
          id: assignment.id,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as SavedAssignmentsResponse;

      if (!response.ok) {
        throw new Error(
          payload.error ??
            copyText(locale, "Assignment could not be deleted.", "無法刪除作業連結。"),
        );
      }

      setSavedAssignments(payload.items ?? []);
      if (selectedAssignmentId === assignment.id) {
        setSelectedAssignmentId(null);
      }
      setStatusMessage(
        copyText(locale, `Removed assignment "${assignment.title}".`, `已移除作業「${assignment.title}」。`),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : copyText(locale, "Assignment could not be deleted.", "無法刪除作業連結。"),
      );
    } finally {
      setPendingAssignmentId(null);
      setAssignmentPendingAction(null);
    }
  }

  return (
    <section
      id={guidedCollectionShareAnchorIds.bundle}
      className="space-y-5 scroll-mt-24"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="lab-label">{copyText(locale, "Shareable concept bundle", "可分享概念組合包")}</p>
          <h2 className="text-2xl font-semibold text-ink-950">
            {copyText(locale, "Package a compact launch path from this guided collection.", "把這個引導式合集整理成一條精簡的啟動路徑。")}
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-ink-700">
            {copyText(
              locale,
              "Keep the bundle lightweight: choose the collection entry points that matter, give the package a clear summary, and share one stable link back into the same topic, concept, track, and challenge surfaces that already exist.",
              "讓組合包保持精簡：只挑選真正重要的合集入口，寫出清楚摘要，再用一條穩定連結回到現有的主題、概念、路徑與挑戰頁面。",
            )}
          </p>
        </div>
        <p className="text-sm text-ink-600">
          {usingSyncedSnapshot
            ? copyText(locale, "Bundle progress below comes from the signed-in synced snapshot already used on this page.", "下方組合包進度來自這一頁已使用的登入同步快照。")
            : copyText(locale, "Bundle progress below stays local-first and never rides along with the shared link.", "下方組合包進度保持以本機優先為主，不會跟隨分享連結帶走。")}
        </p>
      </div>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.04fr)_minmax(20rem,0.96fr)]">
        <article className="lab-panel p-5 sm:p-6">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <label className="space-y-2">
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {copyText(locale, "Bundle title", "組合包標題")}
                </span>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  maxLength={96}
                  className="w-full rounded-2xl border border-line bg-paper px-3 py-2.5 text-sm text-ink-950 outline-none transition focus-visible:border-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500/30"
                />
              </label>

              <label className="space-y-2">
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {copyText(locale, "Direct launch", "直接啟動")}
                </span>
                <select
                  value={draft.launchStepId ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      launchStepId: event.target.value || null,
                    }))
                  }
                  className="w-full rounded-2xl border border-line bg-paper px-3 py-2.5 text-sm text-ink-950 outline-none transition focus-visible:border-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500/30"
                >
                  {selectedSteps.map((step) => (
                    <option key={step.id} value={step.id}>
                      {step.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                {copyText(locale, "Bundle summary", "組合包摘要")}
              </span>
              <textarea
                value={draft.summary}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    summary: event.target.value,
                  }))
                }
                rows={3}
                maxLength={260}
                className="w-full rounded-[24px] border border-line bg-paper px-3 py-2.5 text-sm leading-6 text-ink-950 outline-none transition focus-visible:border-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500/30"
              />
            </label>

            <div className="rounded-[24px] border border-line bg-paper-strong p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-ink-950">
                    {copyText(locale, "Included entry points", "已納入的入口")}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-ink-700">
                    {copyText(locale, "Uncheck anything that should stay outside this shareable bundle.", "把不應放進這個可分享組合包的入口取消勾選。")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const defaults = getDefaultGuidedCollectionConceptBundleDraft(collection);
                    setDraft(defaults);
                    setSelectedAssignmentId(null);
                    setAssignmentNote("");
                    setStatusMessage(copyText(locale, "Reset the bundle to the full collection.", "已把組合包重設為完整合集。"));
                    setErrorMessage(null);
                  }}
                  className="inline-flex items-center rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-ink-700 transition hover:border-ink-950/20 hover:bg-white"
                >
                  {copyText(locale, "Reset defaults", "重設預設")}
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                {collection.steps.map((step, index) => {
                  const selected = draft.stepIds.includes(step.id);
                  const disableUnchecked = selected && draft.stepIds.length === 1;

                  return (
                    <label
                      key={step.id}
                      className="flex gap-3 rounded-[20px] border border-line bg-paper px-4 py-3"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={disableUnchecked}
                        onChange={(event) => {
                          if (event.target.checked) {
                            updateSelectedSteps([...draft.stepIds, step.id]);
                            return;
                          }

                          updateSelectedSteps(
                            draft.stepIds.filter((candidateId) => candidateId !== step.id),
                          );
                        }}
                        className="mt-1 h-4 w-4 rounded border-line text-teal-600 focus-visible:ring-teal-500"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-ink-950">
                            {index + 1}. {step.title}
                          </span>
                          <span className="rounded-full border border-line bg-paper-strong px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                            {getStepKindLabel(step, locale)}
                          </span>
                          {draft.launchStepId === step.id ? (
                            <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-teal-700">
                              {copyText(locale, "Launch", "啟動")}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 block text-sm leading-6 text-ink-700">
                          {step.summary}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </article>

        <aside className="space-y-4">
          <div className="lab-panel p-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="lab-label">{copyText(locale, "Bundle preview", "組合包預覽")}</p>
                {activeBundle ? (
                  <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-teal-700">
                    {copyText(locale, "Shared bundle", "共享組合包")}
                  </span>
                ) : null}
              </div>

              {bundlePreview ? (
                <>
                  <h3 className="text-2xl font-semibold text-ink-950">{bundlePreview.title}</h3>
                  <p className="text-sm leading-6 text-ink-700">{bundlePreview.summary}</p>
                </>
              ) : (
                <p className="text-sm leading-6 text-coral-700">
                  {copyText(locale, "Select at least one valid collection step to build a shareable bundle.", "請至少選擇一個有效的合集步驟，才能建立可分享的組合包。")}
                </p>
              )}
            </div>

            {bundlePreview && bundleProgress ? (
              <>
                <div className="mt-4 rounded-[24px] border border-line bg-paper-strong p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                      {copyText(locale, `${bundlePreview.steps.length} entry points`, `${bundlePreview.steps.length} 個入口`)}
                    </span>
                    <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                      {copyText(locale, `${bundlePreview.conceptCount} concepts`, `${bundlePreview.conceptCount} 個概念`)}
                    </span>
                    <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                      {bundlePreview.estimatedStudyMinutes} min
                    </span>
                    <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                      {getBundleStatusLabel(bundleProgress.status, locale)}
                    </span>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-paper">
                    <div
                      className="h-full rounded-full bg-ink-950"
                      style={{
                        width: `${
                          bundleProgress.totalSteps
                            ? Math.round(
                                (bundleProgress.completedStepCount /
                                  bundleProgress.totalSteps) *
                                  100,
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>

                  <p className="mt-3 text-sm leading-6 text-ink-700">
                    {copyText(
                      locale,
                      `${bundleProgress.completedStepCount} of ${bundleProgress.totalSteps} selected entry points already show saved progress.`,
                      `所選入口中已有 ${bundleProgress.completedStepCount} / ${bundleProgress.totalSteps} 顯示出已保存的進度。`,
                    )}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {bundlePreview.concepts.slice(0, 4).map((concept) => (
                      <span
                        key={`${bundlePreview.id}-${concept.slug}`}
                        className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700"
                      >
                        {concept.shortTitle ?? concept.title}
                      </span>
                    ))}
                    {bundlePreview.concepts.length > 4 ? (
                      <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-700">
                        {copyText(locale, `+${bundlePreview.concepts.length - 4} more concepts`, `另外還有 ${bundlePreview.concepts.length - 4} 個概念`)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={bundlePreview.launchStep.href}
                    className="inline-flex items-center justify-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold transition hover:opacity-90"
                    style={{ color: "var(--paper-strong)" }}
                  >
                    {copyText(locale, "Launch bundle", "啟動組合包")}
                  </Link>
                  <Link
                    href={collection.path}
                    className="inline-flex items-center justify-center rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
                  >
                    {copyText(locale, "Open full collection", "打開完整合集")}
                  </Link>
                  <button
                    type="button"
                    onClick={handleSaveBundle}
                    disabled={!signedIn || bundlePendingAction === "saving"}
                    className="inline-flex items-center justify-center rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {bundlePendingAction === "saving"
                      ? copyText(locale, "Saving...", "正在保存...")
                      : copyText(locale, "Save bundle", "保存組合包")}
                  </button>
                </div>
              </>
            ) : null}
          </div>

          <ShareLinksPanel
            items={shareTargets}
            pageTitle={bundlePreview?.title ?? collection.title}
            title={copyText(locale, "Share this bundle", "分享這個組合包")}
            description={copyText(locale, "The shared link keeps the bundle title, summary, selected entry points, and launch step. It never carries saved progress or private account state.", "這條分享連結會保留組合包標題、摘要、已選入口與啟動步驟，但不會帶有已保存的進度或私人帳戶狀態。")}
            variant="compact"
          />

          {selectedAssignmentPreview ? (
            <ShareLinksPanel
              items={assignmentShareTargets}
              pageTitle={selectedAssignmentPreview.title}
              title={copyText(locale, "Share this assignment", "分享這份作業")}
              description={copyText(locale, "The assignment link stays stable because the selected steps are saved in the account layer. Learner progress still remains local-first or synced per learner.", "這條作業連結會保持穩定，因為所選步驟已保存在帳戶層。學習者進度仍然保持以本機優先或按各自帳戶同步。")}
              variant="compact"
            />
          ) : null}

          {errorMessage ? (
            <p
              role="alert"
              className="rounded-[20px] border border-coral-500/25 bg-coral-500/10 px-4 py-3 text-sm text-coral-800"
            >
              {errorMessage}
            </p>
          ) : null}
          {!errorMessage && statusMessage ? (
            <p
              role="status"
              className="rounded-[20px] border border-teal-500/25 bg-teal-500/10 px-4 py-3 text-sm text-teal-800"
            >
              {statusMessage}
            </p>
          ) : null}
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.04fr)_minmax(20rem,0.96fr)]">
        <article className="lab-panel p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="lab-label">{copyText(locale, "Assignment mode", "作業模式")}</p>
              <h3 className="text-2xl font-semibold text-ink-950">
                {copyText(locale, "Save the current bundle selection as a stable assignment link.", "把目前的組合包選擇保存成穩定的作業連結。")}
              </h3>
              <p className="max-w-3xl text-sm leading-6 text-ink-700">
                {copyText(locale, "This stays intentionally small. The assignment stores the selected guided-collection steps and an optional note, then learners reopen the same concept, track, topic, and challenge surfaces through one stable entry point.", "這個功能刻意保持精簡。作業只會保存所選的引導式合集步驟和一段可選備註，之後學習者會透過同一條穩定入口重新打開相同的概念、路徑、主題和挑戰頁面。")}
              </p>
            </div>
            <p className="text-sm text-ink-600">
              {signedIn
                ? copyText(locale, "Assignments save in the signed-in account, but learner progress still stays on each learner's own local or synced snapshot.", "作業會保存到已登入帳戶，但學習者進度仍然保留在各自的本機或同步快照中。")
                : copyText(locale, "Sign in to save a stable assignment link. Signed-out bundle sharing above still stays public.", "登入後才能保存穩定作業連結。上方未登入的組合包分享仍然保持公開。")}
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <label className="space-y-2">
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {copyText(locale, "Curator note", "編者備註")}
                </span>
              <textarea
                value={assignmentNote}
                onChange={(event) => setAssignmentNote(event.target.value)}
                rows={3}
                maxLength={GUIDED_COLLECTION_ASSIGNMENT_NOTE_MAX_LENGTH}
                placeholder={copyText(locale, "Optional framing for learners. Keep it short and concrete.", "給學習者的可選說明。請保持簡短而具體。")}
                className="w-full rounded-[24px] border border-line bg-paper px-3 py-2.5 text-sm leading-6 text-ink-950 outline-none transition focus-visible:border-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500/30"
              />
            </label>

            <div className="rounded-[24px] border border-line bg-paper-strong p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {copyText(locale, `${bundlePreview?.steps.length ?? 0} assigned steps`, `${bundlePreview?.steps.length ?? 0} 個作業步驟`)}
                </span>
                <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {copyText(locale, `${bundlePreview?.conceptCount ?? 0} concepts`, `${bundlePreview?.conceptCount ?? 0} 個概念`)}
                </span>
                <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {bundlePreview?.estimatedStudyMinutes ?? 0} min
                </span>
                {selectedAssignmentPreview ? (
                  <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-teal-700">
                    {copyText(locale, "Stable link ready", "穩定連結已準備好")}
                  </span>
                ) : null}
              </div>

              <p className="mt-3 text-sm leading-6 text-ink-700">
                {selectedAssignmentPreview
                  ? copyText(locale, `Updating this draft will keep the existing /assignments/${selectedAssignmentPreview.id} entry point stable until you explicitly start a new link.`, `更新這份草稿時，現有的 /assignments/${selectedAssignmentPreview.id} 入口會保持穩定，直到你明確開始一條新連結為止。`)
                  : copyText(locale, "Save the current draft to mint one stable assignment entry point for this exact selection.", "保存目前草稿，就能為這個精確選擇產生一條穩定的作業入口。")}
              </p>

              {bundlePreview ? (
                <p className="mt-2 text-sm leading-6 text-ink-700">
                  {copyText(locale, `Launch starts on ${bundlePreview.launchStep.title}. Assignment completion is derived from the same concept, starter-track, and challenge facts already used elsewhere in the product.`, `啟動會從 ${bundlePreview.launchStep.title} 開始。作業完成度會沿用產品其他地方已經使用的同一套概念、入門路徑與挑戰事實。`)}
                </p>
              ) : (
                <p className="mt-2 text-sm leading-6 text-coral-700">
                  {copyText(locale, "Keep at least one valid entry point selected before saving an assignment.", "保存作業前，請至少保留一個有效入口。")}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSaveAssignment}
                  disabled={!signedIn || !bundlePreview || assignmentPendingAction === "saving"}
                  className="inline-flex items-center justify-center rounded-full bg-ink-950 px-4 py-2.5 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ color: "var(--paper-strong)" }}
                >
                  {assignmentPendingAction === "saving"
                    ? copyText(locale, "Saving assignment...", "正在保存作業...")
                    : selectedAssignmentPreview
                      ? copyText(locale, "Update assignment", "更新作業")
                      : copyText(locale, "Save assignment", "保存作業")}
                </button>
                {selectedAssignmentPreview ? (
                  <>
                    <Link
                      href={`/assignments/${selectedAssignmentPreview.id}`}
                      className="inline-flex items-center justify-center rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
                    >
                      {copyText(locale, "Open assignment", "打開作業")}
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        detachAssignmentLink(copyText(locale, "Detached the current assignment link. Save again to create a new one.", "已分離目前的作業連結。再次保存即可建立新的連結。"))
                      }
                      className="inline-flex items-center justify-center rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-ink-950/20 hover:bg-white"
                    >
                      {copyText(locale, "Start new link", "開始新連結")}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </article>

        <aside className="lab-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="lab-label">{copyText(locale, "Saved assignments", "已保存作業")}</p>
              <p className="mt-2 text-sm leading-6 text-ink-700">
                {copyText(locale, "Keep compact assignable variants for this guided collection without introducing a classroom dashboard.", "為這個引導式合集保留精簡、可指派的變體，而不用另外建立課堂儀表板。")}
              </p>
            </div>
            <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
              {signedIn ? copyText(locale, "Synced", "已同步") : copyText(locale, "Sign in", "登入")}
            </span>
          </div>

          {!session.initialized || assignmentPendingAction === "loading" ? (
            <p className="mt-4 text-sm leading-6 text-ink-700">{copyText(locale, "Loading saved assignments.", "正在載入已保存作業。")}</p>
          ) : !signedIn ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm leading-6 text-ink-700">
                {copyText(locale, `Save up to ${MAX_SAVED_ASSIGNMENTS_PER_COLLECTION} assignment links for this guided collection once you sign in.`, `登入後，你最多可以為這個引導式合集保存 ${MAX_SAVED_ASSIGNMENTS_PER_COLLECTION} 條作業連結。`)}
              </p>
              <Link
                href="/account"
                className="inline-flex items-center rounded-full border border-line bg-paper px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-800 transition hover:border-ink-950/20 hover:bg-white"
              >
                {copyText(locale, "Open account", "打開帳戶")}
              </Link>
            </div>
          ) : savedAssignments.length ? (
            <div className="mt-4 grid max-h-80 gap-3 overflow-y-auto pr-1">
              {savedAssignments.map((assignment) => {
                const savedAssignmentPreview = resolveGuidedCollectionAssignment(
                  collection,
                  assignment,
                );

                return (
                  <article
                    key={assignment.id}
                    className="rounded-[20px] border border-line bg-paper-strong px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-ink-950">{assignment.title}</p>
                        <p className="mt-1 text-sm leading-6 text-ink-700">{assignment.summary}</p>
                        {assignment.teacherNote ? (
                          <p className="mt-2 text-sm leading-6 text-ink-600">
                            {copyText(locale, "Note:", "備註：")} {assignment.teacherNote}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs leading-5 text-ink-500">
                          {copyText(locale, "Updated", "已更新")}{" "}
                          {formatTimestamp(assignment.updatedAt, locale)}
                        </p>
                      </div>
                      {selectedAssignmentId === assignment.id ? (
                        <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-teal-700">
                          {copyText(locale, "Active link", "目前連結")}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDraft({
                            collectionSlug: collection.slug,
                            title: assignment.title,
                            summary: assignment.summary,
                            stepIds: [...assignment.stepIds],
                            launchStepId: assignment.launchStepId ?? null,
                          });
                          setSelectedAssignmentId(assignment.id);
                          setAssignmentNote(assignment.teacherNote ?? "");
                          setStatusMessage(
                            copyText(
                              locale,
                              `Restored assignment "${assignment.title}".`,
                              `已還原作業「${assignment.title}」。`,
                            ),
                          );
                          setErrorMessage(null);
                        }}
                        className="rounded-full border border-line bg-paper px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-800 transition hover:border-ink-950/20 hover:bg-white"
                      >
                        {copyText(locale, "Restore", "還原")}
                      </button>
                      {savedAssignmentPreview ? (
                        <>
                          <Link
                            href={`/assignments/${assignment.id}`}
                            className="rounded-full border border-line bg-paper px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-800 transition hover:border-ink-950/20 hover:bg-white"
                          >
                            {copyText(locale, "Open", "打開")}
                          </Link>
                          <ShareLinkButton
                            {...localizeGuidedAssignmentShareTargets(
                              buildGuidedCollectionAssignmentShareTargets(
                                savedAssignmentPreview,
                                locale,
                              ),
                              locale,
                            )[0]}
                            className="rounded-full border border-line bg-paper px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-800 transition hover:border-ink-950/20 hover:bg-white"
                          />
                        </>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleDeleteAssignment(assignment)}
                        disabled={
                          assignmentPendingAction === "deleting" &&
                          pendingAssignmentId === assignment.id
                        }
                        className="rounded-full border border-line bg-paper px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-700 transition hover:border-coral-500/35 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {assignmentPendingAction === "deleting" &&
                        pendingAssignmentId === assignment.id
                          ? copyText(locale, "Removing", "移除中")
                          : copyText(locale, "Delete", "刪除")}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-ink-700">
              {copyText(
                locale,
                "No saved assignments yet for this guided collection.",
                "這個引導式合集暫時還沒有已保存的作業。",
              )}
            </p>
          )}
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.04fr)_minmax(20rem,0.96fr)]">
        <article className="lab-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="lab-label">{copyText(locale, "Bundle launch order", "組合包啟動次序")}</p>
              <h3 className="mt-2 text-xl font-semibold text-ink-950">
                {copyText(
                  locale,
                  "Keep the selected bundle steps explicit.",
                  "把已選組合包步驟清楚列出。",
                )}
              </h3>
            </div>
            {bundlePreview ? (
              <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-xs text-ink-600">
                {copyText(locale, "Launch starts on", "啟動會從")} {bundlePreview.launchStep.title}
              </span>
            ) : null}
          </div>

          {bundlePreview ? (
            <ol className="mt-4 grid gap-3">
              {bundlePreview.steps.map((step, index) => (
                <li key={`${bundlePreview.id}-${step.id}`}>
                  <Link
                    href={step.href}
                    className="flex flex-col gap-2 rounded-[20px] border border-line bg-paper-strong px-4 py-3 transition hover:border-ink-950/20 hover:bg-white"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink-950 text-xs font-semibold text-paper-strong">
                        {index + 1}
                      </span>
                      <span className="text-sm font-semibold text-ink-950">{step.title}</span>
                      <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
                        {getStepKindLabel(step, locale)}
                      </span>
                    </span>
                    <span className="text-sm leading-6 text-ink-700">{step.summary}</span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm leading-6 text-ink-700">
              {copyText(
                locale,
                "The bundle preview will show the selected launch order here.",
                "組合包預覽會在這裡顯示所選的啟動次序。",
              )}
            </p>
          )}
        </article>

        <aside className="lab-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="lab-label">{copyText(locale, "Saved bundles", "已保存組合包")}</p>
              <p className="mt-2 text-sm leading-6 text-ink-700">
                {copyText(
                  locale,
                  "Signed-in bundles reload on any device that uses the same account. Signed-out sharing still works from the live preview above.",
                  "已登入的組合包會在使用同一帳戶的任何裝置上重新載入。未登入時，仍可從上方的即時預覽分享。",
                )}
              </p>
            </div>
            <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
              {signedIn ? copyText(locale, "Synced", "已同步") : copyText(locale, "Sign in", "登入")}
            </span>
          </div>

          {!session.initialized || bundlePendingAction === "loading" ? (
            <p className="mt-4 text-sm leading-6 text-ink-700">
              {copyText(locale, "Loading saved concept bundles.", "正在載入已保存的概念組合包。")}
            </p>
          ) : !signedIn ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm leading-6 text-ink-700">
                {copyText(
                  locale,
                  `Save up to ${MAX_SAVED_CONCEPT_BUNDLES_PER_COLLECTION} bundle variants for this guided collection once you sign in.`,
                  `登入後，你最多可以為這個引導式合集保存 ${MAX_SAVED_CONCEPT_BUNDLES_PER_COLLECTION} 個組合包變體。`,
                )}
              </p>
              <Link
                href="/account"
                className="inline-flex items-center rounded-full border border-line bg-paper px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-800 transition hover:border-ink-950/20 hover:bg-white"
              >
                {copyText(locale, "Open account", "打開帳戶")}
              </Link>
            </div>
          ) : savedBundles.length ? (
            <div className="mt-4 grid max-h-72 gap-3 overflow-y-auto pr-1">
              {savedBundles.map((bundle) => {
                const savedBundlePreview = resolveGuidedCollectionConceptBundle(collection, {
                  id: bundle.id,
                  title: bundle.title,
                  summary: bundle.summary,
                  stepIds: bundle.stepIds,
                  launchStepId: bundle.launchStepId ?? null,
                });

                return (
                  <article
                    key={bundle.id}
                    className="rounded-[20px] border border-line bg-paper-strong px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-ink-950">{bundle.title}</p>
                    <p className="mt-1 text-sm leading-6 text-ink-700">{bundle.summary}</p>
                    <p className="mt-1 text-xs leading-5 text-ink-500">
                      {copyText(locale, "Updated", "已更新")} {formatTimestamp(bundle.updatedAt, locale)}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDraft({
                            collectionSlug: collection.slug,
                            title: bundle.title,
                            summary: bundle.summary,
                            stepIds: [...bundle.stepIds],
                            launchStepId: bundle.launchStepId ?? null,
                          });
                          setSelectedAssignmentId(null);
                          setAssignmentNote("");
                          setStatusMessage(
                            copyText(
                              locale,
                              `Restored "${bundle.title}".`,
                              `已還原「${bundle.title}」。`,
                            ),
                          );
                          setErrorMessage(null);
                        }}
                        className="rounded-full border border-line bg-paper px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-800 transition hover:border-ink-950/20 hover:bg-white"
                      >
                        {copyText(locale, "Restore", "還原")}
                      </button>
                      {savedBundlePreview ? (
                        <ShareLinkButton
                          {...localizeGuidedBundleShareTargets(
                            buildGuidedCollectionBundleShareTargets(
                              savedBundlePreview,
                              locale,
                            ),
                            locale,
                          )[0]}
                          className="rounded-full border border-line bg-paper px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-800 transition hover:border-ink-950/20 hover:bg-white"
                        />
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleDeleteBundle(bundle)}
                        disabled={
                          bundlePendingAction === "deleting" && pendingBundleId === bundle.id
                        }
                        className="rounded-full border border-line bg-paper px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-700 transition hover:border-coral-500/35 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {bundlePendingAction === "deleting" && pendingBundleId === bundle.id
                          ? copyText(locale, "Removing", "移除中")
                          : copyText(locale, "Delete", "刪除")}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-ink-700">
              {copyText(
                locale,
                "No saved concept bundles yet for this guided collection.",
                "這個引導式合集暫時還沒有已保存的概念組合包。",
              )}
            </p>
          )}
        </aside>
      </section>
    </section>
  );
}
