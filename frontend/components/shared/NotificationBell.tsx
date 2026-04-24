"use client";
import { useState, useRef, useEffect } from "react";
import { Bell, Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn, timeAgo } from "@/lib/utils";
import { useNotifications, useMarkRead, useMarkAllRead } from "@/hooks/useNotifications";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const unread = notifications.filter((n) => !n.is_read);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
      >
        <Bell size={20} />
        {unread.length > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-900">Notifications</span>
            {unread.length > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              >
                <Check size={13} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
            {notifications.slice(0, 8).length === 0 ? (
              <div className="py-8 text-center">
                <Bell size={24} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">All caught up!</p>
              </div>
            ) : (
              notifications.slice(0, 8).map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer",
                    !n.is_read && "bg-indigo-50/60"
                  )}
                  onClick={() => {
                    if (!n.is_read) markRead.mutate(n.id);
                    setOpen(false);
                  }}
                >
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full mt-1.5 shrink-0",
                      n.is_read ? "bg-slate-200" : "bg-indigo-500"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm leading-tight", n.is_read ? "text-slate-600" : "text-slate-900 font-medium")}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{n.body}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {n.link && (
                    <ExternalLink size={13} className="text-slate-300 shrink-0 mt-1" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
