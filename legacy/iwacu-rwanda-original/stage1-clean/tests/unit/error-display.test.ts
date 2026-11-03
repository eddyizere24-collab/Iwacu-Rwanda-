import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { ErrorDisplay } from "@/components/ErrorDisplay";

describe("ErrorDisplay", () => {
  it("renders with code and messageKiny", () => {
    const html = renderToStaticMarkup(
      createElement(ErrorDisplay, {
        code: "NETWORK_ERROR",
        messageKiny: "Ikibazo cy'urukurikirane",
        messageEng: "Network error",
      })
    );
    expect(html).toContain("role=\"alert\"");
    expect(html).toContain("Ikibazo");
  });

  it("renders retry button when onRetry provided", () => {
    const html = renderToStaticMarkup(
      createElement(ErrorDisplay, {
        code: "GPS_DENIED",
        messageKiny: "GPS yanze",
        onRetry: () => undefined,
      })
    );
    expect(html).toContain("button");
    expect(html).toContain("Ongera");
  });
});
