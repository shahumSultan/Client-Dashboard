"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { fetchBlobUrl } from "@/hooks/useEngagements";
import type { LetterheadMeta } from "@/lib/types";

export function useLetterheadMeta() {
  return useQuery<LetterheadMeta | null>({
    queryKey: ["letterhead"],
    queryFn: async () => (await api.get("/branding/letterhead")).data ?? null,
    staleTime: Infinity,
  });
}

/**
 * The letterhead image as an object URL.
 *
 * Pass the sha256 an engagement was sent on to get that exact stationery; omit
 * it for whatever is current, which is what drafts and previews want.
 *
 * The object URL is deliberately never revoked. PdfDocument revokes on unmount,
 * and copying that here is the quickest way to ship a blank letterhead in the
 * printed PDF: the image has to still be decodable when the print dialog
 * rasterises the page. React Query holds it for the life of the tab instead.
 */
export function useLetterhead(sha256?: string | null, enabled = true) {
  const meta = useLetterheadMeta();
  const sha = sha256 ?? meta.data?.sha256 ?? null;

  const image = useQuery<string>({
    queryKey: ["letterhead-image", sha],
    queryFn: () => fetchBlobUrl(`/branding/letterhead/${sha}/image`),
    enabled: enabled && !!sha,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  return {
    url: image.data ?? null,
    // "Settled", not "loaded": with no letterhead configured there is nothing
    // to wait for, and the print button must not sit disabled forever.
    settled: !enabled ? false : sha ? image.isFetched : meta.isFetched,
  };
}

export function useLetterheadUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append("file", file);
      return api.put("/branding/letterhead", body).then((r) => r.data as LetterheadMeta);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["letterhead"] }),
  });
}

export function useLetterheadRemove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete("/branding/letterhead").then(() => undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["letterhead"] }),
  });
}
