import { CubeLogo } from "@/components/shared/BrandMark";

/**
 * Full-screen wait state. Uses the brand mark rather than a bare spinner so
 * the first paint after sign-in still looks like the product.
 */
export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="grid h-dvh place-items-center px-6">
      <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
        <CubeLogo size={44} className="animate-pulse" />
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-subtle">
          {label ?? "Loading"}
        </p>
      </div>
    </div>
  );
}
