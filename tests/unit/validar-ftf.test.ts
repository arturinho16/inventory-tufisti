import { describe, expect, it } from "vitest";
import {
  crearUrlSmartGsm,
  normalizarMarca,
  normalizarModelo,
  puntuacionModeloFtf,
  tokensCriticosModelo,
  validarIdentidadFtf,
} from "../../src/lib/ftf/validar";

const esperado = { marca: "Xiaomi", modelo: "Redmi Note 14 Pro 5G", diagonal: 6.67 };

describe("identidad FTF", () => {
  it("normaliza alias, guiones, marca prefijada y variantes", () => {
    expect(normalizarMarca("Mi")).toBe("xiaomi");
    expect(normalizarMarca("iPhone")).toBe("apple");
    expect(normalizarModelo("Xiaomi Redmi Note 14-Pro 5G", "Xiaomi")).toBe("redmi note 14 pro 5g");
    expect([...tokensCriticosModelo("Redmi Note 14 Pro 5G")].sort()).toEqual(["5g", "pro"]);
  });

  it("construye una URL alternativa determinista sin perder la variante", () => {
    expect(crearUrlSmartGsm("Xiaomi", "Xiaomi Redmi Note 14 Pro 5G")).toBe("https://www.smart-gsm.com/moviles/xiaomi-redmi-note-14-pro-5g");
  });

  it("aprueba solamente marca, modelo, variantes y diagonal seguras", () => {
    const resultado = validarIdentidadFtf(esperado, { marca: "Mi", modelo: "Xiaomi Redmi Note 14 Pro 5G", diagonal: 6.67 });
    expect(resultado).toMatchObject({ marcaCoincide: true, modeloCoincide: true, variantesCoinciden: true, diagonalCoincide: true, valida: true });
    expect(resultado.puntuacionModelo).toBe(100);
  });

  it("rechaza una variante Pro cuando se esperaba el modelo base", () => {
    const resultado = validarIdentidadFtf(
      { marca: "Vivo", modelo: "V50", diagonal: 6.77 },
      { marca: "Vivo", modelo: "V50 Pro", diagonal: 6.77 },
    );
    expect(resultado.variantesCoinciden).toBe(false);
    expect(resultado.valida).toBe(false);
  });

  it("rechaza variantes de red diferentes aunque el nombre sea parecido", () => {
    const resultado = validarIdentidadFtf(esperado, { marca: "Xiaomi", modelo: "Redmi Note 14 Pro 4G", diagonal: 6.67 });
    expect(resultado.tokensEsperados).toEqual(["5g", "pro"]);
    expect(resultado.tokensFuente).toEqual(["4g", "pro"]);
    expect(resultado.valida).toBe(false);
  });

  it("aplica puntuación mínima de 95 y no coincidencias por inclusión", () => {
    expect(puntuacionModeloFtf("v50", "v50 pro")).toBeLessThan(95);
    const resultado = validarIdentidadFtf(
      { marca: "Honor", modelo: "Magic7", diagonal: 6.78 },
      { marca: "Honor", modelo: "Magic7 RSR Porsche Design", diagonal: 6.78 },
    );
    expect(resultado.modeloCoincide).toBe(false);
    expect(resultado.valida).toBe(false);
  });

  it("acepta el límite de 0.08 pulgadas y rechaza una diferencia mayor", () => {
    expect(validarIdentidadFtf(esperado, { marca: "Xiaomi", modelo: esperado.modelo, diagonal: 6.75 }).diagonalCoincide).toBe(true);
    expect(validarIdentidadFtf(esperado, { marca: "Xiaomi", modelo: esperado.modelo, diagonal: 6.751 }).diagonalCoincide).toBe(false);
  });

  it("rechaza identidad sin diagonal extraída", () => {
    const resultado = validarIdentidadFtf(esperado, { marca: "Xiaomi", modelo: esperado.modelo, diagonal: null });
    expect(resultado.diferencia).toBeNull();
    expect(resultado.valida).toBe(false);
  });
});
