"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";
import api from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  StatusPill,
  REQUEST_STATUS,
  REQUEST_PRIORITY,
} from "@/components/ui/status-pill";
import { PageHeading } from "@/components/shared/ProjectSections";
import { timeAgo, STATUS_LABELS } from "@/lib/utils";
import type { ClientRequest } from "@/lib/types";

const STATUSES: ClientRequest["status"][] = [
  "pending",
  "in_progress",
  "completed",
  "rejected",
];

function RequestDialog({
  request,
  onClose,
}: {
  request: ClientRequest;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [response, setResponse] = useState(request.admin_response ?? "");
  const [status, setStatus] = useState<ClientRequest["status"]>(request.status);

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      api
        .patch(`/requests/${request.id}`, {
          status,
          admin_response: response.trim() || null,
        })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Request updated", { description: "The client has been notified." });
      onClose();
    },
    onError: () => toast.error("Couldn't update that request"),
  });

  return (
    <Dialog open onOpenChange={onClose} label={request.title}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-10">{request.title}</DialogTitle>
          <DialogClose onClick={onClose} />
        </DialogHeader>

        <div className="space-y-5 px-6 pb-5">
          <div className="flex flex-wrap gap-2">
            <StatusPill descriptor={REQUEST_STATUS[request.status]} size="sm" />
            <StatusPill descriptor={REQUEST_PRIORITY[request.priority]} size="sm" />
            <Badge>{STATUS_LABELS[request.category]}</Badge>
          </div>

          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
            {request.description}
          </p>

          <Field label="Status" htmlFor="req-status">
            <Select
              id="req-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ClientRequest["status"])}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Your response"
            htmlFor="req-response"
            hint="Sent to the client and shown on their request."
          >
            <Textarea
              id="req-response"
              rows={4}
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Reply to the client…"
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutate()} loading={isPending}>
            {!isPending && <Send size={13} aria-hidden="true" />}
            Save and notify
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminRequestsPage() {
  const [selected, setSelected] = useState<ClientRequest | null>(null);
  const { data: requests = [], isLoading } = useQuery<ClientRequest[]>({
    queryKey: ["admin-requests"],
    queryFn: () => api.get("/admin/requests").then((r) => r.data),
  });

  const open = requests.filter(
    (r) => r.status === "pending" || r.status === "in_progress"
  ).length;

  return (
    <div>
      <PageHeading
        title="Requests"
        description={
          isLoading
            ? "Loading…"
            : open === 0
              ? "Nothing outstanding."
              : `${open} open ${open === 1 ? "request" : "requests"} across all clients.`
        }
      />

      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-card" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <EmptyState
            icon={MessageSquare}
            title="No requests yet"
            description="When a client raises a request, it lands here for you to respond to."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul>
            {requests.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setSelected(r)}
                  className="flex w-full items-center justify-between gap-4 border-b border-hairline px-5 py-4 text-left transition-colors last:border-0 hover:bg-white/[0.05] cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">{r.title}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-faint">
                      {STATUS_LABELS[r.category]} · {timeAgo(r.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusPill
                      descriptor={REQUEST_PRIORITY[r.priority]}
                      size="sm"
                      className="hidden sm:inline-flex"
                    />
                    <StatusPill descriptor={REQUEST_STATUS[r.status]} size="sm" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {selected && (
        <RequestDialog request={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
