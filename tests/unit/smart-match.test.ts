import { describe, expect, it } from "vitest";
import { calcularCompatibilidad, type PantallaComparable } from "../../src/lib/smart-match/calcular-compatibilidad";

const pantalla: PantallaComparable = { anchoDisplayMm: 72, altoDisplayMm: 160, diagonalMm: 171, tipoFormaPantalla: "PLANA", aspectRatio: "20:9", areaDisplayPorcentaje: 90, cristalFrontal: null };

describe("Smart Match", () => {
  it("otorga compatibilidad completa a medidas y forma iguales", () => {
    const resultado = calcularCompatibilidad(pantalla, { ...pantalla });
    expect(resultado.porcentaje).toBe(100);
    expect(resultado.estado).toBe("Compatible");
    expect(resultado.nivel).toBe("Alta compatibilidad");
    expect(resultado.formaCoincide).toBe(true);
  });

  it("reduce la puntuación y explica diferencias relevantes", () => {
    const resultado = calcularCompatibilidad(pantalla, { ...pantalla, anchoDisplayMm: 78, altoDisplayMm: 170, tipoFormaPantalla: "CURVA", aspectRatio: "16:9" });
    expect(resultado.porcentaje).toBeLessThan(75);
    expect(resultado.estado).toBe("No recomendado");
    expect(resultado.advertencias.some((texto) => texto.includes("forma no coincide"))).toBe(true);
    expect(resultado.formaCoincide).toBe(false);
  });

  it("marca una puntuación intermedia como compatible con observaciones", () => {
    const resultado = calcularCompatibilidad(pantalla, { ...pantalla, anchoDisplayMm: 75, altoDisplayMm: 165 });
    expect(resultado.porcentaje).toBeGreaterThanOrEqual(50);
    expect(resultado.porcentaje).toBeLessThan(75);
    expect(resultado.estado).toBe("Compatible con observaciones");
    expect(resultado.nivel).toBe("Requiere revisión");
  });
});
