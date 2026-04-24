"use client";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateRequest } from "@/hooks/useProjects";

const CATEGORIES = [
  { value: "feature", label: "Feature Request" },
  { value: "bug", label: "Bug Report" },
  { value: "change", label: "Change Request" },
  { value: "question", label: "Question" },
  { value: "other", label: "Other" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

interface NewRequestDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function NewRequestDialog({ projectId, open, onOpenChange }: NewRequestDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [priority, setPriority] = useState("medium");
  const createRequest = useCreateRequest();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    try {
      await createRequest.mutateAsync({ project_id: projectId, title, description, category, priority });
      toast.success("Request submitted successfully");
      onOpenChange(false);
      setTitle("");
      setDescription("");
      setCategory("other");
      setPriority("medium");
    } catch {
      toast.error("Failed to submit request");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Request</DialogTitle>
          <DialogDescription>
            Submit a feature request, bug report, or change request to the Enigma-Cube team.
          </DialogDescription>
          <DialogClose onClick={() => onOpenChange(false)} />
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-2 space-y-4">
          <div>
            <Label htmlFor="req-title">Title</Label>
            <Input
              id="req-title"
              placeholder="Briefly describe your request..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="req-description">Description</Label>
            <textarea
              id="req-description"
              rows={4}
              placeholder="Provide as much detail as possible..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="req-category">Category</Label>
              <select
                id="req-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="req-priority">Priority</Label>
              <select
                id="req-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
            disabled={createRequest.isPending || !title.trim() || !description.trim()}
          >
            {createRequest.isPending ? "Submitting…" : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
