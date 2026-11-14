"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { PianoNote } from "@/modules/music/piano";
import "./listening-line.css";

export type ListeningLineVariant =
  | "hero"
  | "manifesto"
  | "stage-track"
  | "piano-bridge"
  | "path-branch"
  | "cta-resolution";

type ListeningLineProps = {
  variant: ListeningLineVariant;
  className?: string;
  label?: string;
  pulse?: { note: PianoNote; sequence: number } | null;
};

type OpeningListeningLineProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  manifestoRef: RefObject<HTMLElement | null>;
  pulse: { note: PianoNote; sequence: number } | null;
};

type OpeningGeometry = {
  width: number;
  height: number;
  seam: number;
};

const openingTones = ["lavender", "lime", "coral", "lavender", "lime", "coral"] as const;

function openingPath(width: number, seam: number, amplitude: number) {
  const peak = seam - amplitude * 2 - 8;
  const trough = seam - 8;
  const lowerPulse = seam + 18;
  const lowerPeak = lowerPulse + amplitude * 0.65;
  const lowerTrough = lowerPulse - amplitude * 0.25;

  return [
    `M 0 ${peak}`,
    `C ${width * 0.08} ${peak} ${width * 0.08} ${trough} ${width * 0.18} ${trough}`,
    `S ${width * 0.34} ${peak} ${width * 0.44} ${peak}`,
    `S ${width * 0.60} ${trough} ${width * 0.70} ${trough}`,
    `S ${width * 0.80} ${peak} ${width * 0.86} ${peak}`,
    `C ${width * 0.94} ${peak} ${width * 0.94} ${lowerPulse} ${width * 0.86} ${lowerPulse}`,
    `C ${width * 0.78} ${lowerPulse} ${width * 0.78} ${lowerPeak} ${width * 0.68} ${lowerPeak}`,
    `S ${width * 0.54} ${lowerTrough} ${width * 0.44} ${lowerTrough}`,
    `S ${width * 0.28} ${lowerPeak} ${width * 0.18} ${lowerPeak}`,
    `S ${width * 0.07} ${lowerPulse} 0 ${lowerPulse}`,
  ].join(" ");
}

/** One SVG path spans the hero and manifesto, so section paint order cannot split it. */
export function OpeningListeningLine({ containerRef, manifestoRef, pulse }: OpeningListeningLineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [geometry, setGeometry] = useState<OpeningGeometry | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const manifesto = manifestoRef.current;
    const svg = svgRef.current;
    if (!container || !manifesto || !svg) return;

    const measure = () => {
      const width = Math.round(svg.getBoundingClientRect().width);
      const height = Math.round(container.getBoundingClientRect().height);
      const seam = Math.round(manifesto.offsetTop);
      if (!width || !height) return;

      setGeometry((current) => current?.width === width && current.height === height && current.seam === seam
        ? current
        : { width, height, seam });
    };

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(manifesto);
    window.addEventListener("resize", measure);
    measure();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [containerRef, manifestoRef]);

  const width = geometry?.width ?? 240;
  const height = geometry?.height ?? 1000;
  const seam = geometry?.seam ?? 0;
  const amplitude = Math.min(32, Math.max(14, width * 0.04));
  const path = geometry ? openingPath(width, seam, amplitude) : "";
  const lowerPulse = seam + 18;
  const markerPoints: Array<[number, number, typeof openingTones[number]]> = [
    [width * 0.18, seam - 8, openingTones[0]],
    [width * 0.44, seam - amplitude * 2 - 8, openingTones[1]],
    [width * 0.70, seam - 8, openingTones[2]],
    [width * 0.68, lowerPulse + amplitude * 0.65, openingTones[3]],
    [width * 0.44, lowerPulse - amplitude * 0.25, openingTones[4]],
    [width * 0.18, lowerPulse + amplitude * 0.65, openingTones[5]],
  ];

  return (
    <svg
      ref={svgRef}
      className="listening-line opening-listening-line"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      role="presentation"
      style={{ height: geometry ? `${height}px` : "100%", opacity: geometry ? undefined : 0 }}
    >
      <path className="listening-line__path" d={path} />
      <path className="listening-line__current" d={path} />
      {pulse && (
        <path
          key={pulse.sequence}
          className={`listening-line__strike listening-line__strike--${["lavender", "lime", "coral"][pulse.note.midi % 3]}`}
          d={path}
          pathLength="1000"
        />
      )}
      {geometry && markerPoints.map(([cx, cy, tone], index) => (
        <circle
          className={`listening-line__pulse listening-line__pulse--${tone} ${pulse && index === pulse.note.midi % markerPoints.length ? "is-lit" : ""}`}
          cx={cx}
          cy={cy}
          r={3}
          key={`opening-${index}`}
          style={{ animationDelay: `${index * 170}ms` }}
        />
      ))}
    </svg>
  );
}

