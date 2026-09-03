import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        // 40px tall on desktop, 44px on touch — text-base avoids iOS auto-zoom
        "h-11 w-full rounded-[10px] border border-hairline bg-white/[0.05] px-3.5 text-base text-fg",
        "placeholder:text-faint transition-colors duration-200 sm:h-10 sm:text-sm",
        "hover:border-hairline-strong focus:border-brand-soft/40 focus:bg-white/[0.07] focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-45",
        "aria-[invalid=true]:border-danger/60",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
