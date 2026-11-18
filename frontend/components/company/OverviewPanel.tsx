"use client";
import { ArrowRight, CalendarClock, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExpiryBadge, daysUntil } from "@/components/company/DocumentsPanel";
import {
  openDocument, useBankAccounts, useCompanyDocuments, useCompanyProfile, useTeam,
} from "@/hooks/useCompany";
import { errorDetail } from "@/hooks/useEngagements";
import { CATEGORY_LABELS, DOCUMENT_CATEGORIES } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export type CompanyTab = "overview" | "documents" | "profile" | "bank" | "team";

function Stat({ value, label, onClick }: { value: number | string; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="glass glass-hover group cursor-pointer p-5 text-left">
      <p className="tabular font-display text-4xl font-normal leading-none text-fg-strong">{value}</p>
      <p className="mt-2 flex items-center gap-1.5 text-sm text-subtle group-hover:text-fg">
        {label}
        <ArrowRight size={13} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
      </p>
    </button>
  );
}

export function OverviewPanel({ go }: { go: (tab: CompanyTab) => void }) {
  const docs = useCompanyDocuments();
  const profile = useCompanyProfile();
  const banks = useBankAccounts();
  const team = useTeam();

  if (docs.isLoading || profile.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4" aria-busy="true">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  const all = docs.data ?? [];
  const expiring = all
    .filter((d) => d.expires_on && daysUntil(d.expires_on) <= 60)
    .sort((a, b) => a.expires_on!.localeCompare(b.expires_on!));
  const recent = all.slice(0, 5);
  const byCategory = DOCUMENT_CATEGORIES.map((c) => ({
    c, n: all.filter((d) => d.category === c).length,
  })).filter((x) => x.n > 0);
  const p = profile.data;
  const missing = [
    !p?.legal_name && "legal name",
    !p?.registration_number && "registration number",
    !p?.tax_number && "tax number",
    !p?.registered_address && "registered address",
  ].filter(Boolean) as string[];

  const open = (id: string) =>
    openDocument(id).catch((e) => toast.error(errorDetail(e, "Couldn't open that file")));

  return (
    <div className="space-y-6">
      <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat value={all.length} label="Documents" onClick={() => go("documents")} />
        <Stat value={expiring.length} label="Expiring in 60 days" onClick={() => go("documents")} />
        <Stat value={banks.data?.length ?? 0} label="Bank accounts" onClick={() => go("bank")} />
        <Stat value={team.data?.filter((m) => m.is_active).length ?? 0} label="Team members" onClick={() => go("team")} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
            <h2 className="text-lg font-normal tracking-tight text-fg-strong">Recently updated</h2>
            <button type="button" onClick={() => go("documents")} className="link-signal cursor-pointer text-xs">
              All documents
            </button>
          </div>
          {recent.length === 0 ? (
            <p className="px-5 py-8 text-sm text-subtle">Nothing uploaded yet.</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {recent.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => open(d.id)}
                    className="group flex w-full cursor-pointer items-center gap-3 px-5 py-3 text-left hover:bg-tint"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-fg">{d.title}</span>
                      <span className="block text-xs text-subtle">
                        {CATEGORY_LABELS[d.category]} · {timeAgo(d.updated_at)}
                      </span>
                    </span>
                    <ExternalLink size={14} aria-hidden="true" className="text-faint group-hover:text-brand-soft" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-normal tracking-tight text-fg-strong">
                  {p?.legal_name || p?.trading_name || "Enigma-Cube"}
                </h2>
                {p?.registration_number && (
                  <p className="mt-1 font-mono text-xs text-subtle">Reg. {p.registration_number}</p>
                )}
              </div>
              <button type="button" onClick={() => go("profile")} className="link-signal shrink-0 cursor-pointer text-xs">
                Edit profile
              </button>
            </div>
            {missing.length > 0 && (
              <p className="mt-4 border-l border-brand pl-3 text-xs leading-relaxed text-muted">
                Still missing: {missing.join(", ")}.
              </p>
            )}
          </Card>

          {expiring.length > 0 && (
            <Card className="p-5">
              <h3 className="flex items-center gap-2 text-sm font-medium text-fg-strong">
                <CalendarClock size={14} className="text-warning" aria-hidden="true" />
                Needs renewal
              </h3>
              <ul className="mt-3 space-y-2.5">
                {expiring.slice(0, 5).map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3">
                    <button type="button" onClick={() => open(d.id)} className="min-w-0 cursor-pointer truncate text-left text-sm text-fg hover:text-fg-strong">
                      {d.title}
                    </button>
                    <ExpiryBadge date={d.expires_on} />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {byCategory.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-medium text-fg-strong">By category</h3>
              <ul className="mt-3 space-y-2">
                {byCategory.map(({ c, n }) => (
                  <li key={c} className="flex items-center gap-3 text-sm">
                    <span className="w-20 shrink-0 text-muted">{CATEGORY_LABELS[c]}</span>
                    <span className="h-1 flex-1 bg-tint-strong">
                      <span className="block h-full bg-brand" style={{ width: `${(n / all.length) * 100}%` }} />
                    </span>
                    <span className="tabular w-6 text-right font-mono text-xs text-subtle">{n}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
