"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DepartmentDot } from "@/components/company/DepartmentChip";
import { daysUntilDate } from "@/components/tasks/parts";
import { useTasks } from "@/hooks/useTasks";
import type { DepartmentColour } from "@/lib/types";

/** Company overview: where open work sits, and what's due soon. */
export function TaskSummaryCard() {
  const { data: tasks = [], isLoading } = useTasks();
  if (isLoading) return null;

  const open = tasks.filter((t) => t.status !== "done");
  const dueThisWeek = open.filter((t) => t.due_date && daysUntilDate(t.due_date) <= 7);
  const overdue = dueThisWeek.filter((t) => daysUntilDate(t.due_date!) < 0);

  const byDept = new Map<string, { name: string; colour: DepartmentColour | null; id: string | null; n: number }>();
  for (const t of open) {
    const key = t.department?.id ?? "none";
    const row = byDept.get(key) ?? {
      name: t.department?.name ?? "No department",
      colour: t.department?.colour ?? null,
      id: t.department?.id ?? null,
      n: 0,
    };
    row.n += 1;
    byDept.set(key, row);
  }
  const rows = [...byDept.values()].sort((a, b) => b.n - a.n);
  const max = Math.max(1, ...rows.map((r) => r.n));

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
        <h2 className="text-lg font-normal tracking-tight text-fg-strong">Open tasks</h2>
        <Link href="/admin/tasks" className="link-signal inline-flex items-center gap-1 text-xs">
          Board <ArrowRight size={12} aria-hidden="true" />
        </Link>
      </div>
      <div className="grid gap-6 px-5 py-5 sm:grid-cols-[1fr_12rem]">
        {rows.length === 0 ? (
          <p className="text-sm text-subtle">Nothing open.</p>
        ) : (
          <ul className="space-y-2.5" aria-label="Open tasks by department">
            {rows.map((r) => (
              <li key={r.id ?? "none"}>
                <Link
                  href={r.id ? `/admin/tasks?dept=${r.id}` : "/admin/tasks"}
                  className="group grid grid-cols-[9rem_1fr_2rem] items-center gap-3 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2 text-muted group-hover:text-fg">
                    {r.colour ? <DepartmentDot colour={r.colour} /> : <span className="h-2 w-2" />}
                    <span className="truncate">{r.name}</span>
                  </span>
                  <span className="h-1.5 bg-tint" aria-hidden="true">
                    <span className="block h-full bg-hairline-strong" style={{ width: `${(r.n / max) * 100}%` }} />
                  </span>
                  <span className="text-right font-mono text-xs text-subtle">{r.n}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href="/admin/tasks" className="group block border-l border-hairline pl-5">
          <p className="text-3xl font-normal tracking-tight text-fg-strong">{dueThisWeek.length}</p>
          <p className="mt-1 text-xs text-subtle group-hover:text-fg">Due in the next 7 days</p>
          {overdue.length > 0 && <p className="mt-2 text-xs text-danger">{overdue.length} overdue</p>}
        </Link>
      </div>
    </Card>
  );
}
