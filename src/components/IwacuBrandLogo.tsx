import type { CSSProperties } from "react";

type IwacuBrandLogoProps = {
  width?: CSSProperties["width"];
  className?: string;
};

/**
 * IWACU RWANDA primary wordmark.
 * A warm sunrise, a calm green horizon and a fine Rwanda-blue accent.
 * Keep this mark free of basket/agaseke imagery; reuse it in the header and home hero.
 */
export function IwacuBrandLogo({
  width = "clamp(108px, 36vw, 142px)",
  className = "",
}: IwacuBrandLogoProps) {
  return (
    <span
      role="img"
      aria-label="IWACU RWANDA"
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width, maxWidth: "100%" }}
    >
      <svg viewBox="0 0 320 138" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <g fill="none" stroke="#FAD201" strokeWidth="3" strokeLinecap="round">
          <path d="M160 19V7" />
          <path d="M145 22L139 12" />
          <path d="M175 22L181 12" />
          <path d="M134 34L123 30" />
          <path d="M186 34L197 30" />
          <path d="M153 12L150 4" />
          <path d="M167 12L170 4" />
        </g>
        <path d="M142 48a18 18 0 0 1 36 0Z" fill="#FAD201" />
        <path d="M15 61C57 45 110 51 160 54C210 57 263 45 305 61" fill="none" stroke="#20603D" strokeWidth="5" strokeLinecap="round" />
        <text x="160" y="108" fill="#20603D" textAnchor="middle" fontFamily="var(--font-body), 'DM Sans', sans-serif" fontSize="53" fontWeight="800" letterSpacing="-2.8">IWACU</text>
        <path d="M42 115C110 121 210 121 278 115" fill="none" stroke="#00A3E0" strokeWidth="2.4" strokeLinecap="round" />
        <text x="160" y="134" fill="#20603D" fillOpacity="0.92" textAnchor="middle" fontFamily="var(--font-body), 'DM Sans', sans-serif" fontSize="19" fontWeight="700" letterSpacing="4.2">RWANDA</text>
      </svg>
    </span>
  );
}
