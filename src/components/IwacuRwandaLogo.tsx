"use client";

import type { SVGProps } from "react";

/**
 * Official IWACU RWANDA logo, based on the owner's selected concept 03.
 * A rising golden sun meets a quiet green horizon; the custom wordmark stays
 * legible at compact header sizes. No basket imagery.
 */
export function IwacuRwandaLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 220 48"
      role="img"
      aria-label="IWACU RWANDA"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      focusable="false"
      {...props}
    >
      <defs>
        <linearGradient id="iwacu-logo-sun" x1="14" y1="5" x2="42" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE45C" />
          <stop offset="1" stopColor="#E7AE00" />
        </linearGradient>
        <linearGradient id="iwacu-logo-green" x1="4" y1="24" x2="55" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0B5134" />
          <stop offset="1" stopColor="#20603D" />
        </linearGradient>
      </defs>
      <g stroke="#FAD201" strokeWidth="2.5" strokeLinecap="round">
        <path d="M13 23 7.5 17.5" />
        <path d="M23 15V7" />
        <path d="M33 18 38.5 12.5" />
        <path d="M8 26H3" />
        <path d="M38 26H43" />
      </g>
      <path d="M9 28.5a14 14 0 0 1 28 0" fill="url(#iwacu-logo-sun)" />
      <path d="M3 31.5c12-7.2 28.8-8.4 43.5-1.2" stroke="url(#iwacu-logo-green)" strokeWidth="4" strokeLinecap="round" />
      <path d="M7 36.2c11.5-3.2 25.8-3.1 37.2.2" stroke="#00A3E0" strokeWidth="1.8" strokeLinecap="round" />
      <text x="57" y="27.5" fill="#FFFFFF" fontFamily="Arial, Helvetica, sans-serif" fontSize="25" fontWeight="800" letterSpacing="-1.1">IWACU</text>
      <text x="59" y="41.5" fill="#FAD201" fontFamily="Arial, Helvetica, sans-serif" fontSize="9.5" fontWeight="700" letterSpacing="4.1">RWANDA</text>
    </svg>
  );
}
