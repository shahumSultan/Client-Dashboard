"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  onChange: (v: string) => void;
}

const TabsContext = React.createContext<TabsContextValue>({ value: "", onChange: () => {} });

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ defaultValue = "", value, onValueChange, children, className }: TabsProps) {
  const [internal, setInternal] = React.useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value! : internal;

  const onChange = (v: string) => {
    if (!controlled) setInternal(v);
    onValueChange?.(v);
  };

  return (
    <TabsContext.Provider value={{ value: current, onChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 border-b border-slate-200 mb-6",
        className
      )}
    >
      {children}
    </div>
  );
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function TabsTrigger({ value, className, children, ...props }: TabsTriggerProps) {
  const { value: current, onChange } = React.useContext(TabsContext);
  const active = current === value;

  return (
    <button
      onClick={() => onChange(value)}
      className={cn(
        "px-4 py-2.5 text-sm font-medium transition-colors duration-150 border-b-2 -mb-px",
        active
          ? "border-indigo-600 text-indigo-700"
          : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsContent({ value, className, children, ...props }: TabsContentProps) {
  const { value: current } = React.useContext(TabsContext);
  if (current !== value) return null;
  return (
    <div className={cn("animate-in fade-in-0 duration-200", className)} {...props}>
      {children}
    </div>
  );
}
