import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveServerLocaleFallback } from "@/i18n/server";
import { getAuthorPreviewIndex } from "@/lib/content";
import { copyText } from "@/lib/i18n/copy-text";
import { PageShell } from "@/components/layout/PageShell";
import { localizeShareHref } from "@/lib/share-links";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveServerLocaleFallback();

  return {
    title: copyText(locale, "Author Preview | Open Model Lab", "作者預覽｜Open Model Lab"),
    robots: {
      index: false,
      follow: false,
    },
  };
}

export const dynamic = "force-dynamic";

function assertAuthorPreviewEnabled() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
}

function formatTimestamp(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AuthorPreviewIndexPage() {
  assertAuthorPreviewEnabled();

  const locale = await resolveServerLocaleFallback();
  const preview = getAuthorPreviewIndex();

  return (
    <PageShell className="space-y-6" showFeedbackWidget={false}>
      <section className="lab-panel space-y-4 p-6">
        <div className="space-y-2">
          <p className="lab-label">
            {copyText(locale, "Developer-only author preview", "僅供開發者使用的作者預覽")}
          </p>
          <h1 className="text-3xl font-semibold text-ink-950">
            {copyText(locale, "Content validation and preview", "內容驗證與預覽")}
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-ink-700">
            {copyText(
              locale,
              "This route stays out of the public product and is only available outside production. Use it to inspect authored concept coverage, track wiring, and the exact preview route for each concept before publishing.",
              "這條路由不會出現在公開產品中，只會在非正式環境開放。你可以在發佈前用它檢查已編寫概念的覆蓋、學習路徑串接，以及每個概念的精確預覽路徑。",
            )}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-line bg-paper-strong px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
              {copyText(locale, "Concepts", "概念")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-ink-950">
              {preview.summary.conceptCount}
            </p>
            <p className="mt-1 text-sm text-ink-600">
              {copyText(
                locale,
                `${preview.summary.publishedConceptCount} published / ${preview.summary.draftConceptCount} draft`,
                `${preview.summary.publishedConceptCount} 個已發佈 / ${preview.summary.draftConceptCount} 個草稿`,
              )}
            </p>
          </div>
          <div className="rounded-3xl border border-line bg-paper-strong px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
              {copyText(locale, "Starter tracks", "起步學習路徑")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-ink-950">{preview.summary.trackCount}</p>
            <p className="mt-1 text-sm text-ink-600">
              {copyText(locale, "Public track pages still reuse the same content graph.", "公開學習路徑頁仍沿用同一套內容圖譜。")}
            </p>
          </div>
          <div className="rounded-3xl border border-line bg-paper-strong px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
              {copyText(locale, "Challenge items", "挑戰題目")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-ink-950">
              {preview.summary.totalChallengeItems}
            </p>
            <p className="mt-1 text-sm text-ink-600">
              {copyText(locale, "Normalized against the live simulation seams.", "已按即時模擬的接縫規格標準化。")}
            </p>
          </div>
          <div className="rounded-3xl border border-line bg-paper-strong px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
              {copyText(locale, "Worked / quick test", "解題示範／快速測驗")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-ink-950">
              {preview.summary.totalWorkedExamples} / {preview.summary.totalQuickTestQuestions}
            </p>
            <p className="mt-1 text-sm text-ink-600">
              {copyText(locale, "Token-backed worked examples and authored checks.", "含 token 支援的解題示範與已編寫檢查項目。")}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-dashed border-line bg-paper px-4 py-4 text-sm leading-7 text-ink-700">
          <p className="font-semibold text-ink-950">{copyText(locale, "Local workflow", "本機工作流程")}</p>
          <p className="mt-2">
            {copyText(
              locale,
              "Run ",
              "先執行 ",
            )}
            <code>pnpm validate:content</code>
            {copyText(
              locale,
              " for the focused content-integrity suite, then keep ",
              " 來跑重點內容完整性檢查，之後保持 ",
            )}
            <code>pnpm dev</code>
            {copyText(
              locale,
              " running and open ",
              " 持續運作，再打開 ",
            )}
            <code>/author-preview</code>
            {copyText(locale, " to inspect the concept and track summaries.", " 查看概念與學習路徑摘要。")}
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-ink-500">
            {copyText(locale, "Generated", "生成時間")} {formatTimestamp(preview.generatedAt, locale)}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="lab-label">{copyText(locale, "Concept previews", "概念預覽")}</p>
            <h2 className="text-2xl font-semibold text-ink-950">
              {copyText(locale, "Canonical concept content", "標準概念內容")}
            </h2>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {preview.concepts.map((concept) => (
            <article key={concept.slug} className="lab-panel space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500">
                      {concept.status}
                    </span>
                    <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500">
                      {concept.topic}
                    </span>
                    <span className="rounded-full border border-line bg-paper-strong px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500">
                      {concept.simulationKind}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-ink-950">{concept.title}</h3>
                    <p className="text-sm text-ink-600">
                      {concept.slug} | {concept.contentFile}.json
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={localizeShareHref(concept.previewHref, locale)}
                    className="rounded-full border border-line bg-paper-strong px-4 py-2 text-sm font-medium text-ink-950 transition-colors hover:border-ink-950/20"
                  >
                    {copyText(locale, "Open preview", "打開預覽")}
                  </Link>
                  {concept.publicHref ? (
                    <Link
                      href={localizeShareHref(concept.publicHref, locale)}
                      className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:border-ink-950/20 hover:text-ink-950"
                    >
                      {copyText(locale, "Open public page", "打開公開頁面")}
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-3xl border border-line bg-paper-strong px-4 py-3 text-sm text-ink-700">
                  <p className="font-semibold text-ink-950">{copyText(locale, "Sections", "段落")}</p>
                  <p className="mt-1">{concept.sectionOrder.join(" -> ")}</p>
                </div>
                <div className="rounded-3xl border border-line bg-paper-strong px-4 py-3 text-sm text-ink-700">
                  <p className="font-semibold text-ink-950">{copyText(locale, "Read next", "下一步閱讀")}</p>
                  <p className="mt-1">
                    {concept.previewReadNext.length
                      ? concept.previewReadNext.map((item) => item.slug).join(", ")
                      : copyText(locale, "None", "沒有")}
                  </p>
                </div>
                <div className="rounded-3xl border border-line bg-paper-strong px-4 py-3 text-sm text-ink-700">
                  <p className="font-semibold text-ink-950">{copyText(locale, "Prereqs / related", "先修／相關")}</p>
                  <p className="mt-1">
                    {concept.prerequisiteSlugs.length
                      ? concept.prerequisiteSlugs.join(", ")
                      : copyText(locale, "No prerequisites", "沒有先修")}
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    {concept.relatedSlugs.length
                      ? concept.relatedSlugs.join(", ")
                      : copyText(locale, "No related links", "沒有相關連結")}
                  </p>
                </div>
                <div className="rounded-3xl border border-line bg-paper-strong px-4 py-3 text-sm text-ink-700">
                  <p className="font-semibold text-ink-950">{copyText(locale, "Track membership", "路徑歸屬")}</p>
                  <p className="mt-1">
                    {concept.starterTrackSlugs.length
                      ? concept.starterTrackSlugs.join(", ")
                      : copyText(locale, "Not used in a starter track", "未納入任何起步學習路徑")}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-3xl border border-line bg-paper px-4 py-3 text-sm text-ink-700">
                  {copyText(locale, "Equations / controls", "方程式／控制項")}: {concept.counts.equations} / {concept.counts.controls}
                </div>
                <div className="rounded-3xl border border-line bg-paper px-4 py-3 text-sm text-ink-700">
                  {copyText(locale, "Presets / overlays", "預設／覆蓋層")}: {concept.counts.presets} / {concept.counts.overlays}
                </div>
                <div className="rounded-3xl border border-line bg-paper px-4 py-3 text-sm text-ink-700">
                  {copyText(locale, "Graphs / prompts", "圖表／提示")}: {concept.counts.graphs} / {concept.counts.noticePrompts}
                </div>
                <div className="rounded-3xl border border-line bg-paper px-4 py-3 text-sm text-ink-700">
                  {copyText(locale, "Predictions / challenges", "預測／挑戰")}: {concept.counts.predictionItems} / {concept.counts.challengeItems}
                </div>
                <div className="rounded-3xl border border-line bg-paper px-4 py-3 text-sm text-ink-700">
                  {copyText(locale, "Worked / quick test", "解題示範／快速測驗")}: {concept.counts.workedExamples} / {concept.counts.quickTestQuestions}
                </div>
              </div>

              <p className="text-xs uppercase tracking-[0.18em] text-ink-500">
                {copyText(locale, "Last modified", "最後修改")} {formatTimestamp(concept.lastModified, locale)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="lab-label">{copyText(locale, "Starter tracks", "起步學習路徑")}</p>
          <h2 className="text-2xl font-semibold text-ink-950">
            {copyText(locale, "Track order and reuse", "路徑順序與重用")}
          </h2>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {preview.starterTracks.map((track) => (
            <article key={track.slug} className="lab-panel space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-ink-950">{track.title}</h3>
                  <p className="text-sm text-ink-600">{track.slug}</p>
                </div>
                <Link
                  href={localizeShareHref(track.publicHref, locale)}
                  className="rounded-full border border-line bg-paper-strong px-4 py-2 text-sm font-medium text-ink-950 transition-colors hover:border-ink-950/20"
                >
                  {copyText(locale, "Open track page", "打開路徑頁面")}
                </Link>
              </div>

              <div className="rounded-3xl border border-line bg-paper-strong px-4 py-4 text-sm text-ink-700">
                <p className="font-semibold text-ink-950">{copyText(locale, "Authored sequence", "編寫順序")}</p>
                <p className="mt-2">{track.conceptSlugs.join(" -> ")}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {track.conceptSlugs.map((conceptSlug, index) => (
                  <Link
                    key={conceptSlug}
                  href={localizeShareHref(track.conceptPreviewHrefs[index], locale)}
                  className="rounded-full border border-line bg-paper px-3 py-1 text-xs font-medium text-ink-700 transition-colors hover:border-ink-950/20 hover:text-ink-950"
                >
                    {copyText(locale, `Preview ${conceptSlug}`, `預覽 ${conceptSlug}`)}
                  </Link>
                ))}
              </div>

              <p className="text-sm text-ink-600">
                {copyText(
                  locale,
                  `Estimated study time: ${track.estimatedStudyMinutes} minutes`,
                  `預計學習時間：${track.estimatedStudyMinutes} 分鐘`,
                )}
              </p>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
