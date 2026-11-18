"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompanyProfile, useSaveCompanyProfile } from "@/hooks/useCompany";
import { errorDetail } from "@/hooks/useEngagements";
import { useReadOnly } from "@/lib/read-only";
import { timeAgo } from "@/lib/utils";
import type { CompanyProfile } from "@/lib/types";

const SOCIALS = ["linkedin", "instagram", "facebook", "x", "github"] as const;

type Form = Record<
  Exclude<keyof CompanyProfile, "socials" | "updated_at">,
  string
> & { socials: Record<string, string> };

const EMPTY: Form = {
  legal_name: "", trading_name: "", registration_number: "", tax_number: "",
  registered_address: "", office_address: "", email: "", phone: "", website: "",
  notes: "", socials: {},
};

function toForm(p: CompanyProfile): Form {
  const out = { ...EMPTY, socials: { ...(p.socials ?? {}) } };
  for (const k of Object.keys(EMPTY) as (keyof Form)[]) {
    if (k !== "socials") out[k] = (p[k] as string | null) ?? "";
  }
  return out;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-lg font-normal tracking-tight text-fg-strong">{title}</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

export function ProfilePanel() {
  const { data, isLoading } = useCompanyProfile();
  if (isLoading || !data) return <Skeleton className="h-96 w-full" />;
  // Keyed on the saved version: the form starts from the server copy and is
  // re-seeded only after a save, so a background refetch never wipes typing.
  return <ProfileForm key={data.updated_at ?? "new"} data={data} />;
}

function ProfileForm({ data }: { data: CompanyProfile }) {
  const save = useSaveCompanyProfile();
  const viewOnly = useReadOnly();
  const [form, setForm] = useState<Form>(() => toForm(data));
  const [dirty, setDirty] = useState(false);

  const set = (k: Exclude<keyof Form, "socials">, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };
  const setSocial = (k: string, v: string) => {
    setForm((f) => ({ ...f, socials: { ...f.socials, [k]: v } }));
    setDirty(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const socials = Object.fromEntries(
      Object.entries(form.socials).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v)
    );
    save.mutate(
      { ...form, socials: Object.keys(socials).length ? socials : null },
      {
        onSuccess: () => {
          toast.success("Company profile saved");
        },
        onError: (err) => toast.error(errorDetail(err, "Couldn't save the profile")),
      }
    );
  };

  const text = (k: Exclude<keyof Form, "socials">, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <Field label={label} htmlFor={`cp-${k}`}>
      <Input id={`cp-${k}`} value={form[k]} onChange={(e) => set(k, e.target.value)} readOnly={viewOnly} {...props} />
    </Field>
  );
  const area = (k: Exclude<keyof Form, "socials">, label: string) => (
    <Field label={label} htmlFor={`cp-${k}`}>
      <Textarea id={`cp-${k}`} rows={3} value={form[k]} onChange={(e) => set(k, e.target.value)} readOnly={viewOnly} />
    </Field>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      <Section title="Identity">
        {text("legal_name", "Legal name", { placeholder: "Enigma-Cube (Pvt) Ltd" })}
        {text("trading_name", "Trading name", { placeholder: "Enigma-Cube" })}
        {text("registration_number", "Registration number")}
        {text("tax_number", "Tax number (NTN / VAT)")}
      </Section>

      <Section title="Contact">
        {text("email", "Email", { type: "email", placeholder: "info@enigma-cube.com" })}
        {text("phone", "Phone", { type: "tel" })}
        {text("website", "Website", { placeholder: "https://enigma-cube.com" })}
        <div className="hidden sm:block" />
        {area("registered_address", "Registered address")}
        {area("office_address", "Office address")}
      </Section>

      <Section title="Online & notes">
        {SOCIALS.map((s) => (
          <Field key={s} label={s === "x" ? "X / Twitter" : s[0].toUpperCase() + s.slice(1)} htmlFor={`cp-social-${s}`}>
            <Input
              id={`cp-social-${s}`}
              value={form.socials[s] ?? ""}
              onChange={(e) => setSocial(s, e.target.value)}
              placeholder="https://"
              readOnly={viewOnly}
            />
          </Field>
        ))}
        <div className="sm:col-span-2">{area("notes", "Notes")}</div>
      </Section>

      {!viewOnly && (
        <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-4 border-t border-hairline bg-base/95 px-1 py-4 backdrop-blur-md">
          <span className="text-xs text-subtle">
            {dirty ? "Unsaved changes" : data.updated_at ? `Saved ${timeAgo(data.updated_at)}` : ""}
          </span>
          <Button type="submit" loading={save.isPending} disabled={!dirty} className="ec-cta">
            Save profile
          </Button>
        </div>
      )}
    </form>
  );
}
