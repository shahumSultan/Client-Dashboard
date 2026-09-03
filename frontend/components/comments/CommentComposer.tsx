"use client";
import { useState, useRef, useEffect } from "react";
import { SendHorizontal } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX = 5000;

interface CommentComposerProps {
  placeholder?: string;
  submitLabel?: string;
  pending?: boolean;
  autoFocus?: boolean;
  compact?: boolean;
  onSubmit: (body: string) => Promise<unknown> | unknown;
  onCancel?: () => void;
}

export function CommentComposer({
  placeholder = "Share a remark or suggestion…",
  submitLabel = "Post comment",
  pending = false,
  autoFocus = false,
  compact = false,
  onSubmit,
  onCancel,
}: CommentComposerProps) {
  const [body, setBody] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const trimmed = body.trim();
  const tooLong = trimmed.length > MAX;
  const canSubmit = trimmed.length > 0 && !tooLong && !pending;

  async function submit() {
    if (!canSubmit) return;
    await onSubmit(trimmed);
    setBody("");
  }

  return (
    <div className={cn("space-y-2.5", compact && "space-y-2")}>
      <Textarea
        ref={ref}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-invalid={tooLong || undefined}
        rows={compact ? 2 : 3}
        className={compact ? "min-h-[68px]" : undefined}
        onKeyDown={(e) => {
          // Enter inserts a newline; the shortcut sends. Never the other way
          // round — losing a half-written remark to a stray Enter is worse.
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            void submit();
          }
        }}
      />

      <div className="flex items-center justify-between gap-3">
        <p
          className={cn(
            "font-mono text-[10px] uppercase tracking-wider",
            tooLong ? "text-danger" : "text-faint"
          )}
        >
          {tooLong
            ? `${trimmed.length - MAX} characters over the limit`
            : "⌘ + Enter to send"}
        </p>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel} type="button">
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            loading={pending}
          >
            {!pending && <SendHorizontal size={13} aria-hidden="true" />}
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
