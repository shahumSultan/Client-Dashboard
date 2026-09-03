"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { useCurrentUser } from "@/hooks/useAuth";
import { BrandMark } from "@/components/shared/BrandMark";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Match the href exactly — for index routes like /admin. */
  exact?: boolean;
}

interface SidebarShellProps {
  items: NavItem[];
  /** Small caps line under the wordmark: "Client Portal" / "Admin". */
  kicker: string;
  open?: boolean;
  onClose?: () => void;
  /** Rendered above the user footer — e.g. the admin/portal cross-link. */
  footerSlot?: React.ReactNode;
}

export function SidebarShell({
  items,
  kicker,
  open,
  onClose,
  footerSlot,
}: SidebarShellProps) {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();

  return (
    <>
      {/* Scrim: strong enough that the sheet clearly owns the screen */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col",
          "border-r border-hairline bg-deep/80 backdrop-blur-2xl",
          "transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between border-b border-hairline px-5 py-5">
          <BrandMark kicker={kicker} />
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="grid h-9 w-9 place-items-center rounded-[10px] text-subtle transition-colors hover:bg-white/[0.08] hover:text-fg lg:hidden cursor-pointer"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Main">
          {items.map(({ label, href, icon: Icon, exact }) => {
            const active = exact
              ? pathname === href
              : pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium",
                  "transition-[background-color,color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
                  active
                    ? "bg-brand-wash text-fg"
                    : "text-subtle hover:bg-white/[0.06] hover:text-fg"
                )}
              >
                {/* Active marker: position plus colour, not colour alone */}
                <span
                  className={cn(
                    "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-soft transition-opacity duration-200",
                    active ? "opacity-100" : "opacity-0"
                  )}
                  aria-hidden="true"
                />
                <Icon
                  size={17}
                  strokeWidth={2}
                  aria-hidden="true"
                  className={cn(
                    "shrink-0 transition-colors",
                    active ? "text-brand-soft" : "text-faint group-hover:text-muted"
                  )}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        {footerSlot && <div className="px-3 pb-2">{footerSlot}</div>}

        <div className="border-t border-hairline px-4 py-4">
          <div className="flex items-center gap-3">
            <Avatar
              name={user?.full_name}
              email={user?.email}
              src={user?.avatar_url}
              highlight={user?.role === "admin"}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">
                {user?.full_name ?? "Signed in"}
              </p>
              <p className="truncate text-xs text-faint">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
