import { describe, expect, it } from "vitest";
import { normalizarNombreLinea, requiereRegistroTecnico } from "../../src/lib/productos/requiere-registro-tecnico";

describe("redirección al registro técnico", () => {
  it("reconoce la línea Cristal templado para celular sin depender de mayúsculas o espacios", () => {
    expect(requiereRegistroTecnico("  CRISTAL   TEMPLADO para CELULAR ")).toBe(true);
  });

  it("no redirige productos de otras líneas", () => {
    expect(requiereRegistroTecnico("Cristal templado para consola gamer")).toBe(false);
    expect(requiereRegistroTecnico("Accesorios para celular")).toBe(false);
  });

  it("normaliza acentos de forma consistente", () => {
    expect(normalizarNombreLinea("Línea de Teléfonos")).toBe("linea de telefonos");
  });
});
