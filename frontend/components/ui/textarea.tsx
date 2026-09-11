import * as React from "react";
import { cn } from "@/lib/utils";
import { useReadOnly } from "@/lib/read-only";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  const viewOnly = useReadOnly();
  return (
  <textarea
    ref={ref}
    className={cn(
      "min-h-[88px] w-full resize-none rounded-[10px] border border-hairline bg-white/[0.05] px-3.5 py-3",
      "text-base leading-relaxed text-fg placeholder:text-faint transition-colors duration-200 sm:text-sm",
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
});
Textarea.displayName = "Textarea";
