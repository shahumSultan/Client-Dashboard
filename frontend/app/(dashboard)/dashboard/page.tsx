"use client";
import { FolderOpen, MessageSquare, CheckSquare, Plus } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/hooks/useProjects";
import { useCurrentUser } from "@/hooks/useAuth";

export default function DashboardPage() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: user } = useCurrentUser();

  const activeProjects = projects.filter((p) => p.is_active && p.status !== "delivered");
  const deliveredProjects = projects.filter((p) => p.status === "delivered");

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.3),_transparent_60%)]" />
        <div className="relative">
          <p className="text-indigo-300 text-sm font-medium mb-1">{greeting()}</p>
          <h2 className="text-xl font-bold tracking-tight">
            {user?.full_name ? `Welcome back, ${user.full_name.split(" ")[0]}` : "Welcome back"}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Here's an overview of your projects with Enigma-Cube.
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          icon={<FolderOpen size={20} />}
          value={isLoading ? "—" : activeProjects.length}
          label="Active Projects"
        />
        <StatsCard
          icon={<MessageSquare size={20} />}
          value="—"
          label="Open Requests"
        />
        <StatsCard
          icon={<CheckSquare size={20} />}
          value={isLoading ? "—" : deliveredProjects.length}
          label="Delivered Projects"
        />
      </div>

      {/* Projects section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">Your Projects</h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200 border-dashed">
            <FolderOpen size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No projects yet</p>
            <p className="text-slate-400 text-sm mt-1">Projects assigned to you will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
