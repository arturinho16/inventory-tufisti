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

  it("incorpora todos los campos FTF compartidos y explica sus diferencias", () => {
    const objetivo = { ...pantalla, detalleFtf: { "design:width:0": "74.2 mm", "sensors:sensors:0": "Fingerprint, proximity", "battery:capacity:0": "5000 mAh" } };
    const candidato = { ...pantalla, detalleFtf: { "design:width:0": "74.2 mm", "sensors:sensors:0": "Fingerprint, proximity", "battery:capacity:0": "4500 mAh" } };
    const resultado = calcularCompatibilidad(objetivo, candidato);
    expect(resultado.coincidencias.some((texto) => texto.includes("2 de 3 campos"))).toBe(true);
    expect(resultado.advertencias.some((texto) => texto.includes("1 campos con diferencias"))).toBe(true);
  });

  it("omite el área ausente sin convertirla en cero e informa cobertura reducida", () => {
    const resultado = calcularCompatibilidad({ ...pantalla, areaDisplayPorcentaje: null }, pantalla);
    expect(Number.isFinite(resultado.porcentaje)).toBe(true);
    expect(resultado.porcentaje).toBe(100);
    expect(resultado.cobertura).toBeLessThan(100);
    expect(resultado.advertencias.some((texto) => texto.includes("Área del display no comparada"))).toBe(true);
  });
});
