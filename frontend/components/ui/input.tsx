import * as React from "react";
import { cn } from "@/lib/utils";
import { useReadOnly } from "@/lib/read-only";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    // View-only accounts can still select and copy the text, just not edit it.
    const viewOnly = useReadOnly();
    return (
      <input
        ref={ref}
        className={cn(
          // 40px tall on desktop, 44px on touch — text-base avoids iOS auto-zoom
          "h-11 w-full rounded-[10px] border border-hairline bg-white/[0.05] px-3.5 text-base text-fg",
          "placeholder:text-faint transition-colors duration-200 sm:h-10 sm:text-sm",
          "hover:border-hairline-strong focus:border-brand-soft/40 focus:bg-white/[0.07] focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-45",
          "aria-[invalid=true]:border-danger/60",
          viewOnly && "cursor-default opacity-70 focus:border-hairline",
          className
        )}
        {...props}
        readOnly={viewOnly || props.readOnly}
      />
    );
  }
);
Input.displayName = "Input";
