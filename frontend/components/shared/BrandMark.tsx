import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The Enigma-Cube mark.
 *
 * The white asset is used rather than the red one: every surface it sits on in
 * this product is dark, and the red version (#d44954) is a lighter, pinker red
 * than the brand primary (#a92e2e) — two reds next to each other read as a
 * mistake. The red asset is kept for the favicon, where the tab background may
 * be light.
 */
export function CubeLogo({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/enigma-cube-white.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      priority
      // The source is 389x416, so constrain height and let width follow rather
      // than squashing it into a square.
      style={{ width: "auto", height: size }}
      className={cn("select-none", className)}
    />
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
      <CubeLogo size={28} className="shrink-0" />
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
