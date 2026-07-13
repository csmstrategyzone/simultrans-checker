"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { createFluid, type FluidHandle, type RGB } from "@/lib/fluid-sim";
import { FluidCursor } from "@/components/fluid-cursor";

/**
 * Brand palette. The sim's dye values are additive and get tone-mapped, so these
 * are scaled well below 1.0 — full-intensity brand hex reads as neon here.
 */
const SUNSET: RGB = { r: 0.42, g: 0.19, b: 0.04 }; // #F97316
const EMBER: RGB = { r: 0.38, g: 0.07, b: 0.07 }; // #DC2626
const ROYAL: RGB = { r: 0.06, g: 0.1, b: 0.26 }; // #1E3A8A

/** ~75% sunset, ~15% ember, ~10% royal. Never white, never rainbow. */
function pickColor(): RGB {
  const n = Math.random();
  if (n < 0.75) return { ...SUNSET };
  if (n < 0.9) return { ...EMBER };
  return { ...ROYAL };
}

const scale = (c: RGB, k: number): RGB => ({ r: c.r * k, g: c.g * k, b: c.b * k });

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(
      c.getContext("webgl2") ||
      c.getContext("webgl") ||
      c.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

/**
 * Ask the GPU what it is rather than inferring from devicePixelRatio — a
 * hi-dpi laptop on integrated Intel graphics would otherwise get the heavy dye
 * resolution and drop frames. Measured 55fps on Intel UHD at 512.
 */
function isIntegratedGPU() {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") ||
      c.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return true;
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const name = String(
      dbg
        ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER),
    );
    return /intel|uhd|hd graphics|iris|swiftshader|llvmpipe|software|mali|adreno|apple gpu/i.test(
      name,
    );
  } catch {
    return true;
  }
}

export function FluidCanvas() {
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<FluidHandle | null>(null);

  // "webgl" | "fallback" (Option A) | "off"
  const [mode, setMode] = useState<"pending" | "webgl" | "fallback" | "off">(
    "pending",
  );

  useEffect(() => {
    if (reduced) return setMode("off");
    if (!window.matchMedia("(pointer: fine)").matches) return setMode("off");

    let cancelled = false;

    // Respect a draining battery.
    const decide = async () => {
      type BatteryNav = Navigator & {
        getBattery?: () => Promise<{ charging: boolean; level: number }>;
      };
      try {
        const nav = navigator as BatteryNav;
        if (nav.getBattery) {
          const bat = await nav.getBattery();
          if (!bat.charging && bat.level < 0.2) {
            if (!cancelled) setMode("off");
            return;
          }
        }
      } catch {
        /* Battery API unavailable — carry on. */
      }
      if (cancelled) return;
      setMode(webglAvailable() ? "webgl" : "fallback");
    };

    void decide();
    return () => {
      cancelled = true;
    };
  }, [reduced]);

  useEffect(() => {
    if (mode !== "webgl" || !canvasRef.current) return;

    // Lower the dye resolution on modest hardware.
    const lowEnd = isIntegratedGPU();

    const sim = createFluid(canvasRef.current, {
      SIM_RESOLUTION: 128,
      DYE_RESOLUTION: lowEnd ? 512 : 1024,
      DENSITY_DISSIPATION: 3.5,
      VELOCITY_DISSIPATION: 2,
      PRESSURE: 0.8,
      PRESSURE_ITERATIONS: 20,
      CURL: 3,
      SPLAT_RADIUS: 0.25,
      SPLAT_FORCE: 6000,
      SHADING: true,
    });

    if (!sim) {
      setMode("fallback");
      return;
    }
    simRef.current = sim;

    const FORCE = 6000;
    let lastX = 0;
    let lastY = 0;
    let primed = false;
    let idleTimer: ReturnType<typeof setTimeout>;
    let intensity = 1; // decays toward 0 while the cursor rests

    const move = (e: MouseEvent) => {
      if (!primed) {
        lastX = e.clientX;
        lastY = e.clientY;
        primed = true;
        return;
      }
      const dx = (e.clientX - lastX) * FORCE * 0.0015 * intensity;
      const dy = (lastY - e.clientY) * FORCE * 0.0015 * intensity; // GL y is flipped
      lastX = e.clientX;
      lastY = e.clientY;

      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return;
      sim.splat(e.clientX, e.clientY, dx, dy, pickColor());

      // Movement wakes it back up; stillness lets it settle.
      intensity = 1;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        intensity = 0.05;
      }, 1000);
    };

    // A drop in the pool: 3x force.
    const down = (e: MouseEvent) => {
      const c = scale(pickColor(), 1.6);
      sim.splat(e.clientX, e.clientY, 0, 0, c);
      sim.splat(e.clientX, e.clientY, FORCE * 0.0045, FORCE * 0.0045, c);
      sim.splat(e.clientX, e.clientY, -FORCE * 0.0045, -FORCE * 0.0045, c);
      intensity = 1;
    };

    // Wake-up splat — the fluid is alive before you touch it.
    const wake = setTimeout(() => {
      sim.splatNorm(0.5, 0.55, 0, 220, scale(SUNSET, 1.1));
    }, 500);

    const onResize = () => sim.resize();
    const onVisibility = () => sim.pause(document.hidden);

    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("mousedown", down, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(wake);
      clearTimeout(idleTimer);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mousedown", down);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      sim.destroy();
      simRef.current = null;
    };
  }, [mode]);

  if (mode === "off" || mode === "pending") return null;
  if (mode === "fallback") return <FluidCursor />;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      data-fluid-canvas
      className="pointer-events-none fixed inset-0 h-full w-full"
      style={{ zIndex: -1, mixBlendMode: "multiply" }}
    />
  );
}
