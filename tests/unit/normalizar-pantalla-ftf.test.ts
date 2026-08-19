import { describe, expect, it } from "vitest";
import { extraerPantallaFtf, faltantesPantallaFtf } from "../../src/lib/ftf/normalizar-pantalla";

describe("normalización de Display desde FTF", () => {
  it("extrae todos los campos técnicos de DeviceSpecifications", () => {
    const datos = extraerPantallaFtf([{ clave: "display_the_display", titulo: "Display The display", campos: [
      { etiqueta: "Type/technology One of", valores: ["pOLED"] },
      { etiqueta: "Diagonal size In mobile", valores: ["6.67 in (inches) 169.42 mm (millimeters)"] },
      { etiqueta: "Width Approximate", valores: ["2.74 in 69.5 mm"] },
      { etiqueta: "Height Approximate", valores: ["6.08 in 154.5 mm"] },
      { etiqueta: "Aspect ratio The ratio", valores: ["2.223:1"] },
      { etiqueta: "Resolution The display", valores: ["1220 x 2712 pixels"] },
      { etiqueta: "Pixel density Information", valores: ["446 ppi"] },
      { etiqueta: "Color depth The color", valores: ["30 bit 1073741824 colors"] },
      { etiqueta: "Display area The estimated", valores: ["91.67 %"] },
      { etiqueta: "Other features Information", valores: ["Capacitive Multi-touch"] },
    ] }]);
    expect(datos).toMatchObject({ tecnologia: "pOLED", diagonalPulgadas: 6.67, diagonalMm: 169.42, anchoDisplayMm: 69.5, altoDisplayMm: 154.5, aspectRatio: "2.223:1", resolucionAnchoPx: 1220, resolucionAltoPx: 2712, densidadPpi: 446, profundidadColor: "30 bit 1073741824 colors", areaDisplayPorcentaje: 91.67 });
    expect(faltantesPantallaFtf(datos)).toEqual([]);
  });

  it("calcula medidas desde diagonal y proporción pero conserva área ausente en revisión", () => {
    const datos = extraerPantallaFtf([{ clave: "display", titulo: "Display", campos: [
      { etiqueta: "Tipo", valores: ["pOLED touchscreen, 1B colores"] },
      { etiqueta: "Tamaño", valores: ["6.7 pulgadas, 20:9"] },
      { etiqueta: "Resolución", valores: ["1220 x 2712 pixels"] },
      { etiqueta: "Densidad", valores: ["446 ppi"] },
      { etiqueta: "Protección", valores: ["Gorilla Glass"] },
      { etiqueta: "Extra", valores: ["Refresco 120 Hz"] },
    ] }]);
    expect(datos.diagonalMm).toBe(170.18);
    expect(datos.anchoDisplayMm).toBeCloseTo(69.836, 3);
    expect(datos.altoDisplayMm).toBeCloseTo(155.191, 3);
    expect(datos.profundidadColor).toBe("1B colores");
    expect(datos.refrescoHz).toBe(120);
    expect(faltantesPantallaFtf(datos)).toEqual(["areaDisplayPorcentaje"]);
  });

  it("no confunde cámara frontal ni navegador con la sección Display", () => {
    const datos = extraerPantallaFtf([{ clave: "front_camera_modern", titulo: "Front camera", campos: [{ etiqueta: "Resolution", valores: ["50 MP"] }] }]);
    expect(datos.diagonalPulgadas).toBeNull();
    expect(faltantesPantallaFtf(datos).length).toBeGreaterThan(0);
  });
});
