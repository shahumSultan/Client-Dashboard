"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ReadOnlyProvider } from "@/lib/read-only";
import { Topbar } from "@/components/shared/Topbar";
import { useCurrentUser } from "@/hooks/useAuth";
import { PageLoader } from "@/components/shared/PageLoader";
import { titleFor } from "@/lib/page-title";

const PAGE_TITLES: Record<string, string> = {
  "/admin": "Overview",
  "/admin/clients": "Clients",
  "/admin/projects": "Projects",
  "/admin/requests": "Requests",
  "/admin/comments": "Comments",
  "/admin/users": "Users",
};


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: user, isLoading } = useCurrentUser();

  const isTeam = user?.role === "admin" || user?.role === "staff";

  // The API enforces this on every route; this only avoids rendering an
  // admin shell that would fail every request behind it.
  useEffect(() => {
    if (!isLoading && user && !isTeam) {
      router.replace("/dashboard");
    }
  }, [user, isLoading, isTeam, router]);

  if (isLoading || !user) return <PageLoader />;
  if (!isTeam) return <PageLoader label="Redirecting" />;
  const viewOnly = user.role === "staff";

  return (
    <div className="flex h-dvh overflow-hidden">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={titleFor(pathname, PAGE_TITLES, "Admin")} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">
            {viewOnly && (
              <div className="mb-6 flex items-start gap-3 rounded-card border border-info/30 bg-info-wash px-4 py-3 text-sm">
                <Eye size={16} className="mt-0.5 shrink-0 text-info" aria-hidden="true" />
                <p className="text-muted">
                  <span className="font-medium text-fg">View-only access.</span> You can open and read
                  everything here; changes are made by an admin.
                </p>
              </div>
            )}
            <ReadOnlyProvider value={viewOnly}>{children}</ReadOnlyProvider>
          </div>
        </main>
      </div>
    </div>
  );
}