const variantPaths: Record<ListeningLineVariant, string> = {
  hero: "M4 32 C24 32 22 12 42 12 S60 52 80 52 S98 20 118 20 S136 42 156 42 S174 8 194 8 S212 32 236 32",
  manifesto: "M4 32 C24 32 24 18 44 18 S64 46 84 46 S104 22 124 22 S144 40 164 40 S184 24 204 24 S220 32 236 32",
  "stage-track": "M32 4 C32 24 32 24 32 44 S32 64 32 84 S32 104 32 124 S32 144 32 164 S32 184 32 204 S32 224 32 244",
  "piano-bridge": "M4 32 C24 32 24 18 44 18 S64 46 84 46 S104 18 124 18 S144 46 164 46 S184 18 204 18 S220 32 236 32",
  "path-branch": "M4 32 C28 32 32 32 48 32 M48 32 C68 32 68 10 92 10 S116 10 132 10 M48 32 C72 32 88 32 112 32 S124 32 132 32 M48 32 C68 32 68 54 92 54 S116 54 132 54",
  "cta-resolution": "M4 32 C28 32 28 12 52 12 S76 52 100 52 S124 18 148 18 S172 46 196 46 S216 32 236 32",
};

const pulsePoints: Record<ListeningLineVariant, Array<[number, number, string]>> = {
  hero: [[42, 12, "lavender"], [118, 20, "lime"], [194, 8, "coral"]],
  manifesto: [[44, 18, "lavender"], [124, 22, "lime"], [204, 24, "coral"]],
  "stage-track": [[32, 44, "lavender"], [32, 84, "lime"], [32, 124, "coral"], [32, 164, "lavender"], [32, 204, "lime"]],
  "piano-bridge": [[44, 18, "lavender"], [84, 46, "lime"], [124, 18, "coral"], [164, 46, "lavender"], [204, 18, "lime"]],
  "path-branch": [[48, 32, "charcoal"], [132, 10, "lavender"], [132, 32, "lime"], [132, 54, "coral"]],
  "cta-resolution": [[52, 12, "lavender"], [100, 52, "lime"], [148, 18, "coral"], [196, 46, "lavender"]],
};

const viewBoxes: Record<ListeningLineVariant, string> = {
  hero: "0 0 240 64",
  manifesto: "0 0 240 64",
  "stage-track": "0 0 64 248",
  "piano-bridge": "0 0 240 64",
  "path-branch": "0 0 140 64",
  "cta-resolution": "0 0 240 64",
};

/** Decorative musical thread, shaped for its role in the landing-page narrative. */
export function ListeningLine({ variant, className = "", label, pulse }: ListeningLineProps) {
  return (
    <svg
      className={`listening-line listening-line--${variant} ${className}`.trim()}
      viewBox={viewBoxes[variant]}
      preserveAspectRatio={variant === "stage-track" ? "none" : "xMidYMid meet"}
      aria-hidden="true"
      focusable="false"
      role="presentation"
      data-label={label}
    >
      <path className="listening-line__path" d={variantPaths[variant]} />
      <path className="listening-line__current" d={variantPaths[variant]} />
      {pulse && (
        <path
          key={pulse.sequence}
          className={`listening-line__strike listening-line__strike--${["lavender", "lime", "coral"][pulse.note.midi % 3]}`}
          d={variantPaths[variant]}
          pathLength="1000"
        />
      )}
      {pulsePoints[variant].map(([cx, cy, tone], index) => (
        <circle
          className={`listening-line__pulse listening-line__pulse--${tone} ${pulse && index === pulse.note.midi % pulsePoints[variant].length ? "is-lit" : ""}`}
          cx={cx}
          cy={cy}
          r={variant === "stage-track" ? 2.5 : 3}
          key={`${variant}-${index}`}
          style={{ animationDelay: `${index * 170}ms` }}
        />
      ))}
    </svg>
  );
}
