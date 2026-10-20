"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#0f172a", "#10b981", "#f59e0b", "#64748b", "#34d399"];
const DURATION = 1400;

export function SearchCompleteCelebration({ searchId, onComplete }: { searchId: string; onComplete?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onComplete?.();
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) return;
    const resize = () => {
      const scale = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * scale;
      canvas.height = window.innerHeight * scale;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(scale, 0, 0, scale, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 56 }, (_, index) => ({
      x: window.innerWidth * 0.5 + (Math.random() - 0.5) * 80,
      y: window.innerHeight * 0.28 + (Math.random() - 0.5) * 24,
      vx: (Math.random() - 0.5) * 8,
      vy: -Math.random() * 6 - 2,
      size: Math.random() * 5 + 3,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.24,
      color: COLORS[index % COLORS.length],
    }));
    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const progress = Math.min(1, elapsed / DURATION);
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      context.globalAlpha = 1 - Math.max(0, (progress - 0.72) / 0.28);
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.16;
        particle.rotation += particle.spin;
        context.save();
        context.translate(particle.x, particle.y);
        context.rotate(particle.rotation);
        context.fillStyle = particle.color;
        context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 1.8);
        context.restore();
      });
      context.globalAlpha = 1;
      if (elapsed < DURATION) frame = requestAnimationFrame(tick);
      else onComplete?.();
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };
  }, [onComplete, searchId]);

  return <>
    <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60]" />
    <div role="status" aria-live="polite" className="pointer-events-none fixed left-1/2 top-6 z-[61] -translate-x-1/2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 shadow-lg">Search complete — your results are ready</div>
  </>;
}
