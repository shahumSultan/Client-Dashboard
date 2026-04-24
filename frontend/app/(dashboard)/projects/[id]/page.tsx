"use client";
import { useState } from "react";
import { use } from "react";
import {
  Calendar, Download, FileText, MessageSquare, Plus, TrendingUp, Clock
} from "lucide-react";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MilestoneTimeline } from "@/components/projects/MilestoneTimeline";
import { NewRequestDialog } from "@/components/projects/NewRequestDialog";
import {
  useProject, useProjectUpdates, useMilestones, useRequests, useFiles, useAnalytics,
} from "@/hooks/useProjects";
import {
  cn, formatDate, timeAgo, STATUS_LABELS, STATUS_COLORS, formatBytes,
} from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { AnalyticsEntry, ClientRequest } from "@/lib/types";

const REQUEST_PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

function RequestRow({ request }: { request: ClientRequest }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-all">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-sm font-medium text-slate-900">{request.title}</span>
          <Badge className={cn("text-[10px]", STATUS_COLORS[request.category])}>
            {STATUS_LABELS[request.category]}
          </Badge>
        </div>
        <p className="text-xs text-slate-500 line-clamp-2">{request.description}</p>
        {request.admin_response && (
          <div className="mt-2 p-2.5 rounded-lg bg-indigo-50 border border-indigo-100">
            <p className="text-xs text-indigo-700 font-medium">Response from Enigma-Cube</p>
            <p className="text-xs text-indigo-600 mt-0.5">{request.admin_response}</p>
          </div>
        )}
        <p className="text-[11px] text-slate-400 mt-1.5">{timeAgo(request.created_at)}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <Badge className={cn("text-[10px]", STATUS_COLORS[request.status])}>
          {STATUS_LABELS[request.status]}
        </Badge>
        <Badge className={cn("text-[10px]", REQUEST_PRIORITY_COLORS[request.priority])}>
          {STATUS_LABELS[request.priority]}
        </Badge>
      </div>
    </div>
  );
}

