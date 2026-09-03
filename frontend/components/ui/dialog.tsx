"use client";
import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: React.ReactNode;
  /** Accessible name, announced when the dialog opens. */
  label?: string;
}

export function Dialog({ open, onOpenChange, children, label }: DialogProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
        return;
      }
      // Keep Tab inside the dialog — an escape route that leaks focus back to
      // the page behind the scrim is disorienting for keyboard users.
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    // Stop the page behind from scrolling while the dialog owns the screen.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const raf = requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLElement>(
          'input,textarea,select,button:not([data-dialog-close])'
        )
        ?.focus();
    });

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(raf);
      previouslyFocused?.focus?.();
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
    >
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        style={{ animation: "fade-up var(--dur-fast) var(--ease) both" }}
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className="relative z-10 w-full sm:w-auto"
        style={{ animation: "fade-up var(--dur) var(--ease) both" }}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "glass-strong glass-sheen relative max-h-[88vh] w-full overflow-y-auto",
        // Bottom sheet on mobile, centred panel from sm up
        "rounded-t-[20px] sm:max-w-md sm:rounded-card-lg",
        "shadow-[0_32px_80px_-24px_rgba(0,0,0,0.9)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 pt-6 pb-4", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-lg font-semibold tracking-tight text-fg", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1.5 text-sm leading-relaxed text-subtle", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex justify-end gap-3 border-t border-hairline px-6 py-4",
        className
      )}
      {...props}
    />
  );
}

export function DialogClose({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      data-dialog-close
      onClick={onClick}
      aria-label="Close dialog"
      className={cn(
        "absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-[10px] text-subtle",
        "transition-colors duration-200 hover:bg-white/[0.08] hover:text-fg cursor-pointer",
        className
      )}
    >
      <X size={16} aria-hidden="true" />
    </button>
  );
}
