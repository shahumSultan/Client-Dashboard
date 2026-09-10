"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
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

  // The API enforces admin on every route; this only avoids rendering an
  // admin shell that would fail every request behind it.
  useEffect(() => {
    if (!isLoading && user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) return <PageLoader />;
  if (user.role !== "admin") return <PageLoader label="Redirecting" />;

  return (
    <div className="flex h-dvh overflow-hidden">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={titleFor(pathname, PAGE_TITLES, "Admin")} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
