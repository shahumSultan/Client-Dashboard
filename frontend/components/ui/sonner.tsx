"use client";

import {
  CircleCheck,
  Info,
  LoaderCircle,
  OctagonX,
  TriangleAlert,
} from "lucide-react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// The product is dark-only, so the toaster is pinned to dark rather than
// reading a theme provider that does not exist.
const Toaster = (props: ToasterProps) => (
  <Sonner
    theme="dark"
    className="toaster group"
    icons={{
      success: <CircleCheck className="h-4 w-4" />,
      info: <Info className="h-4 w-4" />,
      warning: <TriangleAlert className="h-4 w-4" />,
      error: <OctagonX className="h-4 w-4" />,
      loading: <LoaderCircle className="h-4 w-4 animate-spin" />,
    }}
    toastOptions={{
      classNames: {
        toast:
          "group toast !bg-elevated/95 !backdrop-blur-xl !border-hairline !text-fg !rounded-card shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]",
        description: "!text-subtle",
        actionButton: "!bg-brand !text-white",
        cancelButton: "!bg-white/[0.08] !text-muted",
      },
    }}
    {...props}
  />
);

export { Toaster };
