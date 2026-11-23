/** Loads Leaflet once from a pinned CDN build with subresource integrity (same build the village picker uses). */
declare global {
  interface Window {
    L?: any;
  }
}

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

export function loadLeaflet(): Promise<any> {
  if (typeof window !== "undefined" && window.L) return Promise.resolve(window.L);

  return new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-iwacu-leaflet="css"]')) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = LEAFLET_CSS;
      css.dataset.iwacuLeaflet = "css";
      css.crossOrigin = "anonymous";
      css.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
      css.onerror = () => css.remove();
      document.head.appendChild(css);
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-iwacu-leaflet="js"]');
    if (existing) {
      existing.addEventListener("load", () => window.L ? resolve(window.L) : reject(new Error("Leaflet did not initialise.")), { once: true });
      existing.addEventListener("error", () => reject(new Error("Map library could not load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.dataset.iwacuLeaflet = "js";
    script.crossOrigin = "anonymous";
    script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
    script.onload = () => window.L ? resolve(window.L) : reject(new Error("Leaflet did not initialise."));
    script.onerror = () => {
      script.remove();
      reject(new Error("Map library could not load."));
    };
    document.body.appendChild(script);
  });
}
