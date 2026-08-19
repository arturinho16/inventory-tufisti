import { describe, expect, it } from "vitest";
import { normalizarFormaYCristalFrontal } from "../../src/lib/openai/analizar-ficha-tecnica";

describe("normalizar forma y cristal frontal", () => {
  it("clasifica 3D curved glass screen como pantalla curva", () => {
    expect(normalizarFormaYCristalFrontal("3D curved glass screen")).toEqual({
      tipoFormaPantalla: "CURVA",
      cristalFrontal: "Gorilla Glass",
    });
  });

  it("usa Gorilla Glass cuando la ficha no indica cristal frontal", () => {
    expect(normalizarFormaYCristalFrontal(null).cristalFrontal).toBe("Gorilla Glass");
    expect(normalizarFormaYCristalFrontal("null").cristalFrontal).toBe("Gorilla Glass");
  });

  it("conserva una protección frontal explícita", () => {
    expect(normalizarFormaYCristalFrontal("Gorilla Glass Victus").cristalFrontal).toBe("Gorilla Glass Victus");
  });
});
