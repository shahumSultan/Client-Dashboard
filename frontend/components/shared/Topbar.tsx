"use client";
import { Menu } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { NotificationBell } from "@/components/shared/NotificationBell";

interface TopbarProps {
  title: string;
  onMenuClick?: () => void;
}

export function Topbar({ title, onMenuClick }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-hairline bg-base/90 px-4 backdrop-blur-md lg:px-6">
      <button
        onClick={onMenuClick}
        aria-label="Open navigation"
        className="grid h-10 w-10 place-items-center text-subtle transition-colors hover:bg-tint-strong hover:text-fg lg:hidden cursor-pointer"
      >
        <Menu size={20} aria-hidden="true" />
      </button>

      <h1 className="flex-1 truncate text-sm font-medium text-muted">
        {title}
      </h1>

      <div className="flex items-center gap-1.5">
        <NotificationBell />
        <span className="mx-1 h-5 w-px bg-hairline" aria-hidden="true" />
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-8 h-8 ring-1 ring-hairline-strong",
              userButtonPopoverCard:
                "bg-elevated border border-hairline-strong shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)]",
              userButtonPopoverActionButton: "text-muted hover:bg-tint-strong",
              userButtonPopoverFooter: "hidden",
            },
          }}
        />
      </div>
    </header>
  );
}
