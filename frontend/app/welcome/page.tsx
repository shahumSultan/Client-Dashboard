"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import api from "@/lib/api";
import { useCurrentUser } from "@/hooks/useAuth";
import { BrandMark } from "@/components/shared/BrandMark";
import { PageLoader } from "@/components/shared/PageLoader";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FormState {
  /** null until the user types — the Clerk name is used as the value in the meantime. */
  full_name: string | null;
  company_name: string;
  industry: string;
  website: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

export default function WelcomePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: user, isLoading } = useCurrentUser();

  const [form, setForm] = useState<FormState>({
    full_name: null,
    company_name: "",
    industry: "",
    website: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isLoading || !user) return;
    // Already set up — nothing to do here.
    if (user.organization_id) router.replace("/dashboard");
    // Onboarding provisions a client organization. Admins never need one, and
    // sending them through it is what creates stray workspaces.
    else if (user.role === "admin") router.replace("/admin");
  }, [user, isLoading, router]);

  if (isLoading || !user) return <PageLoader />;

  // Derived, not copied into state: whatever Clerk knows shows until they type.
  const fullName = form.full_name ?? user.full_name ?? "";

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  function validate(): Errors {
    const next: Errors = {};
    if (!fullName.trim()) next.full_name = "Tell us what to call you.";
    if (!form.company_name.trim()) next.company_name = "Your company name sets up your workspace.";
    if (form.website.trim() && !/^https?:\/\/.+\..+/.test(form.website.trim())) {
      next.website = "Include the full address, starting with https://";
    }
    return next;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      // Send focus to the first problem rather than making them hunt for it.
      const first = Object.keys(found)[0];
      document.getElementById(first)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/users/me/register", {
        full_name: fullName.trim(),
        company_name: form.company_name.trim(),
        industry: form.industry.trim() || null,
        website: form.website.trim() || null,
      });
      await qc.invalidateQueries({ queryKey: ["currentUser"] });
      toast.success("Workspace ready", {
        description: `${form.company_name.trim()} is set up.`,
      });
      router.replace("/dashboard");
    } catch {
      toast.error("We couldn't finish setting up your workspace", {
        description: "Please try again in a moment.",
      });
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-lg animate-fade-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark />
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            Let&apos;s set up your workspace
          </h1>
          <p className="mt-2.5 max-w-md text-sm leading-relaxed text-subtle">
            A few details and your project portal is ready. You can change any of
            this later from settings.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={submit} noValidate className="space-y-5">
              <Field
                label="Your name"
                htmlFor="full_name"
                required
                error={errors.full_name}
              >
                <Input
                  id="full_name"
                  name="name"
                  autoComplete="name"
                  value={fullName}
                  onChange={set("full_name")}
                  aria-invalid={!!errors.full_name}
                  placeholder="Jordan Ellis"
                />
              </Field>

              <Field
                label="Company name"
                htmlFor="company_name"
                required
                error={errors.company_name}
                hint="This names your workspace and is shown across the portal."
              >
                <Input
                  id="company_name"
                  name="organization"
                  autoComplete="organization"
                  value={form.company_name}
                  onChange={set("company_name")}
                  aria-invalid={!!errors.company_name}
                  placeholder="Acme Law Group"
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Industry" htmlFor="industry" error={errors.industry}>
                  <Input
                    id="industry"
                    value={form.industry}
                    onChange={set("industry")}
                    placeholder="Legal"
                  />
                </Field>

                <Field label="Website" htmlFor="website" error={errors.website}>
                  <Input
                    id="website"
                    type="url"
                    inputMode="url"
                    autoComplete="url"
                    value={form.website}
                    onChange={set("website")}
                    aria-invalid={!!errors.website}
                    placeholder="https://acme.com"
                  />
                </Field>
              </div>

              <Button type="submit" size="lg" loading={submitting} className="w-full">
                {!submitting && (
                  <>
                    Enter your portal
                    <ArrowRight size={15} aria-hidden="true" />
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-faint">
                Signed in as <span className="text-subtle">{user.email}</span>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
