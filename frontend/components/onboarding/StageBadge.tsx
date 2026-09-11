import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EngagementStage } from "@/lib/types";

const STAGE: Record<EngagementStage, { label: string; className: string }> = {
  draft: { label: "Draft", className: "border border-hairline text-muted" },
  awaiting_signature: { label: "Awaiting signature", className: "bg-warning-wash text-warning" },
  awaiting_payment: { label: "Awaiting payment", className: "bg-info-wash text-info" },
  kickoff: { label: "Kickoff", className: "bg-brand-wash text-brand-soft" },
  complete: { label: "Complete", className: "bg-success-wash text-success" },
};

export function StageBadge({ stage }: { stage: EngagementStage }) {
  const s = STAGE[stage];
  return <Badge className={cn("border-0", s.className)}>{s.label}</Badge>;
}
