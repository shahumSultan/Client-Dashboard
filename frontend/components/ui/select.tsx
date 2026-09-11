"use client";
import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReadOnly } from "@/lib/read-only";

/**
 * A styled native <select>.
 *
 * Deliberately not a custom listbox: the native control gets the system picker
 * on mobile, keyboard and screen-reader behaviour for free, and never traps
 * focus. The chevron is decorative and drawn over the (hidden) native arrow.
 */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => {
  const viewOnly = useReadOnly();
  return (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        "h-11 w-full cursor-pointer appearance-none rounded-[10px] border border-hairline bg-white/[0.05]",
        "pl-3.5 pr-10 text-base text-fg transition-colors duration-200 sm:h-10 sm:text-sm",
        "hover:border-hairline-strong focus:border-brand-soft/40 focus:bg-white/[0.07] focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-45",
        // The dropdown list itself is painted by the OS — force dark options
        "[&>option]:bg-elevated [&>option]:text-fg",
        className
      )}
      {...props}
      disabled={viewOnly || props.disabled}
    >
      {children}
    </select>
    <ChevronDown
      size={16}
      aria-hidden="true"
      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-subtle"
    />
  </div>
  );
});
Select.displayName = "Select";
