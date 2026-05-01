import { useTranslations } from "next-intl";
import { learningToolDefinitions } from "@/lib/tools/learning-tools";
import { ToolDirectoryCard } from "./ToolDirectoryCard";

export function ToolsDirectoryPage() {
  const t = useTranslations("ToolsDirectoryPage");

  return (
    <section className="space-y-6 sm:space-y-7">
      <article className="page-band grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="lab-label">{t("hero.eyebrow")}</span>
            <span className="rounded-full border border-line bg-paper px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-600">
              {t("hero.count", { count: learningToolDefinitions.length })}
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="max-w-4xl text-[2.15rem] font-semibold leading-[0.98] text-ink-950 sm:text-[2.85rem]">
              {t("hero.title")}
            </h1>
            <p className="max-w-3xl text-base leading-7 text-ink-700 sm:text-lg sm:leading-8">
              {t("hero.description")}
            </p>
          </div>
        </div>

        <aside className="lab-panel space-y-3 p-5">
          <p className="lab-label">{t("notes.eyebrow")}</p>
          <h2 className="text-xl font-semibold text-ink-950">{t("notes.title")}</h2>
          <p className="text-sm leading-7 text-ink-700">{t("notes.description")}</p>
        </aside>
      </article>

      <section className="space-y-4">
        <div className="space-y-2">
          <p className="lab-label">{t("catalog.eyebrow")}</p>
          <h2 className="text-2xl font-semibold text-ink-950">{t("catalog.title")}</h2>
          <p className="max-w-3xl text-sm leading-7 text-ink-700">
            {t("catalog.description")}
          </p>
        </div>

        <div
          className="grid gap-4 xl:grid-cols-2"
          data-onboarding-target="tools-directory"
        >
          {learningToolDefinitions.map((tool) => (
            <ToolDirectoryCard
              key={tool.id}
              title={t(`tools.${tool.messageKey}.title`)}
              description={t(`tools.${tool.messageKey}.description`)}
              href={tool.href}
              ctaLabel={t(`tools.${tool.messageKey}.cta`)}
              badge={t(`tools.${tool.messageKey}.badge`)}
              accent={tool.accent}
            />
          ))}
        </div>
      </section>
    </section>
  );
}
