import type { ReactNode } from "react";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  align?: "left" | "center";
  density?: "default" | "dense";
  level?: 1 | 2 | 3;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  density = "default",
  level = 2,
}: SectionHeadingProps) {
  const alignClass = align === "center" ? "items-center text-center" : "items-start text-left";
  const dense = density === "dense";
  const HeadingTag = `h${level}` as const;

  return (
    <div
      className={`motion-enter motion-enter-tight flex flex-col ${dense ? "gap-3" : "gap-4"} ${alignClass}`}
    >
      <p className="lab-label">{eyebrow}</p>
      <div
        className={[
          "flex w-full flex-col sm:flex-row sm:justify-between",
          dense ? "gap-3 sm:items-start" : "gap-5 sm:items-end",
        ].join(" ")}
      >
        <div className={dense ? "max-w-4xl space-y-2.5" : "max-w-3xl space-y-3.5"}>
          <HeadingTag
            className={[
              "font-semibold text-ink-950",
              dense ? "text-[1.9rem] sm:text-[2.15rem]" : "text-[2.4rem] sm:text-[3rem]",
            ].join(" ")}
          >
            {title}
          </HeadingTag>
          <p
            className={[
              "max-w-2xl text-ink-700",
              dense ? "text-base leading-7" : "text-lg leading-8",
            ].join(" ")}
          >
            {description}
          </p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
