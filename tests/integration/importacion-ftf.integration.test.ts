import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { procesarSiguienteImportacionFtf } from "../../src/lib/ftf/procesar-cola";
import { transferirFtfAParalelo } from "../../src/actions/transferencia-ftf";
import { eliminarImagenLocal } from "../../src/lib/imagenes/almacen-local";

const sufijo = `${Date.now()}`;
const loteId = `ftf-integracion-${sufijo}`;
const claveCompleta = `FTF-E2E-${sufijo}`;
const claveIncompleta = `FTF-INC-${sufijo}`;
const claveRecuperada = `FTF-REC-${sufijo}`;
const claveRevision = `FTF-REV-${sufijo}`;
let imagenCreada: string | null = null;

const displayCompleto = [{ clave: "display", titulo: "Display", campos: [
  { etiqueta: "Type/technology", valores: ["AMOLED, 1B colors"] },
  { etiqueta: "Diagonal size", valores: ["6.67 in"] },
  { etiqueta: "Aspect ratio", valores: ["20:9"] },
  { etiqueta: "Resolution", valores: ["1080 × 2400 pixels"] },
  { etiqueta: "Pixel density", valores: ["395 ppi"] },
  { etiqueta: "Color depth", valores: ["1B colors"] },
  { etiqueta: "Display area", valores: ["89.8 %"] },
  { etiqueta: "Other features", valores: ["120 Hz"] },
]}];

beforeAll(async () => {
  process.env.FTF_PROVIDER_URL = "http://proveedor-ftf.test";
  await prisma.marca.create({ data: { id: `marca-${sufijo}`, clave: `MI-${sufijo}`, nombre: `Marca E2E ${sufijo}` } });
  await prisma.linea.create({ data: { id: `linea-${sufijo}`, clave: `LI-${sufijo}`, nombre: `Línea E2E ${sufijo}` } });
  await prisma.tipoProducto.create({ data: { id: `tipo-${sufijo}`, clave: `TI-${sufijo}`, nombre: `Tipo E2E ${sufijo}` } });
  await prisma.ubicacion.create({ data: { id: `ubicacion-${sufijo}`, almacen: `Almacén ${sufijo}`, cuentaAsociada: `Cuenta ${sufijo}`, marketplace: "AMAZON" } });
});

afterAll(async () => {
  if (imagenCreada) await eliminarImagenLocal(imagenCreada);
  await prisma.fichaFtfPendiente.deleteMany({ where: { claveOrigen: claveRevision } });
  await prisma.importacionFtfLote.deleteMany({ where: { id: { startsWith: `ftf-` }, registros: { some: { clave: { in: [claveCompleta, claveIncompleta, claveRecuperada, claveRevision] } } } } });
  await prisma.producto.deleteMany({ where: { clave: { in: [claveCompleta, claveIncompleta] } } });
  await prisma.ubicacion.deleteMany({ where: { id: `ubicacion-${sufijo}` } });
  await prisma.tipoProducto.deleteMany({ where: { id: `tipo-${sufijo}` } });
  await prisma.linea.deleteMany({ where: { id: `linea-${sufijo}` } });
  await prisma.marca.deleteMany({ where: { id: `marca-${sufijo}` } });
  await prisma.$disconnect();
  vi.restoreAllMocks();
});

