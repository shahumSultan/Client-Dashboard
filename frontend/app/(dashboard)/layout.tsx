"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/shared/Sidebar";
import { Topbar } from "@/components/shared/Topbar";
import { useCurrentUser } from "@/hooks/useAuth";
import { PageLoader } from "@/components/shared/PageLoader";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/projects": "Projects",
  "/milestones": "Milestones",
  "/requests": "Requests",
  "/files": "Files",
  "/analytics": "Analytics",
  "/settings": "Settings",
};

function getTitle(pathname: string): string {
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (pathname === path || pathname.startsWith(path + "/")) return title;
  }
  return "Client Portal";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: user, isLoading } = useCurrentUser();

  // Self-serve signup finishes at /welcome, where the client names their
  // company and we provision the organization. Until that runs there is no
  // tenant to scope anything to, so the portal has nothing to show.
  useEffect(() => {
    if (!isLoading && user && !user.organization_id) {
      router.replace("/welcome");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) return <PageLoader />;
  if (!user.organization_id) return <PageLoader label="Setting up your workspace" />;

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={getTitle(pathname)}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
