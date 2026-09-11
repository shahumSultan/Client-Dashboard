"use client";
import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReadOnly } from "@/lib/read-only";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
  size?: "sm" | "md" | "lg" | "icon";
  /** Shows a spinner and blocks input - never leave an async action silent. */
  loading?: boolean;
  /** Stays usable for view-only accounts - for actions that change nothing
   *  (cancel, close, copy). Everything else is disabled for them. */
  allowReadOnly?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "default", size = "md", loading = false, allowReadOnly = false, disabled, children, ...props },
    ref
  ) => {
    const blocked = useReadOnly() && !allowReadOnly;
    const base =
      "relative inline-flex items-center justify-center gap-2 rounded-[10px] font-medium select-none cursor-pointer " +
      "transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] " +
      // Scale press gives tactile feedback without shifting surrounding layout
      "active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none";

    const variants = {
      default:
        "bg-brand text-white hover:bg-brand-hover active:bg-brand-press glow-brand",
      outline:
        "glass text-fg hover:bg-glass-strong hover:border-hairline-strong",
      ghost: "text-muted hover:text-fg hover:bg-white/[0.06]",
      destructive:
        "bg-danger-wash text-danger border border-danger/30 hover:bg-danger/20 hover:border-danger/50",
      secondary:
        "bg-white/[0.08] text-fg border border-hairline hover:bg-white/[0.12]",
    };

    const sizes = {
      // Comfortable targets: md/lg clear the 44px guidance with surrounding gap
      sm: "text-xs px-3 h-8",
      md: "text-sm px-4 h-10",
      lg: "text-sm px-6 h-11",
      icon: "h-10 w-10 p-0",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading || blocked}
        title={blocked ? "View-only access" : props.title}
        aria-busy={loading || undefined}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
