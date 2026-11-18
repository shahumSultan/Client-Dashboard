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
      <section className="pb-1 pt-2">
        <div>
          <h2 className="text-balance text-3xl font-normal leading-[1.05] tracking-tight text-fg-strong sm:text-4xl">
            {greeting()}
            {firstName ? (
              <>
                , <em className="italic">{firstName}</em>.
              </>
            ) : (
              "."
            )}
          </h2>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted">
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
        <h2 className="mb-4 text-sm font-sans font-semibold tracking-tight text-fg-strong">
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
