"use client";
import { useState } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { Topbar } from "@/components/shared/Topbar";
import { usePathname } from "next/navigation";
import { useAuthToken } from "@/hooks/useAuth";

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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useAuthToken(); // Sets auth token on every render

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          title={getTitle(pathname)}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
