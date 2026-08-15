import { describe, expect, it } from "vitest";
import { calcularDigitoVerificador, crearCodigoUniversalInterno, esCodigoUniversalInterno, esGtinValido } from "../../src/lib/codigos-universales";

describe("códigos universales", () => {
  it("calcula el dígito verificador de un GTIN-13 conocido", () => {
    expect(calcularDigitoVerificador("750103131130")).toBe("9");
    expect(esGtinValido("7501031311309")).toBe(true);
  });

  it("genera el mismo código interno para la misma clave, línea y marca", () => {
    const primero = crearCodigoUniversalInterno("CR-S23", "Cristales", "Samsung");
    const segundo = crearCodigoUniversalInterno("CR-S23", "Cristales", "Samsung");
    expect(primero).toBe(segundo);
    expect(esCodigoUniversalInterno(primero)).toBe(true);
  });

  it("cambia cuando cambia uno de sus componentes", () => {
    expect(crearCodigoUniversalInterno("A1", "L1", "M1")).not.toBe(crearCodigoUniversalInterno("A1", "L2", "M1"));
  });
});
