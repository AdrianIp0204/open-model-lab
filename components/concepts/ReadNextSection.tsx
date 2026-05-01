import { useTranslations } from "next-intl";
import type { ReadNextRecommendation } from "@/lib/content";
import { Link } from "@/i18n/navigation";

type ReadNextSectionProps = {
  items: ReadNextRecommendation[];
  sectionTitle?: string;
};

export function ReadNextSection({ items, sectionTitle }: ReadNextSectionProps) {
  const t = useTranslations("ReadNextSection");

  if (!items.length) {
    return null;
  }

  return (
    <article className="lab-panel p-5 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div className="space-y-2">
          <p className="lab-label">{sectionTitle ?? t("label")}</p>
          <h2 className="text-2xl font-semibold text-ink-950">
            {t("title")}
          </h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-ink-700">
          {t("description")}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Link
            key={`${item.slug}-${item.reasonKind}`}
            href={`/concepts/${item.slug}`}
            className="group rounded-[24px] border border-line bg-paper-strong px-4 py-4 transition-colors hover:border-teal-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-strong"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-teal-700">
                {item.reasonLabel}
              </span>
              <span className="rounded-full border border-line bg-white/70 px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-ink-500">
                {item.topic}
              </span>
            </div>

            <h3 className="mt-3 text-base font-semibold text-ink-950 transition-colors group-hover:text-teal-700">
              {item.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-ink-700">{item.summary}</p>
          </Link>
        ))}
      </div>
    </article>
  );
}
