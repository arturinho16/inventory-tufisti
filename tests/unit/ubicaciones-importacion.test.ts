import { describe, expect, it } from "vitest";
import { interpretarUbicacionesImportacion } from "../../src/lib/importaciones/ubicaciones";

describe("ubicaciones de importación", () => {
  it("interpreta una ubicación y normaliza el marketplace", () => {
    expect(interpretarUbicacionesImportacion({ almacenubicacion: "TufisTi", cuentaasociada: "TufisTi", marketplace: "Mercado Libre" })).toEqual([
      { almacen: "TufisTi", cuentaAsociada: "TufisTi", marketplace: "MERCADO_LIBRE" },
    ]);
  });

  it("admite varias ubicaciones alineadas con separadores", () => {
    expect(interpretarUbicacionesImportacion({ almacenubicacion: "TufisTi | TufisTi", cuentaasociada: "TufisTi | TufisTI", marketplace: "ML | Amazon" })).toHaveLength(2);
  });

  it("rechaza cantidades desalineadas", () => {
    expect(() => interpretarUbicacionesImportacion({ almacenubicacion: "Uno | Dos", cuentaasociada: "Cuenta", marketplace: "Amazon | Walmart" })).toThrow(/misma cantidad/);
  });

  it("rechaza marketplaces desconocidos y ubicaciones duplicadas", () => {
    expect(() => interpretarUbicacionesImportacion({ almacenubicacion: "Uno", cuentaasociada: "Cuenta", marketplace: "Otro" })).toThrow(/Marketplace no válido/);
    expect(() => interpretarUbicacionesImportacion({ almacenubicacion: "Uno | uno", cuentaasociada: "Cuenta | CUENTA", marketplace: "Amazon | AMAZON" })).toThrow(/duplicadas/);
  });
});
