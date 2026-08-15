import { describe, expect, it } from "vitest";
import { crearNombreImagen, detectarFormatoImagen, limpiarSegmentoImagen } from "../../src/lib/imagenes/almacen-local";

describe("almacenamiento local de imágenes", () => {
  it("crea un nombre legible a partir de Clave y modelo", () => {
    expect(crearNombreImagen("CR-23042", "iPhone 15 Pró Max", "webp")).toBe("cr-23042-iphone-15-pro-max.webp");
  });

  it("elimina caracteres inseguros del nombre", () => {
    expect(limpiarSegmentoImagen(" ../../Mi Producto !!! ")).toBe("mi-producto");
  });

  it("detecta los formatos permitidos por su contenido real", () => {
    expect(detectarFormatoImagen(Uint8Array.from([0xff, 0xd8, 0xff]))?.extension).toBe("jpg");
    expect(detectarFormatoImagen(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.extension).toBe("png");
    expect(detectarFormatoImagen(Buffer.from("RIFF0000WEBP"))?.extension).toBe("webp");
    expect(detectarFormatoImagen(Buffer.from("contenido que no es imagen"))).toBeUndefined();
  });
});
