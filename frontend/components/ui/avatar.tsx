import * as React from "react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-11 w-11 text-sm",
} as const;

interface AvatarProps {
  name?: string | null;
  email?: string | null;
  src?: string | null;
  size?: keyof typeof SIZES;
  /** Ring the avatar in brand colour to mark the Enigma-Cube team. */
  highlight?: boolean;
  className?: string;
}

function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split("@")[0] || "";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  email,
  src,
  size = "md",
  highlight = false,
  className,
}: AvatarProps) {
  const label = name || email || "User";
  const base = cn(
    "grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold",
    SIZES[size],
    highlight ? "ring-2 ring-brand/50" : "ring-1 ring-hairline",
    className
  );

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={label} className={cn(base, "object-cover")} />;
  }

  return (
    <span className={cn(base, "bg-brand-wash text-brand-soft")} aria-label={label} role="img">
      {initials(name, email)}
    </span>
  );
}
