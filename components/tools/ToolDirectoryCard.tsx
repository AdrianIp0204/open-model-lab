import { Link } from "@/i18n/navigation";

type ToolDirectoryCardProps = {
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  badge: string;
  accent: "sky" | "teal";
};

const accentTopClasses: Record<ToolDirectoryCardProps["accent"], string> = {
  sky: "from-sky-500/65 via-sky-500/18 to-transparent",
  teal: "from-teal-500/65 via-teal-500/18 to-transparent",
};

const accentBadgeClasses: Record<ToolDirectoryCardProps["accent"], string> = {
  sky: "border-sky-500/20 bg-sky-500/10 text-sky-800",
  teal: "border-teal-500/20 bg-teal-500/10 text-teal-800",
};

export function ToolDirectoryCard({
  title,
  description,
  href,
  ctaLabel,
  badge,
  accent,
}: ToolDirectoryCardProps) {
  return (
    <article className="motion-enter motion-card list-row-card relative overflow-hidden p-5 sm:p-6">
      <div
        className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accentTopClasses[accent]}`}
      />

      <div className="flex h-full flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={[
              "rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
              accentBadgeClasses[accent],
            ].join(" ")}
          >
            {badge}
          </span>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-ink-950">{title}</h2>
          <p className="max-w-2xl text-sm leading-7 text-ink-700">{description}</p>
        </div>

        <div className="mt-auto">
          <Link href={href} className="cta-primary">
            {ctaLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}
