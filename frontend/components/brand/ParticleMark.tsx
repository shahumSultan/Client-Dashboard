"use client";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * The Enigma-Cube mark as a point cloud, the way enigma-cube.com draws it:
 * scattered points drift together and settle into the cube, then breathe.
 *
 * Points are sampled from the real logo's pixels (no hand-traced geometry),
 * so the shape is always the brand mark. Canvas 2D: a few thousand 1px dots
 * is well inside budget, and it pauses whenever it's off-screen or the tab is
 * hidden. Reduced motion renders the settled mark with no movement.
 */

interface Particle {
  tx: number; // target (settled) position, CSS px
  ty: number;
  sx: number; // start position
  sy: number;
  delay: number; // 0..1 share of the assembly time spent waiting
  alpha: number;
  phase: number;
}

const ASSEMBLE_MS = 2200;

function easeOutExpo(t: number) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function ParticleMark({
  src = "/enigma-cube-white.png",
  density = 0.55,
  className,
}: {
  src?: string;
  /** Share of the mark's ink pixels that become points (on a 2px grid). */
  density?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let raf = 0;
    let start = 0;
    let visible = true;
    let pointer: { x: number; y: number } | null = null;
    let cancelled = false;

    const img = new Image();
    img.src = src;

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Fit the mark inside the box, preserving its aspect.
      const scale = Math.min(width / img.naturalWidth, height / img.naturalHeight) * 0.9;
      const mw = Math.max(1, Math.round(img.naturalWidth * scale));
      const mh = Math.max(1, Math.round(img.naturalHeight * scale));
      const ox = (width - mw) / 2;
      const oy = (height - mh) / 2;

      const off = document.createElement("canvas");
      off.width = mw;
      off.height = mh;
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return;
      octx.drawImage(img, 0, 0, mw, mh);
      const data = octx.getImageData(0, 0, mw, mh).data;

      particles = [];
      const step = 2;
      for (let y = 0; y < mh; y += step) {
        for (let x = 0; x < mw; x += step) {
          const a = data[(y * mw + x) * 4 + 3];
          if (a < 120 || Math.random() > density) continue;
          // A little jitter off the grid gives the site's stippled texture.
          const tx = ox + x + (Math.random() - 0.5) * step;
          const ty = oy + y + (Math.random() - 0.5) * step;
          // Start scattered around the box, drifting in from all sides.
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.max(width, height) * (0.35 + Math.random() * 0.6);
          particles.push({
            tx,
            ty,
            sx: width / 2 + Math.cos(angle) * dist,
            sy: height / 2 + Math.sin(angle) * dist * 0.7,
            delay: Math.random() * 0.45,
            alpha: 0.35 + Math.random() * 0.65,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }
    };

    const draw = (now: number) => {
      if (!start) start = now;
      const elapsed = reduced ? Infinity : now - start;
      const t = elapsed / ASSEMBLE_MS;
      const time = now / 1000;

      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        const local = Math.min(1, Math.max(0, (t - p.delay) / (1 - p.delay)));
        const k = easeOutExpo(local);
        let x = p.sx + (p.tx - p.sx) * k;
        let y = p.sy + (p.ty - p.sy) * k;

        if (!reduced && local >= 1) {
          // Settled: a slow breath so the mark reads as alive, not printed.
          x += Math.sin(time * 0.8 + p.phase) * 0.6;
          y += Math.cos(time * 0.7 + p.phase) * 0.6;
          if (pointer) {
            const dx = x - pointer.x;
            const dy = y - pointer.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 3600) {
              const push = (1 - d2 / 3600) * 10;
              const d = Math.sqrt(d2) || 1;
              x += (dx / d) * push;
              y += (dy / d) * push;
            }
          }
        }

        ctx.globalAlpha = p.alpha * (0.25 + 0.75 * k);
        ctx.fillStyle = "#eaeaea";
        ctx.fillRect(x, y, 1.15, 1.15);
      }
      ctx.globalAlpha = 1;

      if (!reduced && visible) raf = requestAnimationFrame(draw);
    };

    const run = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    };

    img.onload = () => {
      if (cancelled) return;
      build();
      run();
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && document.visibilityState === "visible";
      if (visible && particles.length) run();
    });
    io.observe(canvas);

    const onVisibility = () => {
      visible = document.visibilityState === "visible";
      if (visible && particles.length) run();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const ro = new ResizeObserver(() => {
      if (!img.complete || !img.naturalWidth) return;
      build();
      start = performance.now() - ASSEMBLE_MS; // re-layout settled, no replay
      run();
    });
    ro.observe(canvas);

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onLeave = () => (pointer = null);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [src, density]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("block h-full w-full", className)}
    />
  );
}
