"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Landmark, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useBankAccounts, useDeleteBankAccount, useSaveBankAccount } from "@/hooks/useCompany";
import { errorDetail } from "@/hooks/useEngagements";
import { useReadOnly } from "@/lib/read-only";
import type { BankAccount, BankAccountInput } from "@/lib/types";

const BLANK: BankAccountInput = {
  label: "", bank_name: "", account_name: "", account_number: null, iban: null,
  swift: null, branch: null, currency: null, notes: null, is_default: false,
};

function CopyValue({ label, value }: { label: string; value: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Couldn't copy - select the text instead");
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="label-system text-[10px]">{label}</p>
        <p className="mt-0.5 break-all font-mono text-sm text-fg">{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label}`}
        className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center text-subtle transition-colors hover:bg-tint-strong hover:text-fg"
      >
        {copied ? <Check size={14} className="text-success" aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      </button>
    </div>
  );
}

function AccountDialog({
  account,
  onClose,
}: {
  account: BankAccount | null;
  onClose: () => void;
}) {
  const save = useSaveBankAccount();
  const [form, setForm] = useState<BankAccountInput>(() => {
    if (!account) return BLANK;
    // Strip server-only fields; the API rejects nothing extra but keep it tidy.
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = account;
    void _id; void _c; void _u;
    return rest;
  });
  const set = <K extends keyof BankAccountInput>(k: K, v: BankAccountInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const str = (k: keyof BankAccountInput) => (form[k] as string | null) ?? "";
  const valid = form.label.trim() && form.bank_name.trim() && form.account_name.trim();

  const submit = () =>
    save.mutate(
      { id: account?.id, data: form },
      {
        onSuccess: () => {
          toast.success(account ? "Account updated" : "Account added");
          onClose();
        },
        onError: (e) => toast.error(errorDetail(e, "Couldn't save that account")),
      }
    );

  const input = (k: keyof BankAccountInput, label: string, required = false, mono = false) => (
    <Field label={label} htmlFor={`ba-${k}`} required={required}>
      <Input
        id={`ba-${k}`}
        value={str(k)}
        onChange={(e) => set(k, e.target.value as never)}
        className={mono ? "font-mono" : undefined}
      />
    </Field>
  );

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()} label="Bank account">
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{account ? "Edit bank account" : "Add bank account"}</DialogTitle>
          <DialogDescription>The default account pre-fills bank details on new invoices.</DialogDescription>
          <DialogClose onClick={onClose} />
        </DialogHeader>
        <div className="grid gap-5 px-6 pb-5 sm:grid-cols-2">
          {input("label", "Label", true)}
          {input("currency", "Currency")}
          {input("bank_name", "Bank", true)}
          {input("account_name", "Account title", true)}
          {input("account_number", "Account number", false, true)}
          {input("swift", "SWIFT / BIC", false, true)}
          <div className="sm:col-span-2">{input("iban", "IBAN", false, true)}</div>
          <div className="sm:col-span-2">
            <Field label="Branch" htmlFor="ba-branch">
              <Textarea id="ba-branch" rows={2} value={str("branch")} onChange={(e) => set("branch", e.target.value)} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Notes" htmlFor="ba-notes">
              <Textarea id="ba-notes" rows={2} value={str("notes")} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted sm:col-span-2">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => set("is_default", e.target.checked)}
              className="h-4 w-4 accent-[var(--brand)]"
            />
            Use as the default for invoices
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} allowReadOnly>Cancel</Button>
          <Button onClick={submit} loading={save.isPending} disabled={!valid}>
            {account ? "Save" : "Add account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BankPanel() {
  const { data: accounts = [], isLoading } = useBankAccounts();
  const remove = useDeleteBankAccount();
  const save = useSaveBankAccount();
  const viewOnly = useReadOnly();
  const [editing, setEditing] = useState<BankAccount | null | "new">(null);

  const makeDefault = (a: BankAccount) => {
    const { id, created_at: _c, updated_at: _u, ...rest } = a;
    void _c; void _u;
    save.mutate(
      { id, data: { ...rest, is_default: true } },
      {
        onSuccess: () => toast.success(`${a.label} is now the default`),
        onError: (e) => toast.error(errorDetail(e, "Couldn't change the default")),
      }
    );
  };

  if (isLoading) return <Skeleton className="h-56 w-full" />;

  return (
    <div>
      {!viewOnly && accounts.length > 0 && (
        <div className="mb-5 flex justify-end">
          <Button onClick={() => setEditing("new")}>
            <Plus size={15} aria-hidden="true" />
            Add account
          </Button>
        </div>
      )}

      {accounts.length === 0 ? (
        <Card>
          <EmptyState
            icon={Landmark}
            title="No bank accounts"
            description="Add the company's accounts once. The default one is filled into every new invoice automatically."
            action={
              !viewOnly ? (
                <Button onClick={() => setEditing("new")}>
                  <Plus size={14} aria-hidden="true" />
                  Add account
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="stagger grid gap-4 md:grid-cols-2">
          {accounts.map((a) => (
            <Card key={a.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="label-system">{a.currency ?? "Account"}</p>
                  <h3 className="mt-1 truncate font-display text-lg font-normal text-fg-strong">{a.label}</h3>
                  <p className="text-sm text-subtle">{a.bank_name}</p>
                </div>
                {a.is_default && <Badge variant="brand">Default</Badge>}
              </div>
              <div className="mt-4 divide-y divide-hairline border-t border-hairline">
                <CopyValue label="Account title" value={a.account_name} />
                <CopyValue label="Account number" value={a.account_number} />
                <CopyValue label="IBAN" value={a.iban} />
                <CopyValue label="SWIFT / BIC" value={a.swift} />
                <CopyValue label="Branch" value={a.branch} />
              </div>
              {a.notes && <p className="mt-3 text-xs leading-relaxed text-subtle">{a.notes}</p>}
              {!viewOnly && (
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <Button size="sm" variant="outline" onClick={() => setEditing(a)}>
                    <Pencil size={13} aria-hidden="true" />
                    Edit
                  </Button>
                  {!a.is_default && (
                    <Button size="sm" variant="ghost" onClick={() => makeDefault(a)} disabled={save.isPending}>
                      <Star size={13} aria-hidden="true" />
                      Make default
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto hover:text-danger"
                    onClick={() => {
                      if (!window.confirm(`Delete ${a.label}?`)) return;
                      remove.mutate(a.id, {
                        onSuccess: () => toast.success("Account deleted"),
                        onError: (e) => toast.error(errorDetail(e, "Couldn't delete that account")),
                      });
                    }}
                  >
                    <Trash2 size={13} aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <AccountDialog account={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
