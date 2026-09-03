"use client";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { useCreateRequest } from "@/hooks/useProjects";

const CATEGORIES = [
  { value: "feature", label: "Feature request" },
  { value: "bug", label: "Bug report" },
  { value: "change", label: "Change request" },
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

export function NewRequestDialog({
  projectId,
  open,
  onOpenChange,
}: NewRequestDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [priority, setPriority] = useState("medium");
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});
  const createRequest = useCreateRequest();

  function reset() {
    setTitle("");
    setDescription("");
    setCategory("other");
    setPriority("medium");
    setErrors({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const found: typeof errors = {};
    if (!title.trim()) found.title = "Give your request a short title.";
    if (!description.trim()) found.description = "Describe what you need, so the team can act on it.";
    if (Object.keys(found).length > 0) {
      setErrors(found);
      document.getElementById(`req-${Object.keys(found)[0]}`)?.focus();
      return;
    }

    try {
      await createRequest.mutateAsync({
        project_id: projectId,
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
      });
      toast.success("Request submitted", {
        description: "The Enigma-Cube team has been notified.",
      });
      onOpenChange(false);
      reset();
    } catch {
      toast.error("Couldn't submit your request", {
        description: "Please try again in a moment.",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} label="New request">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New request</DialogTitle>
          <DialogDescription>
            Ask for a feature, report a bug, or request a change. You&apos;ll get a
            reply here and a notification when it moves.
          </DialogDescription>
          <DialogClose onClick={() => onOpenChange(false)} />
        </DialogHeader>

        <form id="new-request-form" onSubmit={handleSubmit} noValidate className="space-y-5 px-6 pb-5">
          <Field label="Title" htmlFor="req-title" required error={errors.title}>
            <Input
              id="req-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setErrors((p) => ({ ...p, title: undefined }));
              }}
              aria-invalid={!!errors.title}
              placeholder="Add an export button to the report view"
            />
          </Field>

          <Field
            label="Details"
            htmlFor="req-description"
            required
            error={errors.description}
            hint="What should happen, and why? Specifics help us get it right first time."
          >
            <Textarea
              id="req-description"
              rows={4}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setErrors((p) => ({ ...p, description: undefined }));
              }}
              aria-invalid={!!errors.description}
              placeholder="Describe the change you'd like…"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Category" htmlFor="req-category">
              <Select
                id="req-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Priority" htmlFor="req-priority">
              <Select
                id="req-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </form>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} type="button">
            Cancel
          </Button>
          <Button type="submit" form="new-request-form" loading={createRequest.isPending}>
            Submit request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
