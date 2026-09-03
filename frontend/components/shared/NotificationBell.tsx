"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
} from "@/hooks/useNotifications";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const unread = notifications.filter((n) => !n.is_read);
  const visible = notifications.slice(0, 8);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={
          unread.length > 0
            ? `Notifications, ${unread.length} unread`
            : "Notifications"
        }
        aria-expanded={open}
        className="relative grid h-10 w-10 place-items-center rounded-[10px] text-subtle transition-colors duration-200 hover:bg-white/[0.08] hover:text-fg cursor-pointer"
      >
        <Bell size={19} aria-hidden="true" />
        {unread.length > 0 && (
          <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 font-mono text-[9px] font-bold leading-none text-white ring-2 ring-base">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="glass-strong glass-sheen absolute right-0 top-12 z-50 w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-card shadow-[0_28px_70px_-24px_rgba(0,0,0,0.9)]"
          style={{ animation: "fade-up var(--dur) var(--ease) both" }}
        >
          <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
            <span className="text-sm font-semibold text-fg">Notifications</span>
            {unread.length > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1.5 text-xs font-medium text-brand-soft transition-colors hover:text-fg cursor-pointer"
              >
                <CheckCheck size={13} aria-hidden="true" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[22rem] overflow-y-auto">
            {visible.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Bell size={22} className="mx-auto mb-3 text-faint" aria-hidden="true" />
                <p className="text-sm text-subtle">You&apos;re all caught up.</p>
              </div>
            ) : (
              visible.map((n) => (
                <button
                  key={n.id}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-hairline px-4 py-3 text-left last:border-b-0",
                    "transition-colors duration-200 hover:bg-white/[0.06] cursor-pointer",
                    !n.is_read && "bg-brand-wash/50"
                  )}
                  onClick={() => {
                    if (!n.is_read) markRead.mutate(n.id);
                    setOpen(false);
                    if (n.link) router.push(n.link);
                  }}
                >
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      n.is_read ? "bg-white/15" : "bg-brand-soft"
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-sm leading-snug",
                        n.is_read ? "text-muted" : "font-medium text-fg"
                      )}
                    >
                      {n.title}
                    </span>
                    {n.body && (
                      <span className="mt-0.5 block truncate text-xs text-subtle">
                        {n.body}
                      </span>
                    )}
                    <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider text-faint">
                      {timeAgo(n.created_at)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
