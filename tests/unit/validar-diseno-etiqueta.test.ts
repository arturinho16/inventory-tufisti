import { describe, expect, it } from "vitest";
import { validarDisenoEtiqueta } from "../../src/lib/etiquetas/validar-diseno";
import type { ElementoEtiqueta, ProductoEtiqueta } from "../../src/types/etiqueta";

const producto: ProductoEtiqueta = { id: "1", clave: "23042", descripcion: "Cristal templado transparente para teléfono", modelo: "iPhone 15 Pro Max", codigoUniversal: "7501234567893", linea: "Cristales", marca: "TUFIS" };
const elemento = (cambios: Partial<ElementoEtiqueta> = {}): ElementoEtiqueta => ({ id: "modelo", tipo: "modelo", x: 12, y: 12, ancho: 120, alto: 24, tamanoFuente: 12, ...cambios });
const validar = (elementos: ElementoEtiqueta[]) => validarDisenoEtiqueta({ elementos, anchoMm: 50, altoMm: 25, margenMm: 2, producto });

describe("validación del diseño de etiquetas", () => {
  it("acepta campos separados y dentro del margen", () => {
    const problemas = validar([elemento(), elemento({ id: "clave", tipo: "clave", y: 42, ancho: 90 })]);
    expect(problemas.filter(({ nivel }) => nivel === "error")).toEqual([]);
  });

  it("detecta elementos encimados y señala ambos", () => {
    const problemas = validar([elemento(), elemento({ id: "marca", tipo: "marca", x: 60 })]);
    expect(problemas).toContainEqual(expect.objectContaining({ tipo: "superposicion", nivel: "error", elementos: ["modelo", "marca"] }));
  });

  it("detecta un elemento fuera del margen seguro", () => {
    expect(validar([elemento({ x: 5 })])).toContainEqual(expect.objectContaining({ tipo: "margen", nivel: "error" }));
  });

  it("rechaza códigos demasiado pequeños para imprimirse con claridad", () => {
    const problemas = validar([elemento({ id: "barras", tipo: "barras", ancho: 120, alto: 40 }), elemento({ id: "qr", tipo: "qr", x: 150, ancho: 70, alto: 70 })]);
    expect(problemas.filter(({ tipo }) => tipo === "tamano-codigo")).toHaveLength(2);
  });

  it("advierte cuando el texto se recortará", () => {
    expect(validar([elemento({ id: "descripcion", tipo: "descripcion", ancho: 45, alto: 12 })])).toContainEqual(expect.objectContaining({ tipo: "texto-recortado", nivel: "advertencia" }));
  });
});
