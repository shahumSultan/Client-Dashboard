"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Engagement, EngagementDraft } from "@/lib/types";

export function useEngagements(projectId?: string) {
  return useQuery<Engagement[]>({
    queryKey: ["engagements", projectId ?? "all"],
    queryFn: async () => {
      const { data } = await api.get("/engagements", {
        params: projectId ? { project_id: projectId } : {},
      });
      return data;
    },
  });
}

export function useEngagement(id: string, enabled = true) {
  return useQuery<Engagement>({
    queryKey: ["engagement", id],
    queryFn: async () => (await api.get(`/engagements/${id}`)).data,
    enabled: !!id && enabled,
    retry: false,
  });
}

/**
 * Every write returns the updated engagement; seed the cache with it so the
 * next step renders at once instead of after a refetch — that immediacy is
 * the point of the flow.
 */
function useEngagementMutation<T = void>(fn: (vars: T) => Promise<Engagement>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (e) => {
      qc.setQueryData(["engagement", e.id], e);
      qc.invalidateQueries({ queryKey: ["engagements"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

const post = (path: string, body?: unknown) =>
  api.post(path, body).then((r) => r.data as Engagement);

export function useCreateEngagement() {
  return useEngagementMutation((vars: EngagementDraft & { project_id: string }) =>
    post("/engagements", vars)
  );
}

export function useUpdateEngagement(id: string) {
  return useEngagementMutation((vars: EngagementDraft) =>
    api.patch(`/engagements/${id}`, vars).then((r) => r.data as Engagement)
  );
}

export function useEngagementAction(id: string) {
  return {
    send: useEngagementMutation(() => post(`/engagements/${id}/send`)),
    recall: useEngagementMutation(() => post(`/engagements/${id}/recall`)),
    confirmPayment: useEngagementMutation(() => post(`/engagements/${id}/confirm-payment`)),
    completeCall: useEngagementMutation(() => post(`/engagements/${id}/complete-call`)),
    sign: useEngagementMutation(
      (vars: { signer_name: string; signer_title?: string; agreement_hash: string; consent: boolean }) =>
        post(`/engagements/${id}/sign`, vars)
    ),
    reportPayment: useEngagementMutation(
      (vars: { method: "bank" | "stripe"; reference?: string }) =>
        post(`/engagements/${id}/report-payment`, vars)
    ),
    markWelcomeRead: useEngagementMutation(() => post(`/engagements/${id}/welcome-read`)),
    scheduleCall: useEngagementMutation(
      (vars: { scheduled_for: string; prep_notes?: string }) =>
        post(`/engagements/${id}/schedule-call`, vars)
    ),
  };
}

export function useAgreementDocument(id: string) {
  return {
    upload: useEngagementMutation((file: File) => {
      const body = new FormData();
      body.append("file", file);
      return api.put(`/engagements/${id}/document`, body).then((r) => r.data as Engagement);
    }),
    remove: useEngagementMutation(() =>
      api.delete(`/engagements/${id}/document`).then((r) => r.data as Engagement)
    ),
  };
}

/**
 * The PDF endpoints need the bearer token, so a plain <a href> can't reach
 * them. Fetch as a blob and hand the browser an object URL instead.
 */
export async function fetchPdf(path: string): Promise<string> {
  const { data } = await api.get(path, { responseType: "blob" });
  return URL.createObjectURL(data as Blob);
}

/** Open a protected PDF in a new tab. */
export async function openPdf(path: string) {
  // Open synchronously, inside the click, or popup blockers eat it.
  const tab = window.open("", "_blank");
  try {
    const url = await fetchPdf(path);
    if (tab) tab.location.href = url;
    else window.location.href = url;
  } catch {
    tab?.close();
    throw new Error("Couldn't open the document");
  }
}

/** Save a protected PDF under a real filename, not a blob id. */
export async function downloadPdf(path: string, filename: string) {
  const url = await fetchPdf(path);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a moment to start the save before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function useDeleteEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/engagements/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["engagements"] }),
  });
}

/** The step a client still owes on this engagement, or null if none. */
export function clientActionLabel(e: Engagement): string | null {
  switch (e.stage) {
    case "awaiting_signature":
      return "Sign your agreement";
    case "awaiting_payment":
      return "Pay your invoice";
    case "kickoff":
      return e.call_scheduled_for ? "Read your welcome pack" : "Book your kickoff call";
    default:
      return null;
  }
}

/** Server error detail, for toasts. */
export function errorDetail(err: unknown, fallback: string): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === "string" ? detail : fallback;
}
