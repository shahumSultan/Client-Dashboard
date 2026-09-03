"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import { Card, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_LABELS } from "@/lib/utils";
import type { Organization, ProjectStatus } from "@/lib/types";

const STATUSES: ProjectStatus[] = [
  "planning",
  "development",
  "testing",
  "review",
  "delivered",
  "on_hold",
];

const PROJECT_TYPES = [
  "AI Automation",
  "Lead Generation",
  "CRM Integration",
  "Document Processing",
  "Custom AI",
  "Other",
];

function NewProjectForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [form, setForm] = useState({
    organization_id: searchParams.get("org") ?? "",
    name: "",
    description: "",
    status: "planning",
    project_type: "",
    start_date: "",
    target_date: "",
  });
  const [errors, setErrors] = useState<{ organization_id?: string; name?: string }>({});

  const { data: orgs = [] } = useQuery<Organization[]>({
    queryKey: ["admin-clients"],
    queryFn: () => api.get("/organizations").then((r) => r.data),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: typeof form) =>
      api
        .post("/projects", {
          ...data,
          start_date: data.start_date || null,
          target_date: data.target_date || null,
          description: data.description || null,
          project_type: data.project_type || null,
        })
        .then((r) => r.data),
    onSuccess: (project) => {
      toast.success("Project created", {
        description: "It's live in the client's portal now.",
      });
      router.push(`/admin/projects/${project.id}`);
    },
    onError: (e: unknown) => {
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail ?? "Couldn't create that project");
    },
  });

  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const found: typeof errors = {};
    if (!form.organization_id) found.organization_id = "Pick the client this belongs to.";
    if (!form.name.trim()) found.name = "Give the project a name.";
    if (Object.keys(found).length > 0) {
      setErrors(found);
      document.getElementById(Object.keys(found)[0])?.focus();
      return;
    }
    mutate(form);
  }

  return (
    <form onSubmit={submit} noValidate>
      <Card className="overflow-hidden">
        <div className="space-y-5 px-6 py-6">
          <Field
            label="Client"
            htmlFor="organization_id"
            required
            error={errors.organization_id}
          >
            <Select
              id="organization_id"
              value={form.organization_id}
              onChange={(e) => set("organization_id", e.target.value)}
              aria-invalid={!!errors.organization_id}
            >
              <option value="">Select a client…</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Project name" htmlFor="name" required error={errors.name}>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              aria-invalid={!!errors.name}
              placeholder="Sales Automation System"
            />
          </Field>

          <Field
            label="Description"
            htmlFor="description"
            hint="Shown at the top of the client's project page."
          >
            <Textarea
              id="description"
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What this project involves, in a sentence or two."
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Status" htmlFor="status">
              <Select
                id="status"
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Project type" htmlFor="project_type">
              <Select
                id="project_type"
                value={form.project_type}
                onChange={(e) => set("project_type", e.target.value)}
              >
                <option value="">Select type…</option>
                {PROJECT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Start date" htmlFor="start_date">
              <Input
                id="start_date"
                type="date"
                value={form.start_date}
                onChange={(e) => set("start_date", e.target.value)}
              />
            </Field>
            <Field label="Target date" htmlFor="target_date">
              <Input
                id="target_date"
                type="date"
                value={form.target_date}
                onChange={(e) => set("target_date", e.target.value)}
              />
            </Field>
          </div>
        </div>

        <CardFooter className="justify-end">
          <Link href="/admin/projects">
            <Button variant="ghost" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" loading={isPending}>
            Create project
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-7 flex items-center gap-3">
        <Link
          href="/admin/projects"
          aria-label="Back to projects"
          className="grid h-10 w-10 place-items-center rounded-[10px] text-subtle transition-colors hover:bg-white/[0.08] hover:text-fg"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg">New project</h1>
          <p className="mt-0.5 text-sm text-subtle">
            It appears in the client&apos;s portal as soon as you create it.
          </p>
        </div>
      </div>

      {/* useSearchParams needs a Suspense boundary in the App Router */}
      <Suspense fallback={<Skeleton className="h-[36rem] w-full rounded-card" />}>
        <NewProjectForm />
      </Suspense>
    </div>
  );
}
