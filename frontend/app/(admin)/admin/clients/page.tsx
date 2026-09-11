"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Building2, ArrowRight, Globe } from "lucide-react";
import api from "@/lib/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { Organization } from "@/lib/types";

const slugify = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function CreateClientDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "", slug: "", industry: "", website: "", description: "",
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: typeof form) => api.post("/organizations", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-clients"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Client created");
      setForm({ name: "", slug: "", industry: "", website: "", description: "" });
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail ?? "Couldn't create that client");
    },
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange} label="New client">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New client</DialogTitle>
          <DialogDescription>
            Creates a workspace. Projects, files and comments are scoped to it.
          </DialogDescription>
          <DialogClose onClick={() => onOpenChange(false)} />
        </DialogHeader>

        <div className="space-y-5 px-6 pb-5">
          <Field label="Company name" htmlFor="client-name" required>
            <Input
              id="client-name"
              value={form.name}
              onChange={(e) => {
                set("name", e.target.value);
                set("slug", slugify(e.target.value));
              }}
              placeholder="Acme Law Group"
            />
          </Field>

          <Field
            label="Slug"
            htmlFor="client-slug"
            required
            hint="Used in URLs. Must be unique across all clients."
          >
            <Input
              id="client-slug"
              className="font-mono"
              value={form.slug}
              onChange={(e) => set("slug", e.target.value)}
              placeholder="acme-law-group"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Industry" htmlFor="client-industry">
              <Input
                id="client-industry"
                value={form.industry}
                onChange={(e) => set("industry", e.target.value)}
                placeholder="Legal"
              />
            </Field>
            <Field label="Website" htmlFor="client-website">
              <Input
                id="client-website"
                type="url"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://acme.com"
              />
            </Field>
          </div>

          <Field label="Description" htmlFor="client-description">
            <Textarea
              id="client-description"
              rows={2}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What this client does, in a line."
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" allowReadOnly onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => mutate(form)}
            disabled={!form.name.trim() || !form.slug.trim()}
            loading={isPending}
          >
            Create client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ClientsPage() {
  const [creating, setCreating] = useState(false);
  const { data: clients = [], isLoading } = useQuery<Organization[]>({
    queryKey: ["admin-clients"],
    queryFn: () => api.get("/organizations").then((r) => r.data),
  });

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg">Clients</h1>
          <p className="mt-1.5 text-sm text-subtle">
            {isLoading
              ? "Loading…"
              : `${clients.length} ${clients.length === 1 ? "workspace" : "workspaces"}.`}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus size={15} aria-hidden="true" />
          New client
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-card" />)}
        </div>
      ) : clients.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="No clients yet"
            description="Add your first client to create their workspace, or wait for one to sign up themselves."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus size={14} aria-hidden="true" />
                Add client
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="stagger grid gap-4 md:grid-cols-2">
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/admin/clients/${c.id}`}
              className="glass glass-sheen glass-hover group rounded-card p-5"
            >
              <div className="mb-4 flex items-start justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-wash text-brand-soft">
                  <Building2 size={18} aria-hidden="true" />
                </span>
                <ArrowRight
                  size={16}
                  aria-hidden="true"
                  className="mt-1 text-faint transition-colors group-hover:text-brand-soft"
                />
              </div>
              <p className="font-semibold tracking-tight text-fg">{c.name}</p>
              <p className="mt-1 text-xs text-subtle">{c.industry ?? "No industry set"}</p>
              {c.website && (
                <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-faint">
                  <Globe size={11} aria-hidden="true" />
                  {c.website}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}

      <CreateClientDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
