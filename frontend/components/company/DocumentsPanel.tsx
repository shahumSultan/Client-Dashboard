"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Archive, ArchiveRestore, Download, ExternalLink, FileText, History, Loader2,
  Pencil, Plus, RefreshCw, Search, Trash2, Upload, X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ACCEPTED_EXTENSIONS, MAX_COMPANY_FILE_BYTES, isAccepted, openDocument,
  useCompanyDocuments, useCreateDocument, useDeleteDocument, useDocumentVersions,
  useReplaceDocumentFile, useUpdateDocument,
} from "@/hooks/useCompany";
import { errorDetail } from "@/hooks/useEngagements";
import { useReadOnly } from "@/lib/read-only";
import {
  CATEGORY_LABELS, DOCUMENT_CATEGORIES,
  type CompanyDocument, type DocumentCategory,
} from "@/lib/types";
import { cn, formatBytes, formatDate, parseApiDate, timeAgo } from "@/lib/utils";

const ACCEPT = ACCEPTED_EXTENSIONS.join(",");
const MAX_MB = MAX_COMPANY_FILE_BYTES / (1024 * 1024);

/** Days until a date; negative once it has passed. */
export function daysUntil(date: string): number {
  const end = parseApiDate(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 86_400_000);
}

export function ExpiryBadge({ date }: { date: string | null }) {
  if (!date) return null;
  const d = daysUntil(date);
  if (d < 0) return <Badge className="border-danger/30 bg-danger-wash text-danger">Expired</Badge>;
  if (d <= 60)
    return (
      <Badge className="border-warning/30 bg-warning-wash text-warning">
        Expires in {d} {d === 1 ? "day" : "days"}
      </Badge>
    );
  return <Badge>Expires {formatDate(date)}</Badge>;
}

function extOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toUpperCase() : "FILE";
}

function titleFromName(name: string) {
  const dot = name.lastIndexOf(".");
  return (dot > 0 ? name.slice(0, dot) : name).replace(/[_-]+/g, " ").trim();
}

function rejectReason(file: File): string | null {
  if (!isAccepted(file.name)) return "type not accepted";
  if (file.size > MAX_COMPANY_FILE_BYTES) return `over ${MAX_MB} MB`;
  if (file.size === 0) return "empty file";
  return null;
}

// ── Upload ───────────────────────────────────────────────────────────────────

interface Pending {
  key: string;
  file: File;
  title: string;
  category: DocumentCategory;
  progress: number;
  state: "ready" | "uploading" | "done" | "error";
  error?: string;
}

