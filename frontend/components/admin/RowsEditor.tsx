"use client";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useReadOnly } from "@/lib/read-only";

export interface Column<T> {
  key: keyof T & string;
  label: string;
  placeholder?: string;
  /** Tailwind grid track, e.g. "1fr" or "120px". */
  width?: string;
  type?: "text" | "number";
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}

/**
 * Edit a list of small records — deliverables, timeline phases, line items.
 * Rows are plain objects of strings; callers convert on the way in and out.
 */
export function RowsEditor<T extends Record<string, string>>({
  label,
  rows,
  columns,
  onChange,
  empty,
  addLabel = "Add row",
  disabled,
}: {
  label: string;
  rows: T[];
  columns: Column<T>[];
  onChange: (rows: T[]) => void;
  empty: T;
  addLabel?: string;
  disabled?: boolean;
}) {
  const viewOnly = useReadOnly();
  const cols = { "--cols": columns.map((c) => c.width ?? "1fr").join(" ") } as React.CSSProperties;
  // One column on phones; the configured tracks from sm up.
  const grid = "grid flex-1 grid-cols-1 gap-2 sm:[grid-template-columns:var(--cols)]";

  function update(i: number, key: keyof T, value: string) {
    onChange(rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
  }

  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="mb-2 text-sm font-medium text-muted">{label}</legend>

      {rows.length > 0 && (
        <div className="hidden gap-2 pr-11 sm:flex" aria-hidden="true">
          <div className={cn(grid, "px-0.5 font-mono text-[10px] uppercase tracking-wider text-faint")} style={cols}>
            {columns.map((c) => (
              <span key={c.key}>{c.label}</span>
            ))}
          </div>
        </div>
      )}

      {rows.map((row, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className={grid} style={cols}>
            {columns.map((c) => (
              <Input
                key={c.key}
                type={c.type ?? "text"}
                inputMode={c.inputMode}
                value={row[c.key]}
                placeholder={c.placeholder}
                aria-label={`${c.label} ${i + 1}`}
                onChange={(e) => update(i, c.key, e.target.value)}
              />
            ))}
          </div>
          {!viewOnly && (
          <button
            type="button"
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
            aria-label={`Remove row ${i + 1}`}
            className={cn(
              "grid h-10 w-9 shrink-0 cursor-pointer place-items-center rounded-[10px] text-faint transition-colors",
              "hover:bg-danger-wash hover:text-danger disabled:pointer-events-none"
            )}
          >
            <X size={14} aria-hidden="true" />
          </button>
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-2"
        onClick={() => onChange([...rows, { ...empty }])}
      >
        <Plus size={13} aria-hidden="true" />
        {addLabel}
      </Button>
    </fieldset>
  );
}

/** Same, for a flat list of strings — next steps, agenda items. */
export function ListEditor({
  label,
  items,
  onChange,
  placeholder,
  addLabel = "Add item",
  disabled,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  disabled?: boolean;
}) {
  return (
    <RowsEditor
      label={label}
      rows={items.map((value) => ({ value }))}
      columns={[{ key: "value", label: "Item", placeholder }]}
      onChange={(rows) => onChange(rows.map((r) => r.value))}
      empty={{ value: "" }}
      addLabel={addLabel}
      disabled={disabled}
    />
  );
}
