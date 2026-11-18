"use client";
import Link from "next/link";
import { ArrowRight, FileSignature, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useEngagements, clientActionLabel } from "@/hooks/useEngagements";
import type { Engagement } from "@/lib/types";

/** Top-of-dashboard prompt for whatever onboarding step the client owes. */
export function OnboardingBanner() {
  const { data: engagements = [] } = useEngagements();
  const pending = engagements.filter((e) => clientActionLabel(e) !== null);
  if (!pending.length) return null;

  return (
    <div className="space-y-3">
      {pending.map((e) => (
        <Link key={e.id} href={`/onboarding/${e.id}`} className="block">
          <Card interactive className="relative border-brand/40 px-5 py-4 sm:px-6">
            <div className="relative flex flex-wrap items-center gap-4">
              <FileSignature size={18} className="shrink-0 text-muted" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2.5 text-sm font-semibold text-fg-strong">
                  <span className="signal-square" aria-hidden="true" />
                  {clientActionLabel(e)}
                </p>
                <p className="mt-0.5 pl-[16px] text-xs text-subtle">{e.project_name} · your next step</p>
              </div>
              <span className="link-signal flex items-center gap-1.5 text-sm font-medium">
                Continue
                <ArrowRight size={15} aria-hidden="true" />
              </span>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

/**
 * Stands in for a project until its agreement is signed. Nothing moves
 * forward without it, and the project page is where that is most visible.
 */
export function ProjectGate({ engagement }: { engagement: Engagement }) {
  return (
    <Card className="px-6 py-16 text-center">
      <Lock size={22} className="mx-auto text-muted" aria-hidden="true" />
      <h2 className="mt-5 text-lg font-normal tracking-tight text-fg-strong">
        Sign the agreement to open this project
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-subtle">
        It sets out the scope, deliverables, timeline and revision policy for{" "}
        {engagement.project_name}. It takes about two minutes, and the timeline opens the moment
        it&apos;s signed.
      </p>
      <Link
        href={`/onboarding/${engagement.id}`}
        className="mt-7 inline-flex h-11 items-center gap-2 bg-brand px-6 text-sm font-medium text-white transition-colors hover:bg-brand-hover glow-brand"
      >
        Review & sign
        <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </Card>
  );
}
