"use client";
import { useState } from "react";
import { toast } from "sonner";
import {
  MessageSquare,
  CornerDownRight,
  Check,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CommentComposer } from "@/components/comments/CommentComposer";
import {
  useComments,
  useCreateComment,
  useReplyToComment,
  useResolveComment,
  useDeleteComment,
} from "@/hooks/useComments";
import { useCurrentUser } from "@/hooks/useAuth";
import { cn, timeAgo } from "@/lib/utils";
import type { Comment, CommentTargetType, CommentThread } from "@/lib/types";

interface CommentsPanelProps {
  projectId: string;
  targetType: CommentTargetType;
  /** Omit for the project-level thread. */
  targetId?: string;
  title?: string;
  /** Hides the heading when embedded inside an already-labelled card. */
  bare?: boolean;
  emptyHint?: string;
}

export function CommentsPanel({
  projectId,
  targetType,
  targetId,
  title = "Comments & remarks",
  bare = false,
  emptyHint = "Leave a remark on this work, or suggest something you'd like added.",
}: CommentsPanelProps) {
  const { data: user } = useCurrentUser();
  const { data: threads = [], isLoading } = useComments(projectId, targetType, targetId);
  const create = useCreateComment(projectId);

  const isAdmin = user?.role === "admin";
  const open = threads.filter((t) => !t.is_resolved).length;

  async function post(body: string) {
    try {
      await create.mutateAsync({ target_type: targetType, target_id: targetId, body });
      toast.success("Comment posted", {
        description: isAdmin ? undefined : "The Enigma-Cube team has been notified.",
      });
    } catch {
      toast.error("Could not post your comment", {
        description: "Please check your connection and try again.",
      });
    }
  }

  return (
    <section className="space-y-5" aria-label={title}>
      {!bare && (
        <div className="flex items-center gap-2.5">
          <MessageSquare size={16} className="text-brand-soft" aria-hidden="true" />
          <h2 className="text-sm font-semibold tracking-tight text-fg">{title}</h2>
          {open > 0 && (
            <Badge variant="brand">
              {open} open
            </Badge>
          )}
        </div>
      )}

      <CommentComposer onSubmit={post} pending={create.isPending} />

      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : threads.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No comments yet"
          description={emptyHint}
          className="py-10"
        />
      ) : (
        <ul className="stagger space-y-3">
          {threads.map((thread) => (
            <li key={thread.id}>
              <Thread
                thread={thread}
                projectId={projectId}
                currentUserId={user?.id}
                isAdmin={isAdmin}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Thread({
  thread,
  projectId,
  currentUserId,
  isAdmin,
}: {
  thread: CommentThread;
  projectId: string;
  currentUserId?: string;
  isAdmin: boolean;
}) {
  const [replying, setReplying] = useState(false);
  const reply = useReplyToComment(projectId);
  const resolve = useResolveComment(projectId);
  const remove = useDeleteComment(projectId);

  async function sendReply(body: string) {
    try {
      await reply.mutateAsync({ commentId: thread.id, body });
      setReplying(false);
      toast.success("Reply sent");
    } catch {
      toast.error("Could not send your reply");
    }
  }

  async function toggleResolved() {
    const next = !thread.is_resolved;
    try {
      await resolve.mutateAsync({ commentId: thread.id, isResolved: next });
      toast.success(next ? "Marked resolved" : "Reopened");
    } catch {
      toast.error("Could not update this thread");
    }
  }

  return (
    <article
      className={cn(
        "glass rounded-card p-4 transition-opacity duration-200",
        thread.is_resolved && "opacity-65"
      )}
    >
      <CommentBody
        comment={thread}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        resolved={thread.is_resolved}
        onDelete={() => remove.mutate(thread.id)}
      />

      {thread.replies.length > 0 && (
        <ul className="mt-4 space-y-4 border-l border-hairline pl-4">
          {thread.replies.map((r) => (
            <li key={r.id}>
              <CommentBody
                comment={r}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onDelete={() => remove.mutate(r.id)}
              />
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
        {/* Resolving is the admin's call — it is how you close a remark out. */}
        {isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleResolved}
            loading={resolve.isPending}
          >
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
        )}
        {thread.is_resolved && (
          <Badge className="ml-auto border-success/25 bg-success-wash text-success">
            <Check size={11} aria-hidden="true" />
            Resolved
          </Badge>
        )}
      </div>

      {replying && (
        <div className="mt-3">
          <CommentComposer
            compact
            autoFocus
            placeholder="Write a reply…"
            submitLabel="Reply"
            pending={reply.isPending}
            onSubmit={sendReply}
            onCancel={() => setReplying(false)}
          />
        </div>
      )}
    </article>
  );
}

function CommentBody({
  comment,
  currentUserId,
  isAdmin,
  resolved,
  onDelete,
}: {
  comment: Comment;
  currentUserId?: string;
  isAdmin: boolean;
  resolved?: boolean;
  onDelete: () => void;
}) {
  const fromTeam = comment.author.role === "admin";
  const canDelete = comment.author.id === currentUserId || isAdmin;

  return (
    <div className="flex gap-3">
      <Avatar
        size="sm"
        name={comment.author.full_name}
        email={comment.author.email}
        src={comment.author.avatar_url}
        highlight={fromTeam}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium text-fg">
            {comment.author.full_name ?? comment.author.email}
          </span>
          {fromTeam && <Badge variant="brand">Enigma-Cube</Badge>}
          <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
            {timeAgo(comment.created_at)}
            {comment.edited_at && " · edited"}
          </span>
          {canDelete && (
            <button
              onClick={onDelete}
              aria-label="Delete comment"
              className="ml-auto rounded p-1 text-faint transition-colors hover:text-danger cursor-pointer"
            >
              <Trash2 size={13} aria-hidden="true" />
            </button>
          )}
        </div>
        <p
          className={cn(
            "mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-muted",
            resolved && "line-through decoration-white/20"
          )}
        >
          {comment.body}
        </p>
      </div>
    </div>
  );
}
