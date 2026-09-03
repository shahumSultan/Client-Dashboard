"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  onChange: (v: string) => void;
}

const TabsContext = React.createContext<TabsContextValue>({
  value: "",
  onChange: () => {},
});

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({
  defaultValue = "",
  value,
  onValueChange,
  children,
  className,
}: TabsProps) {
  const [internal, setInternal] = React.useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : internal;

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
      role="tablist"
      className={cn(
        // Segmented pill rather than an underline — reads as a control on glass
        "glass mb-6 inline-flex items-center gap-1 rounded-full p-1",
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
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => onChange(value)}
      className={cn(
        "cursor-pointer rounded-full px-4 py-2 text-sm font-medium",
        "transition-[background-color,color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
        active
          ? "bg-brand text-white shadow-[0_6px_18px_-8px_var(--brand-glow)]"
          : "text-subtle hover:bg-white/[0.06] hover:text-fg",
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
    <div role="tabpanel" className={cn("animate-fade-up", className)} {...props}>
      {children}
    </div>
  );
}
