import { describe, expect, it } from "vitest";
import { etiquetasCatalogo } from "../../src/lib/catalogos/datos-catalogos";

describe("catálogos", () => {
  it("mantiene todas las etiquetas visibles en español", () => {
    expect(etiquetasCatalogo).toEqual({ linea: "Línea", marca: "Marca", tipoProducto: "Tipo de producto" });
  });
});
