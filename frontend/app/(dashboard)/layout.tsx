"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/shared/Sidebar";
import { Topbar } from "@/components/shared/Topbar";
import { useCurrentUser } from "@/hooks/useAuth";
import { PageLoader } from "@/components/shared/PageLoader";
import { titleFor } from "@/lib/page-title";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/onboarding": "Onboarding",
  "/projects": "Projects",
  "/milestones": "Milestones",
  "/requests": "Requests",
  "/files": "Files",
  "/analytics": "Analytics",
  "/settings": "Settings",
};


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: user, isLoading } = useCurrentUser();

  useEffect(() => {
    if (isLoading || !user) return;

    // The client portal is scoped to one organization. An admin has none, and
    // for them `list_projects` returns every client's work, which reads as
    // "why can I see all these projects?" — send them to the admin panel.
    if ((user.role === "admin" || user.role === "staff") && !user.organization_id) {
      router.replace("/admin");
      return;
    }

    // Self-serve signup finishes at /welcome, where the client names their
    // company and we provision the organization. Until that runs there is no
    // tenant to scope anything to, so the portal has nothing to show.
    if (!user.organization_id) {
      router.replace("/welcome");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) return <PageLoader />;
  if (!user.organization_id) {
    return (
      <PageLoader
        label={user.role === "admin" || user.role === "staff" ? "Opening admin" : "Setting up your workspace"}
      />
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={titleFor(pathname, PAGE_TITLES, "Client Portal")}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
