"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  CheckSquare,
  MessageSquare,
  Paperclip,
  BarChart3,
  Zap,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useAuth";

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderOpen },
  { label: "Milestones", href: "/milestones", icon: CheckSquare },
  { label: "Requests", href: "/requests", icon: MessageSquare },
  { label: "Files", href: "/files", icon: Paperclip },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg">
              <Zap size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-white font-semibold text-sm tracking-tight">Enigma-Cube</span>
              <p className="text-slate-500 text-[10px] font-medium uppercase tracking-widest leading-none mt-0.5">
                Client Portal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                  active
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                )}
              >
                <Icon
                  size={17}
                  className={cn(
                    "shrink-0 transition-colors",
                    active ? "text-white" : "text-slate-500 group-hover:text-slate-300"
                  )}
                />
                {label}
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {user?.full_name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-300 text-sm font-medium truncate">
                {user?.full_name ?? "User"}
              </p>
              <p className="text-slate-500 text-xs truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
