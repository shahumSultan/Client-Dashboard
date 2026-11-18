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
          // 40px tall on desktop, 44px on touch - text-base avoids iOS auto-zoom
          // The site's field: no box, a rule beneath it, the rule turns red on focus.
          "h-11 w-full border-0 border-b border-hairline-strong bg-transparent px-0 text-base text-fg",
          "placeholder:text-subtle transition-colors duration-200 sm:h-10 sm:text-sm",
          "hover:border-muted focus:border-brand focus:outline-none focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-45",
          "aria-[invalid=true]:border-danger/60",
          viewOnly && "cursor-default opacity-70 focus:border-hairline-strong",
          className
        )}
        {...props}
        readOnly={viewOnly || props.readOnly}
      />
    );
  }
);
Input.displayName = "Input";
