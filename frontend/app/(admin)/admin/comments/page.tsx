"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  RotateCcw,
  CornerDownRight,
  ArrowUpRight,
  Inbox,
} from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommentComposer } from "@/components/comments/CommentComposer";
import { PageHeading } from "@/components/shared/ProjectSections";
import { timeAgo } from "@/lib/utils";
import type { InboxThread } from "@/lib/types";

const TARGET_LABEL: Record<string, string> = {
  project: "Project discussion",
  milestone: "Milestone",
  update: "Update",
  file: "File",
};

export default function AdminCommentsPage() {
  const [onlyOpen, setOnlyOpen] = useState(true);
  const qc = useQueryClient();

  const { data: threads = [], isLoading } = useQuery<InboxThread[]>({
    queryKey: ["comment-inbox", onlyOpen],
    queryFn: () =>
      api
        .get("/comments/inbox", { params: { only_open: onlyOpen } })
        .then((r) => r.data),
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["comment-inbox"] });
    qc.invalidateQueries({ queryKey: ["comments"] });
  }

  return (
    <div>
      <PageHeading
        title="Comments"
        description="Every remark your clients have left, across all projects. Reply here and they're notified."
      />

      <Tabs
        value={onlyOpen ? "open" : "all"}
        onValueChange={(v) => setOnlyOpen(v === "open")}
      >
        <TabsList>
          <TabsTrigger value="open">Needs reply</TabsTrigger>
          <TabsTrigger value="all">All threads</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-32 w-full rounded-card" />
          <Skeleton className="h-32 w-full rounded-card" />
        </div>
      ) : threads.length === 0 ? (
        <Card>
          <EmptyState
            icon={Inbox}
            title={onlyOpen ? "Nothing waiting on you" : "No comments yet"}
            description={
              onlyOpen
                ? "Every client comment has been resolved. New remarks will land here."
                : "When clients comment on milestones, updates or files, their threads appear here."
            }
          />
        </Card>
      ) : (
        <ul className="stagger space-y-4">
          {threads.map((thread) => (
            <li key={thread.id}>
              <InboxRow thread={thread} onChanged={refresh} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InboxRow({
  thread,
  onChanged,
}: {
  thread: InboxThread;
  onChanged: () => void;
}) {
  const [replying, setReplying] = useState(false);
  const [busy, setBusy] = useState(false);

  async function sendReply(body: string) {
    setBusy(true);
    try {
      await api.post(`/comments/${thread.id}/replies`, { body });
      toast.success("Reply sent", { description: "The client has been notified." });
      setReplying(false);
      onChanged();
    } catch {
      toast.error("Couldn't send your reply");
    } finally {
      setBusy(false);
    }
  }

  async function toggleResolved() {
    const next = !thread.is_resolved;
    setBusy(true);
    try {
      await api.patch(`/comments/${thread.id}/resolve`, { is_resolved: next });
      toast.success(next ? "Marked resolved" : "Reopened");
      onChanged();
    } catch {
      toast.error("Couldn't update this thread");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/projects/${thread.project.id}`}
            className="flex items-center gap-1 text-xs font-medium text-brand-soft transition-colors hover:text-fg"
          >
            {thread.project.name}
            <ArrowUpRight size={12} aria-hidden="true" />
          </Link>
          <span className="text-faint" aria-hidden="true">
            ·
          </span>
          <Badge>{TARGET_LABEL[thread.target_type] ?? thread.target_type}</Badge>
          {thread.is_resolved && (
            <Badge className="border-success/25 bg-success-wash text-success">
              <Check size={11} aria-hidden="true" />
              Resolved
            </Badge>
          )}
        </div>

        <div className="flex gap-3">
          <Avatar
            size="sm"
            name={thread.author.full_name}
            email={thread.author.email}
            src={thread.author.avatar_url}
            highlight={thread.author.role === "admin"}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2">
              <span className="text-sm font-medium text-fg">
                {thread.author.full_name ?? thread.author.email}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                {timeAgo(thread.created_at)}
              </span>
            </div>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-muted">
              {thread.body}
            </p>
          </div>
        </div>

        {thread.replies.length > 0 && (
          <ul className="mt-4 space-y-4 border-l border-hairline pl-4">
            {thread.replies.map((r) => (
              <li key={r.id} className="flex gap-3">
                <Avatar
                  size="sm"
                  name={r.author.full_name}
                  email={r.author.email}
                  src={r.author.avatar_url}
                  highlight={r.author.role === "admin"}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2">
                    <span className="text-sm font-medium text-fg">
                      {r.author.full_name ?? r.author.email}
                    </span>
                    {r.author.role === "admin" && <Badge variant="brand">You</Badge>}
                    <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                      {timeAgo(r.created_at)}
                    </span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                    {r.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-center gap-2 border-t border-hairline pt-3">
          {!replying && (
            <Button variant="ghost" size="sm" onClick={() => setReplying(true)}>
              <CornerDownRight size={13} aria-hidden="true" />
              Reply
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={toggleResolved} loading={busy && !replying}>
            {thread.is_resolved ? (
              <>
                <RotateCcw size={13} aria-hidden="true" />
                Reopen
              </>
            ) : (
              <>
                <Check size={13} aria-hidden="true" />
                Mark resolved
              </>
            )}
          </Button>
        </div>

        {replying && (
          <div className="mt-3">
            <CommentComposer
              compact
              autoFocus
              placeholder="Reply to your client…"
              submitLabel="Send reply"
              pending={busy}
              onSubmit={sendReply}
              onCancel={() => setReplying(false)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