describe("importación FTF con PostgreSQL", () => {
  it("procesa cola, persiste imagen y transfiere una FTF completa", async () => {
    const png = Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0]);
    vi.stubGlobal("fetch", vi.fn(async (entrada: string | URL) => {
      const url = String(entrada);
      if (url.startsWith("http://proveedor-ftf.test")) return new Response(JSON.stringify({ candidatos: [{
        url: "https://www.devicespecifications.com/en/model/e2e",
        ficha: { proveedor: "DeviceSpecifications", marca: `Marca E2E ${sufijo}`, modelo: "Modelo E2E Pro 5G", diagonal: 6.67, secciones: displayCompleto },
      }] }), { status: 200, headers: { "content-type": "application/json" } });
      return new Response(png, { status: 200, headers: { "content-type": "image/png", "content-length": String(png.length) } });
    }));
    await prisma.importacionFtfLote.create({ data: { id: loteId, nombreArchivo: "e2e.xlsx", total: 1, estado: "BUSCANDO", registros: { create: {
      fila: 2, clave: claveCompleta, marca: `Marca E2E ${sufijo}`, modelo: "Modelo E2E Pro 5G", diagonalEsperada: 6.67, estado: "BUSCANDO",
      datosProducto: { clave: claveCompleta, descripcion: "Producto integral", linea: `Línea E2E ${sufijo}`, existencia: 2, color: "Transparente", tipoProducto: `Tipo E2E ${sufijo}`, marca: `Marca E2E ${sufijo}`, modelo: "Modelo E2E Pro 5G", imagenUrl: "https://1.1.1.1/e2e.png", diagonal: 6.67, almacen: `Almacén ${sufijo}`, cuenta: `Cuenta ${sufijo}`, marketplace: "Amazon", urlFtf: "", fila: 2 },
    } } } });
    const resultado = await procesarSiguienteImportacionFtf();
    expect(resultado?.estado).toBe("COMPLETADA");
    const producto = await prisma.producto.findUniqueOrThrow({ where: { clave: claveCompleta }, include: { fichaTecnicaFull: true } });
    imagenCreada = producto.imagenUrl;
    expect(producto.imagenUrl).toContain(claveCompleta.toLowerCase());
    expect(producto.fichaTecnicaFull?.cantidadSecciones).toBe(1);
    await expect(transferirFtfAParalelo(producto.id)).resolves.toMatchObject({ correcto: true });
    expect(await prisma.especificacionPantalla.count({ where: { productoId: producto.id } })).toBe(1);
  });

  it("rechaza una FTF incompleta y recupera un bloqueo abandonado", async () => {
    const producto = await prisma.producto.create({ data: { clave: claveIncompleta, descripcion: "Incompleto", existencia: 0, modelo: "Modelo Incompleto", color: "Transparente", marcaId: `marca-${sufijo}`, lineaId: `linea-${sufijo}`, tipoProductoId: `tipo-${sufijo}`, ubicaciones: { connect: { id: `ubicacion-${sufijo}` } }, fichaTecnicaFull: { create: { urlFuente: "https://smart-gsm.com/e2e", proveedor: "SmartGSM", marcaFuente: `Marca E2E ${sufijo}`, modeloFuente: "Modelo Incompleto", diagonalFuente: 6.5, diferenciaDiagonal: 0, validacion: "VALIDADA", cantidadSecciones: 1, secciones: [{ clave: "display", titulo: "Display", campos: [{ etiqueta: "Diagonal size", valores: ["6.5 in"] }] }] } } } });
    await expect(transferirFtfAParalelo(producto.id)).rejects.toThrow("incompleta");
    const recuperacionId = `${loteId}-rec`;
    await prisma.importacionFtfLote.create({ data: { id: recuperacionId, nombreArchivo: "recuperacion.xlsx", total: 1, estado: "BUSCANDO", registros: { create: { fila: 2, clave: claveRecuperada, marca: "X", modelo: "Y", diagonalEsperada: 6, estado: "IMPORTANDO", bloqueadoEn: new Date(Date.now() - 31 * 60_000), disponibleEn: new Date(Date.now() + 60_000), datosProducto: {} } } } });
    await procesarSiguienteImportacionFtf();
    const recuperado = await prisma.importacionFtfRegistro.findFirstOrThrow({ where: { loteId: recuperacionId } });
    expect(recuperado.estado).toBe("BUSCANDO");
    expect(recuperado.bloqueadoEn).toBeNull();
  });

  it("conserva una FTF descargada cuando la URL del Excel requiere revisión de identidad", async () => {
    vi.stubGlobal("fetch", vi.fn(async (entrada: string | URL) => {
      const url = String(entrada);
      if (url.startsWith("http://proveedor-ftf.test/extraer")) return new Response(JSON.stringify({
        ficha: { proveedor: "DeviceSpecifications", marca: `Marca E2E ${sufijo}`, modelo: "Modelo E2E Pro 5G", diagonal: 6.67, secciones: displayCompleto },
      }), { status: 200, headers: { "content-type": "application/json" } });
      throw new Error(`Solicitud inesperada: ${url}`);
    }));
    const loteRevision = `${loteId}-revision`;
    const urlFtf = "https://www.devicespecifications.com/en/model/revision";
    await prisma.importacionFtfLote.create({ data: { id: loteRevision, nombreArchivo: "revision.xlsx", total: 1, estado: "BUSCANDO", registros: { create: {
      fila: 2, clave: claveRevision, marca: `Marca E2E ${sufijo}`, modelo: "Modelo E2E Pro", diagonalEsperada: 6.67, estado: "BUSCANDO", urlFuente: urlFtf,
      datosProducto: { clave: claveRevision, descripcion: "Producto en revisión", linea: `Línea E2E ${sufijo}`, existencia: 2, color: "Transparente", tipoProducto: `Tipo E2E ${sufijo}`, marca: `Marca E2E ${sufijo}`, modelo: "Modelo E2E Pro", imagenUrl: "https://1.1.1.1/revision.png", diagonal: 6.67, almacen: `Almacén ${sufijo}`, cuenta: `Cuenta ${sufijo}`, marketplace: "Amazon", urlFtf, fila: 2 },
    } } } });
    const resultado = await procesarSiguienteImportacionFtf();
    expect(resultado?.estado).toBe("REVISION");
    const registro = await prisma.importacionFtfRegistro.findFirstOrThrow({ where: { loteId: loteRevision } });
    expect(registro).toMatchObject({ estado: "REVISION", urlFuente: urlFtf, modeloEncontrado: "Modelo E2E Pro 5G" });
    expect(await prisma.producto.findUnique({ where: { clave: claveRevision } })).toBeNull();
    await expect(prisma.fichaFtfPendiente.findUniqueOrThrow({ where: { sourceId: `importacion-ftf:${registro.id}` } })).resolves.toMatchObject({ claveOrigen: claveRevision, diagonalFuente: expect.anything() });
  });
});
