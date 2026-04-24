"use client";
import { Menu } from "lucide-react";
import { UserButton, Show } from "@clerk/nextjs";
import { NotificationBell } from "@/components/shared/NotificationBell";

interface TopbarProps {
  title: string;
  onMenuClick?: () => void;
}

export function Topbar({ title, onMenuClick }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 h-14 bg-white/90 backdrop-blur-md border-b border-slate-200/80 flex items-center gap-4 px-4 lg:px-6">
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
      >
        <Menu size={20} />
      </button>

      <h1 className="flex-1 text-base font-semibold text-slate-900 tracking-tight">{title}</h1>

      <div className="flex items-center gap-2">
        <NotificationBell />
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <Show when="signed-in">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-8 h-8",
                userButtonPopoverCard: "shadow-xl border border-slate-200",
              },
            }}
          />
        </Show>
      </div>
    </header>
  );
}
