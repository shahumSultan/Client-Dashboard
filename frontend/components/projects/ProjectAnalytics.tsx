"use client";
import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { BarChart3, Table2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/hooks/useProjects";
import { formatDate } from "@/lib/utils";
import type { AnalyticsEntry } from "@/lib/types";

/**
 * Two categorical series on one shared count axis - never a dual axis. Both
 * hues are validated for the dark surface: adjacent CVD ΔE 19.2, normal-vision
 * ΔE 29.0, and each clears 3:1 against the card.
 */
const SERIES = [
  { key: "leads", label: "Leads processed", color: "#e66767" },
  { key: "conversions", label: "Conversions", color: "#3987e5" },
] as const;

const AXIS_INK = "rgba(255,255,255,0.48)";
const GRID_INK = "rgba(255,255,255,0.08)";

export function ProjectAnalytics({ projectId }: { projectId: string }) {
  const { data: entries = [], isLoading } = useAnalytics(projectId);
  const [showTable, setShowTable] = useState(false);

  const rows = [...entries].sort((a, b) =>
    a.period_start.localeCompare(b.period_start)
  );

  const chartData = rows.map((e: AnalyticsEntry) => ({
    period: formatDate(e.period_start),
    leads: e.leads_processed ?? 0,
    conversions: e.conversions ?? 0,
  }));

  const latest = rows[rows.length - 1];

  if (isLoading) return null;

  if (entries.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={BarChart3}
          title="No analytics yet"
          description="Once your project starts producing results, performance figures and trends will show up here."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {latest && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Metric label="Leads processed" value={latest.leads_processed} />
          <Metric label="Conversions" value={latest.conversions} />
          <Metric
            label="Conversion rate"
            value={
              latest.conversion_rate != null
                ? `${latest.conversion_rate.toFixed(1)}%`
                : null
            }
          />
          <Metric
            label="Revenue attributed"
            value={
              latest.revenue_attributed != null
                ? `$${latest.revenue_attributed.toLocaleString()}`
                : null
            }
          />
        </div>
      )}

      {latest?.summary && (
        <Card>
          <CardContent className="pt-5">
            <p className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-brand-soft">
              <Sparkles size={12} aria-hidden="true" />
              Summary
            </p>
            <p className="text-sm leading-relaxed text-muted">{latest.summary}</p>
          </CardContent>
        </Card>
      )}

      {chartData.length > 1 && (
        <Card>
          <CardContent className="pt-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold tracking-tight text-fg">
                Leads and conversions over time
              </h3>
              {/* Table view: the chart is not the only way to read the data */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTable((v) => !v)}
                aria-pressed={showTable}
              >
                <Table2 size={13} aria-hidden="true" />
                {showTable ? "Show chart" : "Show table"}
              </Button>
            </div>

            {showTable ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    Leads processed and conversions per reporting period
                  </caption>
                  <thead>
                    <tr className="border-b border-hairline text-left">
                      <th scope="col" className="py-2 pr-4 font-medium text-subtle">
                        Period
                      </th>
                      {SERIES.map((s) => (
                        <th
                          key={s.key}
                          scope="col"
                          className="py-2 pr-4 text-right font-medium text-subtle"
                        >
                          {s.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row) => (
                      <tr key={row.period} className="border-b border-hairline last:border-0">
                        <th
                          scope="row"
                          className="py-2 pr-4 text-left font-normal text-muted"
                        >
                          {row.period}
                        </th>
                        <td className="tabular py-2 pr-4 text-right text-fg">
                          {row.leads.toLocaleString()}
                        </td>
                        <td className="tabular py-2 pr-4 text-right text-fg">
                          {row.conversions.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                  {/* Recessive grid - horizontal only, so it never competes */}
                  <CartesianGrid stroke={GRID_INK} vertical={false} />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 11, fill: AXIS_INK }}
                    tickLine={false}
                    axisLine={{ stroke: GRID_INK }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: AXIS_INK }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                  />
                  <Tooltip
                    cursor={{ stroke: "rgba(255,255,255,0.22)", strokeWidth: 1 }}
                    contentStyle={{
                      background: "rgba(28,28,28,0.96)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 12,
                      fontSize: 12,
                      color: "#fff",
                      boxShadow: "0 20px 50px -20px rgba(0,0,0,0.9)",
                    }}
                    labelStyle={{ color: "rgba(255,255,255,0.48)", marginBottom: 4 }}
                    itemStyle={{ color: "#fff" }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="left"
                    height={30}
                    iconType="plainline"
                    wrapperStyle={{ fontSize: 12, color: AXIS_INK, paddingLeft: 12 }}
                  />
                  {SERIES.map((s) => (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.label}
                      stroke={s.color}
                      strokeWidth={2}
                      dot={false}
                      // Surface ring keeps the hovered point readable where
                      // the two lines cross
                      activeDot={{ r: 4.5, strokeWidth: 2, stroke: "#161616" }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string | null }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-subtle">{label}</p>
      <p className="tabular mt-1.5 text-2xl font-semibold tracking-tight text-fg">
        {value ?? "-"}
      </p>
    </Card>
  );
}
