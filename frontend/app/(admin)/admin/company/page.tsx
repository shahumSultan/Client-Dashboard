"use client";
import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewPanel, type CompanyTab } from "@/components/company/OverviewPanel";
import { DocumentsPanel } from "@/components/company/DocumentsPanel";
import { ProfilePanel } from "@/components/company/ProfilePanel";
import { BankPanel } from "@/components/company/BankPanel";
import { TeamPanel } from "@/components/company/TeamPanel";

const TABS: { value: CompanyTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "documents", label: "Documents" },
  { value: "profile", label: "Profile" },
  { value: "bank", label: "Bank" },
  { value: "team", label: "Team" },
];

function isTab(v: string | null): v is CompanyTab {
  return TABS.some((t) => t.value === v);
}

export default function CompanyPage() {
  // useSearchParams needs a Suspense boundary to prerender.
  return (
    <Suspense fallback={null}>
      <Company />
    </Suspense>
  );
}

function Company() {
  // The tab lives in ?tab= so a link can land on Documents directly.
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = params.get("tab");
  const tab: CompanyTab = isTab(requested) ? requested : "overview";

  const go = (t: CompanyTab) =>
    router.replace(t === "overview" ? pathname : `${pathname}?tab=${t}`, { scroll: false });

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-3xl font-normal tracking-tight text-fg-strong">Company</h1>
        <p className="mt-2 max-w-xl text-sm text-subtle">
          The company&apos;s own records - documents, registration details, bank accounts and team.
          Visible to the Enigma-Cube team only; clients never see this section.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => go(v as CompanyTab)}>
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="overview"><OverviewPanel go={go} /></TabsContent>
        <TabsContent value="documents"><DocumentsPanel /></TabsContent>
        <TabsContent value="profile"><ProfilePanel /></TabsContent>
        <TabsContent value="bank"><BankPanel /></TabsContent>
        <TabsContent value="team"><TeamPanel /></TabsContent>
      </Tabs>
    </div>
  );
}
