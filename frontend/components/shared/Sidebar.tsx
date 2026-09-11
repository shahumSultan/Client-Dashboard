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
  FileSignature,
} from "lucide-react";
import { SidebarShell, type NavItem } from "@/components/shared/SidebarShell";
import { useCurrentUser } from "@/hooks/useAuth";
import { useEngagements, clientActionLabel } from "@/hooks/useEngagements";

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
  const { data: engagements = [] } = useEngagements();

  // Onboarding only appears once there is paperwork to show, and flags itself
  // while the client still owes a step.
  const items: NavItem[] = engagements.length
    ? [
        NAV[0],
        {
          label: "Onboarding",
          href: "/onboarding",
          icon: FileSignature,
          attention: engagements.some((e) => clientActionLabel(e) !== null),
        },
        ...NAV.slice(1),
      ]
    : NAV;

  return (
    <SidebarShell
      items={items}
      kicker="Client Portal"
      open={open}
      onClose={onClose}
      footerSlot={
        user?.role === "admin" || user?.role === "staff" ? (
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
