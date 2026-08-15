import { describe, expect, it } from "vitest";
import { crearComandosTermicos, lenguajeSugerido } from "../../src/lib/etiquetas/adaptadores-termicos";

const trabajo = { anchoMm: 50, altoMm: 25, cantidad: 2, dpi: 203, producto: { id: "1", clave: "ABC-1", descripcion: "Producto", modelo: "Modelo", codigoUniversal: null, linea: "Accesorios", marca: "TUFIS" }, elementos: [{ id: "1", tipo: "clave" as const, x: 12, y: 12, ancho: 120, alto: 24, tamanoFuente: 12 }, { id: "2", tipo: "barras" as const, x: 12, y: 42, ancho: 180, alto: 60, tamanoFuente: 10 }] };

describe("adaptadores de impresora térmica", () => {
  it("genera ZPL respetando las dos líneas que caben en la caja", () => { const resultado = crearComandosTermicos("ZPL", trabajo); expect(resultado).toContain("^XA"); expect(resultado).toContain("^FB160,2"); expect(resultado).toContain("^PQ2"); });
  it("genera EPL con cantidad", () => { const resultado = crearComandosTermicos("EPL", trabajo); expect(resultado).toContain("q400"); expect(resultado).toContain("P2"); });
  it("genera TSPL con tamaño y cantidad", () => { const resultado = crearComandosTermicos("TSPL", trabajo); expect(resultado).toContain("SIZE 50 mm,25 mm"); expect(resultado).toContain("PRINT 1,2"); });
  it("respeta el perfil ZPL declarado por la LP 2824 Plus", () => { expect(lenguajeSugerido("ZDesigner LP 2824 Plus (ZPL)")).toBe("ZPL"); });
});
