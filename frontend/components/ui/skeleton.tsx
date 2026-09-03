import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("shimmer rounded-[10px] bg-white/[0.05]", className)}
      {...props}
    />
  );
}
