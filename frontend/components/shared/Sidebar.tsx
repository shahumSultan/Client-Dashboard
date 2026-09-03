"use client";
import Link from "next/link";
import {
  LayoutDashboard,
  FolderOpen,
  CheckSquare,
  MessageSquare,
  Paperclip,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { SidebarShell, type NavItem } from "@/components/shared/SidebarShell";
import { useCurrentUser } from "@/hooks/useAuth";

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderOpen },
  { label: "Milestones", href: "/milestones", icon: CheckSquare },
  { label: "Requests", href: "/requests", icon: MessageSquare },
  { label: "Files", href: "/files", icon: Paperclip },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
];

export function Sidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const { data: user } = useCurrentUser();

  return (
    <SidebarShell
      items={NAV}
      kicker="Client Portal"
      open={open}
      onClose={onClose}
      footerSlot={
        user?.role === "admin" ? (
          <Link
            href="/admin"
            onClick={onClose}
            className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-brand-soft transition-colors duration-200 hover:bg-white/[0.06] hover:text-fg"
          >
            <ShieldCheck size={17} strokeWidth={2} aria-hidden="true" />
            Admin panel
          </Link>
        ) : null
      }
    />
  );
}
