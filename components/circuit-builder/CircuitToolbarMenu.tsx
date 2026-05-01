"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

type CircuitToolbarMenuRenderProps = {
  closeMenu: () => void;
};

type CircuitToolbarMenuProps = {
  menuId: string;
  label: string;
  ariaLabel: string;
  panelTitle?: string;
  panelDescription?: string;
  align?: "left" | "right";
  children:
    | ReactNode
    | ((controls: CircuitToolbarMenuRenderProps) => ReactNode);
};

const toolbarMenuOpenEventName = "open-model-lab:circuit-toolbar-menu-opened";

type ToolbarMenuOpenDetail = {
  menuId: string;
};

function isToolbarMenuOpenEvent(
  event: Event,
): event is CustomEvent<ToolbarMenuOpenDetail> {
  return (
    event instanceof CustomEvent &&
    typeof event.detail === "object" &&
    event.detail !== null &&
    typeof event.detail.menuId === "string"
  );
}

export function CircuitToolbarMenu({
  menuId,
  label,
  ariaLabel,
  panelTitle,
  panelDescription,
  align = "right",
  children,
}: CircuitToolbarMenuProps) {
  const panelId = useId();
  const panelTitleId = `${panelId}-title`;
  const panelDescriptionId = `${panelId}-description`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const closeMenu = useCallback(() => {
    setOpen(false);
  }, []);

  const closeMenuAndRestoreFocus = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleToolbarMenuOpened(event: Event) {
      if (!isToolbarMenuOpenEvent(event) || event.detail.menuId === menuId) {
        return;
      }

      closeMenu();
    }

    window.addEventListener(toolbarMenuOpenEventName, handleToolbarMenuOpened);

    return () => {
      window.removeEventListener(toolbarMenuOpenEventName, handleToolbarMenuOpened);
    };
  }, [closeMenu, menuId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const focusFrameId = window.requestAnimationFrame(() => {
      if (
        rootRef.current &&
        document.activeElement instanceof Node &&
        rootRef.current.contains(document.activeElement)
      ) {
        panelRef.current?.focus({ preventScroll: true });
      }
    });

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (
        rootRef.current &&
        event.target instanceof Node &&
        !rootRef.current.contains(event.target)
      ) {
        closeMenu();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeMenuAndRestoreFocus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrameId);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, closeMenuAndRestoreFocus, open]);

  const content =
    typeof children === "function"
      ? children({ closeMenu })
      : children;

  return (
    <div
      ref={rootRef}
      className="relative w-full sm:w-auto"
      data-circuit-toolbar-menu={menuId}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={ariaLabel}
        className={[
          "inline-flex min-h-10 w-full items-center justify-between gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/20 focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:w-auto",
          open
            ? "border-ink-950/25 bg-paper-strong text-ink-950"
            : "border-line bg-paper text-ink-950 hover:border-ink-950/20 hover:bg-paper-strong",
        ].join(" ")}
        onClick={() => {
          setOpen((current) => {
            const nextOpen = !current;
            if (nextOpen) {
              window.dispatchEvent(
                new CustomEvent<ToolbarMenuOpenDetail>(toolbarMenuOpenEventName, {
                  detail: { menuId },
                }),
              );
            }
            return nextOpen;
          });
        }}
      >
        <span>{label}</span>
        <span
          aria-hidden="true"
          className={[
            "inline-flex h-6 w-6 items-center justify-center rounded-full border border-line bg-paper text-[0.75rem] font-semibold text-ink-500 transition-transform",
            open ? "rotate-90" : "",
          ].join(" ")}
        >
          &gt;
        </span>
      </button>

      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-keyshortcuts="Escape"
          aria-label={panelTitle ? undefined : ariaLabel}
          aria-labelledby={panelTitle ? panelTitleId : undefined}
          aria-describedby={panelDescription ? panelDescriptionId : undefined}
          tabIndex={-1}
          className={[
            "mt-2 w-full space-y-3 rounded-[22px] border border-line bg-paper p-4 shadow-surface focus:outline-none sm:min-w-[20rem]",
            align === "right"
              ? "xl:absolute xl:right-0 xl:top-full xl:z-40 xl:w-[22rem]"
              : "xl:absolute xl:left-0 xl:top-full xl:z-40 xl:w-[22rem]",
          ].join(" ")}
        >
          {panelTitle || panelDescription ? (
            <div className="space-y-1.5">
              {panelTitle ? <p id={panelTitleId} className="lab-label">{panelTitle}</p> : null}
              {panelDescription ? (
                <p id={panelDescriptionId} className="text-xs leading-5 text-ink-600">{panelDescription}</p>
              ) : null}
            </div>
          ) : null}
          {content}
        </div>
      ) : null}
    </div>
  );
}
