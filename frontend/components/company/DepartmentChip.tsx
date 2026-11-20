import { cn } from "@/lib/utils";
import type { DepartmentColour } from "@/lib/types";

/**
 * Department swatches. Muted on purpose: they tell departments apart without
 * competing with the signal red, which stays reserved for actions and alerts.
 */
export const DEPARTMENT_SWATCH: Record<DepartmentColour, string> = {
  slate: "#8a949a",
  blue: "#6f9fd8",
  teal: "#5bb5ad",
  green: "#79b884",
  amber: "#d4a656",
  violet: "#a08bd6",
  rose: "#d48aa8",
};

export function DepartmentDot({ colour, className }: { colour: DepartmentColour; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", className)}
      style={{ background: DEPARTMENT_SWATCH[colour] }}
    />
  );
}

export function DepartmentChip({ name, colour }: { name: string; colour: DepartmentColour }) {
  return (
    <span className="inline-flex items-center gap-1.5 border border-hairline px-2 py-0.5 text-[11px] text-muted">
      <DepartmentDot colour={colour} />
      {name}
    </span>
  );
}
