import React from "react";

interface RwandanSunProps {
  className?: string;
  size?: number;
  glow?: boolean;
}

/**
 * The iconic Rwandan Sun ("Izuba") symbol featuring 24 radiant rays
 * with warm golden and amber gradients, inspired by the national emblem and flag.
 */
export function RwandanSun({
  className = "",
  size = 48,
  glow = true,
}: RwandanSunProps) {
  // Generate 24 rays around 360 degrees (15 degrees apart)
  const rays = Array.from({ length: 24 }).map((_, i) => {
    const angle = i * 15;
    return (
      <line
        key={i}
        x1="50"
        y1="50"
        x2="50"
        y2="10"
        stroke="url(#sunRayGradient)"
        strokeWidth="2.8"
        strokeLinecap="round"
        transform={`rotate(${angle} 50 50)`}
      />
    );
  });

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Izuba ry'u Rwanda (Rwandan Sun)"
    >
      {glow && (
        <div
          className="absolute inset-0 rounded-full blur-md opacity-60 animate-pulse pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(250,210,1,0.6) 0%, rgba(229,184,0,0.2) 60%, transparent 80%)",
          }}
        />
      )}

      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 drop-shadow-sm select-none"
      >
        <defs>
          <radialGradient
            id="sunCoreGradient"
            cx="50%"
            cy="50%"
            r="50%"
            fx="45%"
            fy="45%"
          >
            <stop offset="0%" stopColor="#FFF4B8" />
            <stop offset="35%" stopColor="#FAD201" />
            <stop offset="80%" stopColor="#E5B800" />
            <stop offset="100%" stopColor="#C99700" />
          </radialGradient>

          <linearGradient
            id="sunRayGradient"
            x1="0%"
            y1="100%"
            x2="0%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#FAD201" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#FAD201" />
            <stop offset="100%" stopColor="#FFF099" />
          </linearGradient>

          <filter id="sunGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 24 Radiant Sun Rays */}
        <g filter="url(#sunGlowFilter)">{rays}</g>

        {/* Inner Golden Ring */}
        <circle
          cx="50"
          cy="50"
          r="22"
          fill="none"
          stroke="#E5B800"
          strokeWidth="1.2"
          opacity="0.5"
        />

        {/* Sun Core Disc */}
        <circle
          cx="50"
          cy="50"
          r="18"
          fill="url(#sunCoreGradient)"
          stroke="#FFFBE0"
          strokeWidth="1"
        />

        {/* Subtle Agaseke Center Star/Diamond Highlight */}
        <polygon
          points="50,38 53,47 62,50 53,53 50,62 47,53 38,50 47,47"
          fill="#FFFDF0"
          opacity="0.9"
        />
      </svg>
    </div>
  );
}

/**
 * Iwacu AI brand mark: a bright sun with many-coloured rays.
 * Inline SVG keeps the mark crisp on small Android screens without an image download.
 */
export function IwacuAISun({
  className = "",
  size = 42,
}: {
  className?: string;
  size?: number;
}) {
  const palette = [
    "#F94144", "#F3722C", "#F8961E", "#F9C74F",
    "#90BE6D", "#43AA8B", "#4D908E", "#277DA1",
    "#577590", "#7B2CBF", "#B5179E", "#F15BB5",
  ];
  const rays = Array.from({ length: 24 }, (_, index) => {
    const angle = index * 15;
    const colour = palette[index % palette.length];
    const outerPoint = index % 2 === 0 ? 8 : 12;
    return (
      <line
        key={index}
        x1="50"
        y1="50"
        x2="50"
        y2={outerPoint}
        stroke={colour}
        strokeWidth="3.4"
        strokeLinecap="round"
        transform={`rotate(${angle} 50 50)`}
      />
    );
  });

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Iwacu AI sun logo"
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-sm"
      >
        <defs>
          <radialGradient id="iwacuAiSunCore" cx="42%" cy="38%" r="68%">
            <stop offset="0%" stopColor="#FFF8D6" />
            <stop offset="48%" stopColor="#FFD34E" />
            <stop offset="100%" stopColor="#F08A24" />
          </radialGradient>
        </defs>
        <g>{rays}</g>
        <circle cx="50" cy="50" r="22" fill="url(#iwacuAiSunCore)" stroke="#FFFFFF" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="14" fill="#FFF3BC" opacity="0.42" />
        <path d="M50 39L53.5 46.5L62 50L53.5 53.5L50 62L46.5 53.5L38 50L46.5 46.5Z" fill="#FFFFFF" opacity="0.95" />
      </svg>
    </span>
  );
}

/**
 * Geometric Agaseke icon (Peace Basket) combined with Rwandan Sun
 */
export function AgasekeEmblem({
  className = "",
  size = 36,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Agaseke n'Izuba"
    >
      <svg
        viewBox="0 0 40 40"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          width="40"
          height="40"
          rx="10"
          fill="url(#agasekeBg)"
          className="transition-colors"
        />
        <defs>
          <linearGradient id="agasekeBg" x1="0" y1="0" x2="40" y2="40">
            <stop offset="0%" stopColor="#00A3E0" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
        </defs>

        {/* Agaseke woven lid & basket silhouette */}
        <path
          d="M20 7L24 16H16L20 7Z"
          fill="#FAD201"
          stroke="#FFFFFF"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path
          d="M14 17H26L23 31H17L14 17Z"
          fill="#20603D"
          stroke="#FFFFFF"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Zigzag weave pattern */}
        <path
          d="M15.5 22L17.5 20L19.5 22L21.5 20L23.5 22L24.5 22"
          stroke="#FAD201"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="5" r="1.5" fill="#FAD201" />
      </svg>
    </div>
  );
}
