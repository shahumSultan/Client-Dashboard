import { cn } from "@/lib/utils";

/**
 * Isometric cube drawn from three rhombus faces — a literal Enigma-Cube rather
 * than a borrowed lightning-bolt icon. Faces are shaded light/mid/dark so the
 * form reads at 16px without any stroke detail.
 */
export function CubeLogo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect width="32" height="32" rx="9" fill="var(--brand)" />
      {/* top face */}
      <path d="M16 7.5 L23 11.5 L16 15.5 L9 11.5 Z" fill="#fff" fillOpacity="0.95" />
      {/* left face */}
      <path d="M9 12.6 L16 16.6 L16 24.5 L9 20.5 Z" fill="#fff" fillOpacity="0.55" />
      {/* right face */}
      <path d="M23 12.6 L23 20.5 L16 24.5 L16 16.6 Z" fill="#fff" fillOpacity="0.3" />
    </svg>
  );
}

export function BrandMark({
  kicker,
  className,
}: {
  kicker?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <CubeLogo size={32} className="shrink-0 drop-shadow-[0_4px_14px_var(--brand-glow)]" />
      <div className="leading-none">
        <span className="block text-sm font-semibold tracking-tight text-fg">
          Enigma-Cube
        </span>
        {kicker && (
          <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-brand-soft">
            {kicker}
          </span>
        )}
      </div>
    </div>
  );
}
