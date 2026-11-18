import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The Enigma-Cube mark - the same white asset enigma-cube.com uses in its
 * header (/brand/ec-logo-white.png). Every surface it sits on here is dark;
 * the red mark is reserved for the favicon.
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
        <span className="block font-display text-[17px] font-normal tracking-tight text-fg-strong">
          Enigma-Cube
        </span>
        {kicker && (
          <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-brand-soft">
            {kicker}
          </span>
        )}
      </div>
    </div>
  );
}
