"use client";
import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Lock, FileSignature } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { useEngagement } from "@/hooks/useEngagements";
import {
  stepsFor, initialStep, progressOf, type StepKey,
} from "@/components/onboarding/steps";
import {
  AgreementPanel, InvoicePanel, WelcomePanel, PortalPanel, CallPanel, LaunchPanel, LockedPanel,
} from "@/components/onboarding/ClientPanels";
import { cn } from "@/lib/utils";

export default function OnboardingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: e, isLoading } = useEngagement(id);
  // Null until the client picks a step: until then they land on whatever is
  // next for them, which moves on by itself as steps are completed.
  const [active, setActive] = useState<StepKey | null>(null);

  function go(key: StepKey) {
    setActive(key);
    // The shell scrolls <main>, not the window.
    document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (isLoading) {
    return (
      <div className="space-y-5" aria-busy="true">
        <Skeleton className="h-28 w-full rounded-card-lg" />
        <Skeleton className="h-96 w-full rounded-card" />
      </div>
    );
  }

  if (!e) {
    return (
      <Card>
        <EmptyState
          icon={FileSignature}
          title="Not found"
          description="This onboarding may have been withdrawn, or it belongs to another workspace."
        />
      </Card>
    );
  }

  const steps = stepsFor(e);
  const current = steps.find((s) => s.key === (active ?? initialStep(e)))!;
  const progress = progressOf(steps);
  const firstTodo = initialStep(e);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-subtle transition-colors hover:text-fg"
          >
            <ArrowLeft size={13} aria-hidden="true" />
            Dashboard
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-fg">
            Getting started with {e.project_name}
          </h1>
        </div>
        <div className="w-full max-w-[220px]">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-subtle">Onboarding</span>
            <span className="tabular font-medium text-fg">{progress}%</span>
          </div>
          <Progress value={progress} label="Onboarding progress" />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[250px_1fr] lg:items-start">
        <nav aria-label="Onboarding steps" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
          <ol className="flex gap-2 lg:sticky lg:top-0 lg:flex-col lg:gap-1">
            {steps.map((s, i) => {
              const isActive = s.key === current.key;
              return (
                <li key={s.key} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => go(s.key)}
                    aria-current={isActive ? "step" : undefined}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 rounded-[12px] px-3 py-2.5 text-left transition-colors duration-200",
                      isActive ? "glass border-brand/30 bg-brand-wash" : "hover:bg-white/[0.05]"
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-medium",
                        s.state === "done" && "bg-success-wash text-success",
                        s.state === "todo" && (isActive ? "bg-brand text-white" : "border border-brand-soft/50 text-brand-soft"),
                        s.state === "locked" && "border border-hairline text-faint"
                      )}
                      aria-hidden="true"
                    >
                      {s.state === "done" ? <Check size={13} /> : s.state === "locked" ? <Lock size={11} /> : i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className={cn("block whitespace-nowrap text-sm font-medium", s.state === "locked" ? "text-subtle" : "text-fg")}>
                        {s.label}
                      </span>
                      <span className="hidden text-xs text-subtle lg:block">{s.hint}</span>
                      <span className="sr-only">
                        {s.state === "done" ? "(done)" : s.state === "locked" ? "(locked)" : "(to do)"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div key={current.key} className="min-w-0 animate-fade-up">
          {current.state === "locked" ? (
            <LockedPanel step={current} current={firstTodo} go={go} />
          ) : current.key === "agreement" ? (
            <AgreementPanel engagement={e} go={go} />
          ) : current.key === "invoice" ? (
            <InvoicePanel engagement={e} go={go} />
          ) : current.key === "welcome" ? (
            <WelcomePanel engagement={e} go={go} />
          ) : current.key === "portal" ? (
            <PortalPanel engagement={e} />
          ) : current.key === "call" ? (
            <CallPanel engagement={e} go={go} />
          ) : (
            <LaunchPanel engagement={e} steps={steps} go={go} />
          )}
        </div>
      </div>
    </div>
  );
}
