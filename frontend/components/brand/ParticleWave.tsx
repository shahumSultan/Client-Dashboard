"use client";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * The drifting dotted wave from the bottom of enigma-cube.com's hero: a field
 * of points on a slowly rolling surface, seen in perspective.
 *
 * Decorative only. It pauses off-screen and on hidden tabs, and with reduced
 * motion it draws a single still frame.
 */
export function ParticleWave({
  className,
  rows = 46,
  cols = 150,
  intensity = 1,
}: {
  className?: string;
  rows?: number;
  cols?: number;
  /** Brightness and dot size multiplier; the hero runs it hot like the site. */
  intensity?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let raf = 0;
    let visible = true;

    // Per-point grain, fixed so the field shimmers rather than flickers.
    const grain = Array.from({ length: rows * cols }, () => 0.45 + Math.random() * 0.55);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      const t = reduced ? 12 : now / 1000;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#eaeaea";

      for (let r = 0; r < rows; r++) {
        // z: 0 = far (top of the canvas), 1 = near (bottom).
        const z = r / (rows - 1);
        const depth = 0.25 + z * 0.75;
        for (let c = 0; c < cols; c++) {
          const u = c / (cols - 1) - 0.5; // -0.5..0.5 across
          const wave =
            Math.sin(u * 7 + t * 0.35 + z * 4.2) * 0.55 +
            Math.sin(u * 2.6 - t * 0.22 + z * 9) * 0.35 +
            Math.sin(z * 14 - t * 0.5) * 0.18;

          const x = width / 2 + u * width * (0.9 + depth * 1.4);
          const y = height * (0.12 + z * 0.78) - wave * height * 0.11 * depth;
          if (x < -2 || x > width + 2) continue;

          // Brighter on the crests and nearer rows; the far rows fade out.
          const crest = 0.55 + wave * 0.45;
          ctx.globalAlpha = Math.max(0, Math.min(1, grain[r * cols + c] * crest * Math.pow(z, 1.6) * 0.9 * intensity));
          const s = (0.8 + depth * 0.7) * Math.min(1.35, 0.85 + intensity * 0.25);
          ctx.fillRect(x, y, s, s);
        }
      }
      ctx.globalAlpha = 1;
      if (!reduced && visible) raf = requestAnimationFrame(draw);
    };

    const run = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    };

    resize();
    run();

    const ro = new ResizeObserver(() => {
      resize();
      run();
    });
    ro.observe(canvas);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && document.visibilityState === "visible";
      if (visible) run();
    });
    io.observe(canvas);

    const onVisibility = () => {
      visible = document.visibilityState === "visible";
      if (visible) run();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [rows, cols, intensity]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("pointer-events-none block h-full w-full", className)}
    />
  );
}
