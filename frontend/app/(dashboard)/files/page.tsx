"use client";
import { Paperclip } from "lucide-react";

export default function FilesPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">Files</h1>
        <p className="text-sm text-slate-500 mt-0.5">Deliverables and documents from Enigma-Cube</p>
      </div>
      <div className="text-center py-16 bg-white rounded-xl border border-slate-200 border-dashed">
        <Paperclip size={36} className="mx-auto text-slate-300 mb-3" />
        <p className="text-slate-500 font-medium">Select a project to view files</p>
      </div>
    </div>
  );
}
