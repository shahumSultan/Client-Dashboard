"use client";
import Link from "next/link";
import { ArrowRight, FileSignature } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StageBadge } from "@/components/onboarding/StageBadge";
import { useEngagements } from "@/hooks/useEngagements";

const NEXT: Record<string, string> = {
  draft: "Finish and send the agreement",
  awaiting_signature: "Waiting for the client to sign",
  awaiting_payment: "Signed — waiting for payment",
  kickoff: "Paid — welcome pack and kickoff call next",
  complete: "Onboarding complete",
};

/** Entry point from the project page into its onboarding. */
export function OnboardingCard({ projectId }: { projectId: string }) {
  const { data: engagements, isLoading } = useEngagements(projectId);
  if (isLoading) return null;
  const e = engagements?.[0];

  return (
    <Link href={`/admin/projects/${projectId}/onboarding`} className="block">
      <Card interactive className={e ? "px-5 py-4" : "border-brand/30 px-5 py-4"}>
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-wash text-brand-soft">
            <FileSignature size={17} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-fg">Client onboarding</p>
              {e && <StageBadge stage={e.stage} />}
            </div>
            <p className="mt-0.5 text-xs text-subtle">
              {e ? NEXT[e.stage] : "Agreement, invoice, welcome pack and kickoff call — not started"}
            </p>
          </div>
          <span className="flex items-center gap-1.5 text-sm font-medium text-brand-soft">
            {e ? "Open" : "Prepare"}
            <ArrowRight size={15} aria-hidden="true" />
          </span>
        </div>
      </Card>
    </Link>
  );
}
