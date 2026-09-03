"use client";
import { useState } from "react";
import { MessageSquare, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommentsPanel } from "@/components/comments/CommentsPanel";
import type { CommentTargetType } from "@/lib/types";

interface CommentsDisclosureProps {
  projectId: string;
  targetType: CommentTargetType;
  targetId: string;
  label?: string;
  emptyHint?: string;
  className?: string;
}

/**
 * Collapsed comment thread for a single item.
 *
 * The panel is only mounted once opened, so a timeline of twenty milestones
 * does not fire twenty comment queries on first paint.
 */
export function CommentsDisclosure({
  projectId,
  targetType,
  targetId,
  label = "Comments",
  emptyHint,
  className,
}: CommentsDisclosureProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("mt-3", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md text-xs font-medium text-subtle transition-colors duration-200 hover:text-brand-soft cursor-pointer"
      >
        <MessageSquare size={13} aria-hidden="true" />
        {label}
        <ChevronDown
          size={13}
          aria-hidden="true"
          className={cn(
            "transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="mt-3 border-t border-hairline pt-4 animate-fade-up">
          <CommentsPanel
            projectId={projectId}
            targetType={targetType}
            targetId={targetId}
            bare
            emptyHint={
              emptyHint ??
              "Leave a remark on this, or suggest something you'd like changed."
            }
          />
        </div>
      )}
    </div>
  );
}
