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
            <div className="pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-brand/30 blur-[60px]" aria-hidden="true" />
            <div className="relative flex flex-wrap items-center gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-white glow-brand">
                <FileSignature size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-soft">
                  Next step
                </p>
                <p className="mt-0.5 text-sm font-semibold text-fg">
                  {clientActionLabel(e)} — {e.project_name}
                </p>
              </div>
              <span className="flex items-center gap-1.5 text-sm font-medium text-brand-soft">
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
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-wash text-brand-soft">
        <Lock size={22} aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-lg font-semibold tracking-tight text-fg">
        Sign the agreement to open this project
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-subtle">
        It sets out the scope, deliverables, timeline and revision policy for{" "}
        {engagement.project_name}. It takes about two minutes, and the timeline opens the moment
        it&apos;s signed.
      </p>
      <Link
        href={`/onboarding/${engagement.id}`}
        className="mt-7 inline-flex h-11 items-center gap-2 rounded-[10px] bg-brand px-6 text-sm font-medium text-white transition-colors hover:bg-brand-hover glow-brand"
      >
        Review & sign
        <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </Card>
  );
}
