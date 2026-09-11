"use client";
import { FolderOpen, Rocket, Activity } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useProjects } from "@/hooks/useProjects";
import { useCurrentUser } from "@/hooks/useAuth";
import { OnboardingBanner } from "@/components/onboarding/OnboardingBanner";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: user } = useCurrentUser();

  const active = projects.filter((p) => p.is_active && p.status !== "delivered");
  const delivered = projects.filter((p) => p.status === "delivered");

  // Average completion across live work - the single number that answers
  // "how far along is everything?"
  const overall =
    active.length > 0
      ? Math.round(
          active.reduce((sum, p) => sum + p.completion_percentage, 0) / active.length
        )
      : 0;

  const firstName = user?.full_name?.split(" ")[0];

  return (
    <div className="space-y-7">
      <section className="glass glass-sheen relative overflow-hidden rounded-card-lg px-6 py-7 sm:px-8">
        {/* Brand pool behind the panel, so the glass has colour to refract */}
        <div
          className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-brand/25 blur-[90px]"
          aria-hidden="true"
        />
        <div className="relative">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand-soft">
            {greeting()}
          </p>
          <h2 className="mt-2.5 text-2xl font-semibold tracking-tight text-fg">
            {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-subtle">
            Everything Enigma-Cube is building for you - what&apos;s shipped, what&apos;s
            in flight, and what&apos;s still ahead.
          </p>
        </div>
      </section>

      <OnboardingBanner />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard
          icon={FolderOpen}
          label="Active projects"
          value={active.length}
          loading={isLoading}
          detail={active.length === 1 ? "1 project in flight" : `${active.length} in flight`}
        />
        <StatsCard
          icon={Activity}
          label="Overall progress"
          value={`${overall}%`}
          loading={isLoading}
          detail="Averaged across active work"
        />
        <StatsCard
          icon={Rocket}
          label="Delivered"
          value={delivered.length}
          loading={isLoading}
          detail={delivered.length === 0 ? "Nothing shipped yet" : "Completed and handed over"}
        />
      </div>

      <section>
        <h2 className="mb-4 text-sm font-semibold tracking-tight text-fg">
          Your projects
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="glass space-y-4 rounded-card p-5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-1.5 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="glass rounded-card">
            <EmptyState
              icon={FolderOpen}
              title="No projects yet"
              description="Once the Enigma-Cube team sets up your first project, it will appear here with its timeline and progress."
            />
          </div>
        ) : (
          <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
