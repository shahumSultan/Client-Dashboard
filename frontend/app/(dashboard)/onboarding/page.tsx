"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileSignature, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { useEngagements, clientActionLabel } from "@/hooks/useEngagements";
import { stepsFor, progressOf } from "@/components/onboarding/steps";

export default function OnboardingIndexPage() {
  const router = useRouter();
  const { data: engagements = [], isLoading } = useEngagements();

  // Almost every client has exactly one; skip the list and open it.
  useEffect(() => {
    if (engagements.length === 1) router.replace(`/onboarding/${engagements[0].id}`);
  }, [engagements, router]);

  if (isLoading || engagements.length === 1) {
    return <Skeleton className="h-40 w-full rounded-card" />;
  }

  if (engagements.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={FileSignature}
          title="Nothing to sign"
          description="When Enigma-Cube sends you an agreement for a new project, it appears here."
        />
      </Card>
    );
  }

  return (
    <div className="stagger grid gap-4 sm:grid-cols-2">
      {engagements.map((e) => {
        const action = clientActionLabel(e);
        return (
          <Link key={e.id} href={`/onboarding/${e.id}`}>
            <Card interactive className="px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-fg">{e.project_name}</p>
                  <p className={action ? "mt-1 text-xs text-brand-soft" : "mt-1 text-xs text-subtle"}>
                    {action ?? "All done"}
                  </p>
                </div>
                <ArrowRight size={15} className="shrink-0 text-faint" aria-hidden="true" />
              </div>
              <Progress
                value={progressOf(stepsFor(e))}
                label={`${e.project_name} onboarding progress`}
                className="mt-5"
              />
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
