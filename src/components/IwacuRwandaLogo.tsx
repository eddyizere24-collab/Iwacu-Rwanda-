/* eslint-disable @next/next/no-img-element */

/**
 * Official IWACU RWANDA logo: the owner's selected concept 03, used exactly as
 * supplied (a pixel crop of the owner's artwork, never redrawn or recoloured).
 * Rising sun, green horizon, dark-green "IWACU", "RWANDA" and the blue line.
 * The artwork has a light background, so it is always shown on a light plate.
 */
export function IwacuRwandaLogo({ className = "" }: { className?: string }) {
  return (
    <img
      src="/brand/iwacu-logo-03-header.png"
      width={300}
      height={264}
      alt="IWACU RWANDA"
      decoding="async"
      draggable={false}
      className={className}
    />
  );
}