function AnalyticsTab({ projectId }: { projectId: string }) {
  const { data: entries = [] } = useAnalytics(projectId);

  const chartData = entries
    .slice()
    .sort((a, b) => a.period_start.localeCompare(b.period_start))
    .map((e: AnalyticsEntry) => ({
      period: e.period_start,
      leads: e.leads_processed ?? 0,
      conversions: e.conversions ?? 0,
      rate: e.conversion_rate ?? 0,
    }));

  const latest = entries[0];

  return (
    <div className="space-y-5">
      {/* Metric cards */}
      {latest && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Leads Processed", value: latest.leads_processed ?? "—", icon: TrendingUp },
            { label: "Conversions", value: latest.conversions ?? "—", icon: TrendingUp },
            {
              label: "Conversion Rate",
              value: latest.conversion_rate ? `${latest.conversion_rate.toFixed(1)}%` : "—",
              icon: TrendingUp,
            },
            {
              label: "Revenue Attributed",
              value: latest.revenue_attributed ? `$${latest.revenue_attributed.toLocaleString()}` : "—",
              icon: TrendingUp,
            },
          ].map((m) => (
            <div key={m.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 font-medium">{m.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{String(m.value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* AI summary */}
      {latest?.summary && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-4">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">AI Summary</p>
          <p className="text-sm text-slate-700">{latest.summary}</p>
        </div>
      )}

      {/* Trend chart */}
      {chartData.length > 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm font-semibold text-slate-900 mb-4">Performance Trends</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                }}
              />
              <Line type="monotone" dataKey="leads" stroke="#6366f1" strokeWidth={2} dot={false} name="Leads" />
              <Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} dot={false} name="Conversions" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {entries.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <TrendingUp size={32} className="mx-auto mb-2 text-slate-200" />
          <p className="text-sm">No analytics data available yet.</p>
        </div>
      )}
    </div>
  );
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [reqDialogOpen, setReqDialogOpen] = useState(false);

  const { data: project, isLoading } = useProject(id);
  const { data: updates = [] } = useProjectUpdates(id);
  const { data: milestones = [] } = useMilestones(id);
  const { data: requests = [] } = useRequests(id);
  const { data: files = [] } = useFiles(id);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20 text-slate-400">
        Project not found.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Hero card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Status bar accent */}
        <div
          className={cn(
            "h-1.5 w-full",
            project.status === "delivered" ? "bg-emerald-500" :
            project.status === "development" ? "bg-indigo-500" :
            project.status === "testing" ? "bg-yellow-400" :
            project.status === "on_hold" ? "bg-slate-400" : "bg-blue-400"
          )}
        />
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-slate-500 mt-1 max-w-xl">{project.description}</p>
              )}
            </div>
            <Badge className={cn("shrink-0 text-sm py-1 px-3", STATUS_COLORS[project.status])}>
              {STATUS_LABELS[project.status]}
            </Badge>
          </div>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-xs font-medium mb-1.5">
              <span className="text-slate-500">Overall Progress</span>
              <span className="text-slate-900">{project.completion_percentage}%</span>
            </div>
            <Progress value={project.completion_percentage} className="h-2.5" />
          </div>

          {/* Timeline row */}
          <div className="flex flex-wrap gap-5 text-xs text-slate-500">
            {project.start_date && (
              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400" />
                <span>Started {formatDate(project.start_date)}</span>
              </div>
            )}
            {project.target_date && (
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-slate-400" />
                <span>Target {formatDate(project.target_date)}</span>
              </div>
            )}
            {project.delivered_date && (
              <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <Calendar size={13} />
                <span>Delivered {formatDate(project.delivered_date)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="milestones">Milestones ({milestones.length})</TabsTrigger>
          <TabsTrigger value="requests">Requests ({requests.length})</TabsTrigger>
          <TabsTrigger value="files">Files ({files.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Latest Updates</h3>
            {updates.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200">
                <MessageSquare size={28} className="mx-auto mb-2 text-slate-200" />
                <p className="text-sm">No updates yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {updates.map((u) => (
                  <div key={u.id} className="bg-white rounded-xl border border-slate-100 p-4">
                    <p className="text-sm text-slate-700 leading-relaxed">{u.content}</p>
                    <p className="text-[11px] text-slate-400 mt-2">{timeAgo(u.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Milestones */}
        <TabsContent value="milestones">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <MilestoneTimeline milestones={milestones} />
          </div>
        </TabsContent>

        {/* Requests */}
        <TabsContent value="requests">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {requests.filter((r) => r.status === "pending").length} pending
              </p>
              <Button size="sm" onClick={() => setReqDialogOpen(true)}>
                <Plus size={14} />
                New Request
              </Button>
            </div>
            {requests.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
                <MessageSquare size={28} className="mx-auto mb-2 text-slate-200" />
                <p className="text-sm">No requests yet. Submit one using the button above.</p>
              </div>
            ) : (
              requests.map((r) => <RequestRow key={r.id} request={r} />)
            )}
          </div>
          <NewRequestDialog
            projectId={id}
            open={reqDialogOpen}
            onOpenChange={setReqDialogOpen}
          />
        </TabsContent>

        {/* Files */}
        <TabsContent value="files">
          {files.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
              <FileText size={28} className="mx-auto mb-2 text-slate-200" />
              <p className="text-sm">No files uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-4 p-3.5 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-all"
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <FileText size={16} className="text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{f.name}</p>
                    <p className="text-xs text-slate-400">
                      {f.file_type} · {formatBytes(f.size_bytes)} · {timeAgo(f.created_at)}
                    </p>
                  </div>
                  {f.is_deliverable && (
                    <Badge className="bg-emerald-50 text-emerald-700 text-[10px]">Deliverable</Badge>
                  )}
                  {f.public_url && (
                    <a
                      href={f.public_url}
                      download
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <Download size={15} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics">
          <AnalyticsTab projectId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
