"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

const WIDTHS = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
} as const;

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: keyof typeof WIDTHS;
  /** Rendered in a bottom bar, right-aligned — typically Cancel + confirm. */
  footer?: ReactNode;
  children?: ReactNode;
}

/**
 * Built on the native <dialog> element: the browser supplies the focus
 * trap, Escape handling, inertness of the page behind it and top-layer
 * stacking. A hand-rolled div-based modal has to reimplement all four, and
 * usually gets the focus trap subtly wrong.
 */
export function Dialog({ open, onClose, title, description, size = "md", footer, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // showModal() throws if the dialog is already open, and close() on an
    // already-closed dialog fires a spurious "close" event — so both are
    // guarded on the element's own state rather than on React's.
    if (open && !node.open) node.showModal();
    else if (!open && node.open) node.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      // The browser fires "cancel" for Escape and "close" for any dismissal;
      // routing both back to onClose keeps React's state in sync with the
      // element instead of letting the two drift apart.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      // Clicking the ::backdrop reports the <dialog> itself as the target,
      // since the backdrop is a pseudo-element and can't be hit directly.
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface-raised p-0 text-fg shadow-overlay",
        "backdrop:bg-black/50 backdrop:backdrop-blur-sm open:animate-scale-in",
        "m-auto max-h-[calc(100dvh-4rem)] overflow-visible",
        WIDTHS[size]
      )}
    >
      {open && (
        <div className="flex max-h-[calc(100dvh-4rem)] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line p-5">
            <div className="min-w-0">
              <h2 id="dialog-title" className="text-base font-semibold text-fg">
                {title}
              </h2>
              {description && <p className="mt-1 text-sm text-fg-subtle">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="-m-1 flex-none rounded-md p-1.5 text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto p-5">{children}</div>

          {footer && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-sunken p-4">
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
