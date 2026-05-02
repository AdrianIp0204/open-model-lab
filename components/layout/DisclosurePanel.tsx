import type { ReactNode } from "react";

type DisclosurePanelProps = {
  id?: string;
  title: string;
  summary: string;
  children: ReactNode;
  eyebrow?: string;
  defaultOpen?: boolean;
  className?: string;
  bodyClassName?: string;
  triggerTestId?: string;
};

export function DisclosurePanel({
  id,
  title,
  summary,
  children,
  eyebrow,
  defaultOpen = false,
  className = "",
  bodyClassName = "",
  triggerTestId,
}: DisclosurePanelProps) {
  return (
    <details
      id={id}
      {...(defaultOpen ? { open: true } : {})}
      className={[
        "group rounded-[28px] border border-line bg-paper-strong/96 p-5 shadow-surface sm:p-6",
        className,
      ]
        .join(" ")
        .trim()}
    >
      <summary
        data-disclosure-panel-trigger=""
        data-testid={triggerTestId}
        className="flex cursor-pointer list-none items-start justify-between gap-4 [&::-webkit-details-marker]:hidden"
      >
        <div className="min-w-0 space-y-2">
          {eyebrow ? <p className="lab-label">{eyebrow}</p> : null}
          <p className="text-xl font-semibold text-ink-950 sm:text-2xl">{title}</p>
          <p className="max-w-2xl text-base leading-7 text-ink-700">{summary}</p>
        </div>
        <span
          aria-hidden="true"
          className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-base font-semibold text-ink-500 transition-transform group-open:rotate-90"
        >
          &gt;
        </span>
      </summary>

      <div className={["mt-5", bodyClassName].join(" ").trim()}>{children}</div>
    </details>
  );
}
