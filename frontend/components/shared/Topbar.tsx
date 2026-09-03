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
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-hairline bg-base/70 px-4 backdrop-blur-2xl lg:px-6">
      <button
        onClick={onMenuClick}
        aria-label="Open navigation"
        className="grid h-10 w-10 place-items-center rounded-[10px] text-subtle transition-colors hover:bg-white/[0.08] hover:text-fg lg:hidden cursor-pointer"
      >
        <Menu size={20} aria-hidden="true" />
      </button>

      <h1 className="flex-1 truncate text-[15px] font-semibold tracking-tight text-fg">
        {title}
      </h1>

      <div className="flex items-center gap-1.5">
        <NotificationBell />
        <span className="mx-1 h-5 w-px bg-hairline" aria-hidden="true" />
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-8 h-8 ring-1 ring-white/15",
              userButtonPopoverCard:
                "bg-elevated border border-white/[0.12] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)]",
              userButtonPopoverActionButton: "text-white/72 hover:bg-white/[0.06]",
              userButtonPopoverFooter: "hidden",
            },
          }}
        />
      </div>
    </header>
  );
}
