import { describe, expect, it } from "vitest";
import { normalizarProfundidadColor } from "../../src/lib/openai/analizar-ficha-tecnica";

describe("normalizarProfundidadColor", () => {
  it("conserva solamente el primer valor expresado en bits", () => {
    expect(normalizarProfundidadColor("24 bit, 16777216 colors")).toBe("24 bit");
    expect(normalizarProfundidadColor("30 bits\n1070 millones de colores")).toBe("30 bits");
  });

  it("admite valores vacíos", () => {
    expect(normalizarProfundidadColor(null)).toBeNull();
  });
});
