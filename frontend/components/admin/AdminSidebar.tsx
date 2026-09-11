"use client";
import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  FolderOpen,
  MessageSquare,
  MessagesSquare,
  Users,
  ArrowLeft,
} from "lucide-react";
import { SidebarShell, type NavItem } from "@/components/shared/SidebarShell";
import { useCurrentUser } from "@/hooks/useAuth";

const NAV: NavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Clients", href: "/admin/clients", icon: Building2 },
  { label: "Projects", href: "/admin/projects", icon: FolderOpen },
  { label: "Requests", href: "/admin/requests", icon: MessageSquare },
  { label: "Comments", href: "/admin/comments", icon: MessagesSquare },
  { label: "Users", href: "/admin/users", icon: Users },
];

export function AdminSidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const { data: user } = useCurrentUser();
  // An admin without an organization has no client portal to go back to -
  // the link would just bounce them here again.
  const hasPortal = !!user?.organization_id;

  return (
    <SidebarShell
      items={NAV}
      kicker="Admin"
      open={open}
      onClose={onClose}
      footerSlot={
        !hasPortal ? null : (
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-subtle transition-colors duration-200 hover:bg-white/[0.06] hover:text-fg"
        >
          <ArrowLeft size={17} strokeWidth={2} aria-hidden="true" />
          Back to portal
        </Link>
        )
      }
    />
  );
}
