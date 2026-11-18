"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type {
  BankAccount, BankAccountInput, CompanyDocument, CompanyDocumentVersion,
  CompanyProfile, DocumentCategory, TeamMember, TeamMemberInput,
} from "@/lib/types";

/** Kept in step with MAX_COMPANY_FILE_BYTES in backend/app/services/company_files.py. */
export const MAX_COMPANY_FILE_BYTES = 25 * 1024 * 1024;

/** Kept in step with ALLOWED_TYPES on the server, which has the final say. */
export const ACCEPTED_EXTENSIONS = [
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".png", ".jpg", ".jpeg", ".webp", ".svg", ".txt", ".csv", ".zip",
];

export function isAccepted(name: string): boolean {
  const dot = name.lastIndexOf(".");
  return dot >= 0 && ACCEPTED_EXTENSIONS.includes(name.slice(dot).toLowerCase());
}

const KEYS = {
  profile: ["company", "profile"],
  banks: ["company", "bank-accounts"],
  team: ["company", "team"],
  docs: ["company", "documents"],
} as const;

// ── Profile ──────────────────────────────────────────────────────────────────

export function useCompanyProfile() {
  return useQuery<CompanyProfile>({
    queryKey: KEYS.profile,
    queryFn: async () => (await api.get("/company/profile")).data,
  });
}

export function useSaveCompanyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CompanyProfile>) =>
      api.put("/company/profile", data).then((r) => r.data as CompanyProfile),
    onSuccess: (data) => qc.setQueryData(KEYS.profile, data),
  });
}

// ── Bank accounts ────────────────────────────────────────────────────────────

export function useBankAccounts() {
  return useQuery<BankAccount[]>({
    queryKey: KEYS.banks,
    queryFn: async () => (await api.get("/company/bank-accounts")).data,
  });
}

export function useSaveBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: BankAccountInput }) =>
      (id ? api.put(`/company/bank-accounts/${id}`, data) : api.post("/company/bank-accounts", data))
        .then((r) => r.data as BankAccount),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.banks }),
  });
}

export function useDeleteBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/company/bank-accounts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.banks }),
  });
}

// ── Team ─────────────────────────────────────────────────────────────────────

export function useTeam() {
  return useQuery<TeamMember[]>({
    queryKey: KEYS.team,
    queryFn: async () => (await api.get("/company/team")).data,
  });
}

export function useSaveTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: TeamMemberInput }) =>
      (id ? api.put(`/company/team/${id}`, data) : api.post("/company/team", data))
        .then((r) => r.data as TeamMember),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.team }),
  });
}

export function useDeleteTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/company/team/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.team }),
  });
}

// ── Documents ────────────────────────────────────────────────────────────────

export interface DocumentFilters {
  category?: DocumentCategory | "";
  q?: string;
  archived?: boolean;
}

export function useCompanyDocuments(filters: DocumentFilters = {}) {
  const params = {
    category: filters.category || undefined,
    q: filters.q?.trim() || undefined,
    archived: filters.archived || undefined,
  };
  return useQuery<CompanyDocument[]>({
    queryKey: [...KEYS.docs, params],
    queryFn: async () => (await api.get("/company/documents", { params })).data,
    placeholderData: (prev) => prev,
  });
}

export function useDocumentVersions(id: string | null) {
  return useQuery<CompanyDocumentVersion[]>({
    queryKey: [...KEYS.docs, id, "versions"],
    queryFn: async () => (await api.get(`/company/documents/${id}/versions`)).data,
    enabled: !!id,
  });
}

interface Ticket {
  upload_url: string;
  storage_key: string;
  content_type: string;
}

/**
 * Send one file straight to object storage, reporting progress.
 *
 * XHR rather than fetch: fetch still has no upload progress. The Content-Type
 * must be exactly the one the server signed, or storage rejects the PUT.
 */
export async function putFile(file: File, onProgress?: (pct: number) => void) {
  const ticket: Ticket = (
    await api.post("/company/uploads", { filename: file.name, size_bytes: file.size })
  ).data;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", ticket.upload_url);
    xhr.setRequestHeader("Content-Type", ticket.content_type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Storage refused the upload (${xhr.status})`));
    // A CORS block on the bucket surfaces here with no status at all.
    xhr.onerror = () =>
      reject(new Error("Couldn't reach file storage - check the bucket's CORS settings"));
    xhr.send(file);
  });

  return { storage_key: ticket.storage_key, original_name: file.name };
}

export interface NewDocument {
  file: File;
  title: string;
  category: DocumentCategory;
  description?: string;
  tags?: string[];
  expires_on?: string | null;
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ doc, onProgress }: { doc: NewDocument; onProgress?: (p: number) => void }) => {
      const uploaded = await putFile(doc.file, onProgress);
      const { file: _file, ...meta } = doc;
      void _file;
      return (await api.post("/company/documents", { ...uploaded, ...meta })).data as CompanyDocument;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.docs }),
  });
}

export function useReplaceDocumentFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file, onProgress }: { id: string; file: File; onProgress?: (p: number) => void }) => {
      const uploaded = await putFile(file, onProgress);
      return (await api.post(`/company/documents/${id}/versions`, uploaded)).data as CompanyDocument;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.docs }),
  });
}

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CompanyDocument> }) =>
      api.patch(`/company/documents/${id}`, data).then((r) => r.data as CompanyDocument),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.docs }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/company/documents/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.docs }),
  });
}

/**
 * Open (or download) a document through a short-lived signed link.
 *
 * The tab is opened synchronously, inside the click, and pointed at the link
 * once it arrives - opening it after the await would be eaten by popup blockers.
 */
export async function openDocument(
  id: string,
  { version, download = false }: { version?: number; download?: boolean } = {}
) {
  const tab = window.open("", "_blank");
  try {
    const { url } = (
      await api.get(`/company/documents/${id}/download`, {
        params: { version, inline: !download },
      })
    ).data as { url: string };
    if (tab) {
      tab.opener = null;
      tab.location.href = url;
    } else {
      window.location.assign(url);
    }
  } catch (e) {
    tab?.close();
    throw e;
  }
}