function UploadDialog({
  open,
  onOpenChange,
  defaultCategory,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultCategory: DocumentCategory;
}) {
  const [items, setItems] = useState<Pending[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const create = useCreateDocument();

  const patch = (key: string, p: Partial<Pending>) =>
    setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...p } : x)));

  const add = (files: FileList | null) => {
    if (!files) return;
    const next: Pending[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(files)) {
      const why = rejectReason(file);
      if (why) {
        rejected.push(`${file.name} (${why})`);
        continue;
      }
      next.push({
        key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        title: titleFromName(file.name),
        category: defaultCategory,
        progress: 0,
        state: "ready",
      });
    }
    if (rejected.length) toast.error(`Skipped: ${rejected.join(", ")}`);
    setItems((xs) => [...xs, ...next]);
  };

  const close = (v: boolean) => {
    if (busy) return;
    if (!v) setItems([]);
    onOpenChange(v);
  };

  const uploadAll = async () => {
    setBusy(true);
    let ok = 0;
    // One at a time: predictable progress, and a flaky connection fails one
    // file rather than all of them at once.
    for (const item of items) {
      if (item.state === "done") continue;
      if (!item.title.trim()) {
        patch(item.key, { state: "error", error: "Give it a title" });
        continue;
      }
      patch(item.key, { state: "uploading", progress: 0, error: undefined });
      try {
        await create.mutateAsync({
          doc: { file: item.file, title: item.title.trim(), category: item.category },
          onProgress: (p) => patch(item.key, { progress: p }),
        });
        patch(item.key, { state: "done", progress: 100 });
        ok += 1;
      } catch (e) {
        patch(item.key, {
          state: "error",
          error: errorDetail(e, e instanceof Error ? e.message : "Upload failed"),
        });
      }
    }
    setBusy(false);
    if (ok) toast.success(`${ok} ${ok === 1 ? "document" : "documents"} uploaded`);
    setItems((xs) => {
      const left = xs.filter((x) => x.state !== "done");
      if (left.length === 0) onOpenChange(false);
      return left;
    });
  };

  const waiting = items.filter((x) => x.state !== "done").length;

  return (
    <Dialog open={open} onOpenChange={close} label="Upload documents">
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload documents</DialogTitle>
          <DialogDescription>
            Add one or many. You can set descriptions, tags and expiry dates afterwards.
          </DialogDescription>
          <DialogClose onClick={() => close(false)} />
        </DialogHeader>

        <div className="space-y-4 px-6 pb-5">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              add(e.dataTransfer.files);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center border border-dashed px-6 py-8 text-center transition-colors",
              dragging
                ? "border-brand-soft bg-brand-wash"
                : "border-hairline-strong hover:border-brand-soft/50 hover:bg-tint",
              busy && "pointer-events-none opacity-50"
            )}
          >
            <Upload size={20} className="text-brand-soft" aria-hidden="true" />
            <span className="mt-3 text-sm font-medium text-fg">
              Drop files here, or click to choose
            </span>
            <span className="label-system mt-1.5 normal-case tracking-normal">
              PDF · Word · Excel · PowerPoint · images · CSV · ZIP · up to {MAX_MB} MB each
            </span>
            <input
              type="file"
              multiple
              accept={ACCEPT}
              className="sr-only"
              onChange={(e) => {
                add(e.target.files);
                e.target.value = "";
              }}
            />
          </label>

          {items.length > 0 && (
            <ul className="divide-y divide-hairline border border-hairline">
              {items.map((item) => (
                <li key={item.key} className="grid gap-3 p-3 sm:grid-cols-[1fr_9rem_auto] sm:items-start">
                  <div className="min-w-0">
                    <Input
                      aria-label={`Title for ${item.file.name}`}
                      value={item.title}
                      disabled={busy || item.state === "done"}
                      onChange={(e) => patch(item.key, { title: e.target.value })}
                    />
                    <p className="mt-1.5 truncate font-mono text-[11px] text-subtle">
                      {item.file.name} · {formatBytes(item.file.size)}
                    </p>
                    {item.state === "uploading" && (
                      <div className="mt-2 h-0.5 w-full bg-tint-strong" aria-hidden="true">
                        <div className="h-full bg-brand transition-[width]" style={{ width: `${item.progress}%` }} />
                      </div>
                    )}
                    {item.error && <p role="alert" className="mt-1.5 text-xs text-danger">{item.error}</p>}
                  </div>
                  <Select
                    aria-label={`Category for ${item.file.name}`}
                    value={item.category}
                    disabled={busy || item.state === "done"}
                    onChange={(e) => patch(item.key, { category: e.target.value as DocumentCategory })}
                  >
                    {DOCUMENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                    ))}
                  </Select>
                  <button
                    type="button"
                    onClick={() => setItems((xs) => xs.filter((x) => x.key !== item.key))}
                    disabled={busy}
                    aria-label={`Remove ${item.file.name}`}
                    className="grid h-10 w-10 cursor-pointer place-items-center text-subtle hover:bg-tint-strong hover:text-fg disabled:opacity-40"
                  >
                    {item.state === "uploading" ? (
                      <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <X size={15} aria-hidden="true" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)} disabled={busy} allowReadOnly>
            Cancel
          </Button>
          <Button onClick={uploadAll} loading={busy} disabled={waiting === 0}>
            Upload {waiting > 0 ? waiting : ""} {waiting === 1 ? "file" : "files"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit ─────────────────────────────────────────────────────────────────────

function EditDialog({ doc, onClose }: { doc: CompanyDocument; onClose: () => void }) {
  const update = useUpdateDocument();
  const [form, setForm] = useState({
    title: doc.title,
    description: doc.description ?? "",
    category: doc.category,
    tags: doc.tags.join(", "),
    expires_on: doc.expires_on ?? "",
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = () =>
    update.mutate(
      {
        id: doc.id,
        data: {
          title: form.title.trim(),
          description: form.description.trim() || null,
          category: form.category,
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
          expires_on: form.expires_on || null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Document updated");
          onClose();
        },
        onError: (e) => toast.error(errorDetail(e, "Couldn't save those changes")),
      }
    );

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()} label="Edit document">
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit document</DialogTitle>
          <DialogDescription className="truncate font-mono text-xs">{doc.original_name}</DialogDescription>
          <DialogClose onClick={onClose} />
        </DialogHeader>
        <div className="space-y-5 px-6 pb-5">
          <Field label="Title" htmlFor="doc-title" required>
            <Input id="doc-title" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Category" htmlFor="doc-category">
              <Select
                id="doc-category"
                value={form.category}
                onChange={(e) => set("category", e.target.value as DocumentCategory)}
              >
                {DOCUMENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Expires on" htmlFor="doc-expires" hint="For licences, certificates, insurance.">
              <Input
                id="doc-expires"
                type="date"
                value={form.expires_on}
                onChange={(e) => set("expires_on", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Description" htmlFor="doc-desc">
            <Textarea
              id="doc-desc"
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
          <Field label="Tags" htmlFor="doc-tags" hint="Comma-separated, e.g. 2026, signed, FBR">
            <Input id="doc-tags" value={form.tags} onChange={(e) => set("tags", e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} allowReadOnly>Cancel</Button>
          <Button onClick={save} loading={update.isPending} disabled={!form.title.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Versions ─────────────────────────────────────────────────────────────────

function VersionsDialog({ doc, onClose }: { doc: CompanyDocument; onClose: () => void }) {
  const { data: versions = [], isLoading } = useDocumentVersions(doc.id);
  const replace = useReplaceDocumentFile();
  const viewOnly = useReadOnly();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);

  const take = (file: File | undefined) => {
    if (!file) return;
    const why = rejectReason(file);
    if (why) return toast.error(`${file.name}: ${why}`);
    setProgress(0);
    replace.mutate(
      { id: doc.id, file, onProgress: setProgress },
      {
        onSuccess: (d) => toast.success(`Uploaded as version ${d.version}`),
        onError: (e) =>
          toast.error(errorDetail(e, e instanceof Error ? e.message : "Upload failed")),
      }
    );
  };

  const open = (version: number) =>
    openDocument(doc.id, { version }).catch((e) =>
      toast.error(errorDetail(e, "Couldn't open that file"))
    );

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()} label="Versions">
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{doc.title}</DialogTitle>
          <DialogDescription>Every file uploaded for this document. The newest is current.</DialogDescription>
          <DialogClose onClick={onClose} />
        </DialogHeader>
        <div className="px-6 pb-5">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <ul className="divide-y divide-hairline border border-hairline">
              {versions.map((v) => (
                <li key={v.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="label-system w-8 shrink-0">v{v.version}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-fg">{v.original_name}</p>
                    <p className="text-xs text-subtle">
                      {formatBytes(v.size_bytes)} · {timeAgo(v.created_at)}
                    </p>
                  </div>
                  {v.version === versions[0]?.version && <Badge variant="brand">Current</Badge>}
                  <Button size="sm" variant="ghost" onClick={() => open(v.version)} allowReadOnly>
                    <ExternalLink size={13} aria-hidden="true" />
                    Open
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {replace.isPending && (
            <div className="mt-3 h-0.5 w-full bg-tint-strong" aria-hidden="true">
              <div className="h-full bg-brand transition-[width]" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
        {!viewOnly && (
          <DialogFooter>
            <input
              ref={input}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              onChange={(e) => {
                take(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => input.current?.click()} loading={replace.isPending}>
              <RefreshCw size={14} aria-hidden="true" />
              Upload new version
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Panel ────────────────────────────────────────────────────────────────────

function Row({
  doc,
  onEdit,
  onVersions,
}: {
  doc: CompanyDocument;
  onEdit: () => void;
  onVersions: () => void;
}) {
  const viewOnly = useReadOnly();
  const update = useUpdateDocument();
  const remove = useDeleteDocument();
  const [confirming, setConfirming] = useState(false);

  const open = (download = false) =>
    openDocument(doc.id, { download }).catch((e) =>
      toast.error(errorDetail(e, "Couldn't open that file"))
    );

  const toggleArchive = () =>
    update.mutate(
      { id: doc.id, data: { is_archived: !doc.is_archived } },
      {
        onSuccess: () => toast.success(doc.is_archived ? "Restored" : "Archived"),
        onError: (e) => toast.error(errorDetail(e, "Couldn't update that document")),
      }
    );

  const iconBtn =
    "grid h-9 w-9 shrink-0 cursor-pointer place-items-center text-subtle transition-colors hover:bg-tint-strong hover:text-fg disabled:opacity-40";

  return (
    <li className="group flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:flex-nowrap sm:px-5">
      <span className="grid h-10 w-10 shrink-0 place-items-center border border-hairline bg-base font-mono text-[10px] text-brand-soft">
        {extOf(doc.original_name)}
      </span>
      <button
        type="button"
        onClick={() => open()}
        aria-label={`Open ${doc.title}`}
        aria-describedby={`doc-meta-${doc.id}`}
        className="min-w-0 flex-1 cursor-pointer text-left"
      >
        <span className="block truncate text-sm font-medium text-fg group-hover:text-fg-strong">{doc.title}</span>
        <span id={`doc-meta-${doc.id}`} className="mt-0.5 block truncate text-xs text-subtle">
          {CATEGORY_LABELS[doc.category]} · {formatBytes(doc.size_bytes)}
          {doc.version > 1 && ` · v${doc.version}`} · updated {timeAgo(doc.updated_at)}
          {doc.uploader_name && ` by ${doc.uploader_name}`}
        </span>
        {(doc.tags.length > 0 || doc.expires_on) && (
          <span className="mt-1.5 flex flex-wrap gap-1.5">
            <ExpiryBadge date={doc.expires_on} />
            {doc.tags.map((t) => (
              <Badge key={t} className="px-1.5 py-0 font-mono text-[10px]">{t}</Badge>
            ))}
          </span>
        )}
      </button>

      {/* Own line on phones, so the title keeps its width. */}
      <div className="-mr-2 ml-auto flex w-full items-center justify-end sm:mr-0 sm:w-auto">
        {confirming ? (
          <span className="flex items-center gap-2">
            <span className="text-xs text-muted">Delete every version?</span>
            <Button
              size="sm"
              variant="destructive"
              loading={remove.isPending}
              onClick={() =>
                remove.mutate(doc.id, {
                  onSuccess: () => toast.success("Document deleted"),
                  onError: (e) => toast.error(errorDetail(e, "Couldn't delete that document")),
                })
              }
            >
              Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} allowReadOnly>
              Keep
            </Button>
          </span>
        ) : (
          <>
            <button type="button" className={iconBtn} onClick={() => open(true)} aria-label={`Download ${doc.title}`} title="Download">
              <Download size={15} aria-hidden="true" />
            </button>
            <button type="button" className={iconBtn} onClick={onVersions} aria-label={`Versions of ${doc.title}`} title="Versions">
              <History size={15} aria-hidden="true" />
            </button>
            {!viewOnly && (
              <>
                <button type="button" className={iconBtn} onClick={onEdit} aria-label={`Edit ${doc.title}`} title="Edit">
                  <Pencil size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={iconBtn}
                  onClick={toggleArchive}
                  disabled={update.isPending}
                  aria-label={doc.is_archived ? `Restore ${doc.title}` : `Archive ${doc.title}`}
                  title={doc.is_archived ? "Restore" : "Archive"}
                >
                  {doc.is_archived ? (
                    <ArchiveRestore size={15} aria-hidden="true" />
                  ) : (
                    <Archive size={15} aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  className={cn(iconBtn, "hover:text-danger")}
                  onClick={() => setConfirming(true)}
                  aria-label={`Delete ${doc.title}`}
                  title="Delete"
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </>
            )}
          </>
        )}
      </div>
    </li>
  );
}

export function DocumentsPanel() {
  const viewOnly = useReadOnly();
  const [category, setCategory] = useState<DocumentCategory | "">("");
  const [q, setQ] = useState("");
  const [archived, setArchived] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<CompanyDocument | null>(null);
  const [history, setHistory] = useState<CompanyDocument | null>(null);

  const { data: docs = [], isLoading, isFetching } = useCompanyDocuments({ category, q, archived });
  const filtered = !!(category || q.trim());

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[14rem] flex-1">
          <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
          <Input
            aria-label="Search documents"
            placeholder="Search titles, descriptions, file names"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-40">
          <Select
            aria-label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as DocumentCategory | "")}
          >
            <option value="">All categories</option>
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </Select>
        </div>
        <Button variant="ghost" onClick={() => setArchived((a) => !a)} allowReadOnly aria-pressed={archived}>
          <Archive size={14} aria-hidden="true" />
          {archived ? "Showing archived" : "Archived"}
        </Button>
        {!viewOnly && (
          <Button onClick={() => setUploading(true)} className="ec-cta">
            <Plus size={15} aria-hidden="true" />
            Upload
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : docs.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileText}
            title={archived ? "Nothing archived" : filtered ? "No matches" : "No company documents yet"}
            description={
              archived
                ? "Archived documents land here, out of the way but not deleted."
                : filtered
                  ? "Try another search or category."
                  : "Upload registration papers, contracts, policies, brand files - anything the company needs to keep to hand."
            }
            action={
              !viewOnly && !filtered && !archived ? (
                <Button onClick={() => setUploading(true)}>
                  <Upload size={14} aria-hidden="true" />
                  Upload documents
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <Card className={cn("transition-opacity", isFetching && "opacity-70")}>
          <ul className="divide-y divide-hairline">
            {docs.map((d) => (
              <Row key={d.id} doc={d} onEdit={() => setEditing(d)} onVersions={() => setHistory(d)} />
            ))}
          </ul>
        </Card>
      )}

      <UploadDialog
        open={uploading}
        onOpenChange={setUploading}
        defaultCategory={category || "other"}
      />
      {editing && <EditDialog doc={editing} onClose={() => setEditing(null)} />}
      {history && <VersionsDialog doc={history} onClose={() => setHistory(null)} />}
    </div>
  );
}
