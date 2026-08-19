import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { ProductoExcelFtf } from "@/actions/importacion-ftf";
import { copiarImagenExterna } from "@/lib/imagenes/almacen-local";
import { prisma } from "@/lib/prisma";
import { buscarFichaFtf, extraerDeviceSpecificationsGuardado } from "./buscar";
import { extraerFichaFtf } from "./extraer-url";
import { validarIdentidadFtf } from "./validar";

const normalizar = (valor: unknown) => String(valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
const marketplace = (valor: string) => ({ mercadolibre: "MERCADO_LIBRE", ml: "MERCADO_LIBRE", amazon: "AMAZON", walmart: "WALMART", tiendanube: "TIENDANUBE", claroshop: "CLAROSHOP" } as const)[normalizar(valor)];
const extraerUrlPreferida = (url: string) => /devicespecifications\.com\/en\/model\//i.test(url) ? extraerDeviceSpecificationsGuardado(url) : extraerFichaFtf(url);

async function intento(registroId: string, datos: { accion: string; estado: "BUSCANDO" | "IMPORTANDO" | "COMPLETADA" | "REVISION" | "ERROR" | "NO_ENCONTRADA"; mensaje: string; proveedor?: string; url?: string; marca?: string; modelo?: string; diagonal?: number | null; metadatos?: Prisma.InputJsonValue }) {
  await prisma.importacionFtfIntento.create({ data: { registroId, accion: datos.accion, estado: datos.estado, mensaje: datos.mensaje, proveedor: datos.proveedor, url: datos.url, marcaEncontrada: datos.marca, modeloEncontrado: datos.modelo, diagonalEncontrada: datos.diagonal, metadatos: datos.metadatos } });
}

function diagnosticoIdentidad(validacion: ReturnType<typeof validarIdentidadFtf>, diagonalFuente: number | null) {
  return [
    `marca ${validacion.marcaCoincide ? "correcta" : "diferente"}`,
    `modelo ${validacion.modeloCoincide ? "correcto" : `${validacion.puntuacionModelo.toFixed(1)}%`}`,
    `variante ${validacion.variantesCoinciden ? "correcta" : `diferente (esperada: ${validacion.tokensEsperados.join(", ") || "base"}; encontrada: ${validacion.tokensFuente.join(", ") || "base"})`}`,
    `diagonal ${validacion.diagonalCoincide ? `${diagonalFuente} in, correcta` : `${diagonalFuente ?? "no encontrada"} in, diferente`}`,
  ].join(", ");
}

async function actualizarLote(loteId: string) {
  const [pendientes, fallidos] = await Promise.all([
    prisma.importacionFtfRegistro.count({ where: { loteId, estado: { in: ["BUSCANDO", "IMPORTANDO", "VALIDADA"] } } }),
    prisma.importacionFtfRegistro.count({ where: { loteId, estado: { in: ["ERROR", "NO_ENCONTRADA", "REVISION"] } } }),
  ]);
  await prisma.importacionFtfLote.update({ where: { id: loteId }, data: { estado: pendientes ? "BUSCANDO" : fallidos ? "REVISION" : "COMPLETADA" } });
}

export async function procesarSiguienteImportacionFtf() {
  const ahora = new Date();
  const abandonado = new Date(ahora.getTime() - 30 * 60_000);
  await prisma.importacionFtfRegistro.updateMany({ where: { estado: { in: ["BUSCANDO", "IMPORTANDO"] }, bloqueadoEn: { lt: abandonado } }, data: { estado: "BUSCANDO", bloqueadoEn: null, mensaje: "Trabajo recuperado después de una interrupción." } });
  const candidato = await prisma.importacionFtfRegistro.findFirst({ where: { estado: "BUSCANDO", disponibleEn: { lte: ahora }, bloqueadoEn: null }, orderBy: [{ disponibleEn: "asc" }, { creadoEn: "asc" }] });
  if (!candidato) return null;
  const tomado = await prisma.importacionFtfRegistro.updateMany({ where: { id: candidato.id, estado: "BUSCANDO", bloqueadoEn: null }, data: { bloqueadoEn: ahora, mensaje: "Buscando una ficha técnica segura…", intentos: { increment: 1 } } });
  if (!tomado.count) return null;
  const fila = candidato.datosProducto as unknown as ProductoExcelFtf;
  const accionInicial = fila.urlFtf ? "URL_PREFERIDA_EXCEL" : "BUSQUEDA_AUTOMATICA";
  await intento(candidato.id, { accion: accionInicial, estado: "BUSCANDO", url: fila.urlFtf || undefined, mensaje: fila.urlFtf ? "Inició la descarga desde la URL preferida del Excel." : "Inició la búsqueda automática." });
  try {
    if (await prisma.producto.findUnique({ where: { clave: fila.clave }, select: { id: true } })) throw new Error("La Clave fue creada después de validar; no se sobrescribió.");
    const [linea, marca, tipo, ubicacion] = await Promise.all([
      prisma.linea.findFirst({ where: { nombre: { equals: fila.linea, mode: "insensitive" } } }),
      prisma.marca.findFirst({ where: { nombre: { equals: fila.marca, mode: "insensitive" } } }),
      prisma.tipoProducto.findFirst({ where: { nombre: { equals: fila.tipoProducto, mode: "insensitive" } } }),
      prisma.ubicacion.findFirst({ where: { almacen: { equals: fila.almacen, mode: "insensitive" }, cuentaAsociada: { equals: fila.cuenta, mode: "insensitive" } } }),
    ]);
    const mp = marketplace(fila.marketplace);
    if (!linea || !marca || !tipo || !ubicacion || !mp || ubicacion.marketplace !== mp) throw new Error("Los catálogos o la ubicación del registro ya no son válidos.");
    const encontrada = fila.urlFtf ? await (async () => {
      const ficha = await extraerUrlPreferida(fila.urlFtf);
      const validacion = validarIdentidadFtf({ marca: fila.marca, modelo: fila.modelo, diagonal: fila.diagonal }, ficha);
      if (!validacion.valida || validacion.diferencia === null) {
        const mensaje = `FTF descargada desde el enlace del Excel; requiere revisión de identidad: ${diagnosticoIdentidad(validacion, ficha.diagonal)}. La fuente contiene ${ficha.marca} ${ficha.modelo}.`;
        await prisma.$transaction([
          prisma.fichaFtfPendiente.upsert({
            where: { sourceId: `importacion-ftf:${candidato.id}` },
            create: { sourceId: `importacion-ftf:${candidato.id}`, claveOrigen: fila.clave, marcaFuente: ficha.marca, modeloFuente: ficha.modelo, diagonalFuente: ficha.diagonal, urlFuente: fila.urlFtf, proveedor: ficha.proveedor, secciones: ficha.secciones as unknown as Prisma.InputJsonValue, cantidadSecciones: ficha.secciones.length, diagnostico: validacion as unknown as Prisma.InputJsonValue },
            update: { claveOrigen: fila.clave, marcaFuente: ficha.marca, modeloFuente: ficha.modelo, diagonalFuente: ficha.diagonal, urlFuente: fila.urlFtf, proveedor: ficha.proveedor, secciones: ficha.secciones as unknown as Prisma.InputJsonValue, cantidadSecciones: ficha.secciones.length, estado: "PENDIENTE", diagnostico: validacion as unknown as Prisma.InputJsonValue },
          }),
          prisma.importacionFtfRegistro.update({ where: { id: candidato.id }, data: { estado: "REVISION", mensaje, urlFuente: fila.urlFtf, marcaEncontrada: ficha.marca, modeloEncontrado: ficha.modelo, diagonalEncontrada: ficha.diagonal, bloqueadoEn: null, procesadoEn: new Date() } }),
          prisma.importacionFtfIntento.create({ data: { registroId: candidato.id, accion: "URL_PREFERIDA_EXCEL", estado: "REVISION", url: fila.urlFtf, proveedor: ficha.proveedor, mensaje, marcaEncontrada: ficha.marca, modeloEncontrado: ficha.modelo, diagonalEncontrada: ficha.diagonal, metadatos: validacion as unknown as Prisma.InputJsonValue } }),
        ]);
        await actualizarLote(candidato.loteId);
        return null;
      }
      return { url: fila.urlFtf, ficha, diferenciaDiagonal: validacion.diferencia, puntuacionModelo: validacion.puntuacionModelo };
    })() : await buscarFichaFtf(fila.marca, fila.modelo, fila.diagonal);
    if (!encontrada) return { id: candidato.id, clave: candidato.clave, estado: "REVISION" as const, mensaje: "FTF descargada; identidad pendiente de revisión." };
    await prisma.importacionFtfRegistro.update({ where: { id: candidato.id }, data: { estado: "IMPORTANDO", mensaje: "Coincidencia validada; creando producto y FTF…", urlFuente: encontrada.url, marcaEncontrada: encontrada.ficha.marca, modeloEncontrado: encontrada.ficha.modelo, diagonalEncontrada: encontrada.ficha.diagonal } });
    await intento(candidato.id, { accion: "COINCIDENCIA_VALIDADA", estado: "IMPORTANDO", mensaje: `Coincidencia validada con ${encontrada.ficha.proveedor}.`, proveedor: encontrada.ficha.proveedor, url: encontrada.url, marca: encontrada.ficha.marca, modelo: encontrada.ficha.modelo, diagonal: encontrada.ficha.diagonal, metadatos: { puntuacionModelo: encontrada.puntuacionModelo, diferenciaDiagonal: encontrada.diferenciaDiagonal } });
    const imagen = await copiarImagenExterna(fila.imagenUrl, fila.clave, fila.modelo);
    await prisma.$transaction(async (tx) => {
      const producto = await tx.producto.create({ data: { clave: fila.clave, descripcion: fila.descripcion, existencia: fila.existencia, modelo: fila.modelo, color: fila.color, lineaId: linea.id, marcaId: marca.id, tipoProductoId: tipo.id, ...imagen, ubicaciones: { connect: { id: ubicacion.id } } } });
      await tx.fichaTecnicaFull.create({ data: { productoId: producto.id, urlFuente: encontrada.url, proveedor: encontrada.ficha.proveedor, marcaFuente: encontrada.ficha.marca, modeloFuente: encontrada.ficha.modelo, diagonalFuente: encontrada.ficha.diagonal, diferenciaDiagonal: encontrada.diferenciaDiagonal, validacion: "VALIDADA", secciones: encontrada.ficha.secciones as unknown as Prisma.InputJsonValue, cantidadSecciones: encontrada.ficha.secciones.length } });
    });
    const mensaje = `Producto y FTF creados desde ${encontrada.ficha.proveedor} (${encontrada.ficha.secciones.length} secciones).`;
    await prisma.importacionFtfRegistro.update({ where: { id: candidato.id }, data: { estado: "COMPLETADA", mensaje, bloqueadoEn: null, procesadoEn: new Date() } });
    await intento(candidato.id, { accion: "IMPORTACION", estado: "COMPLETADA", mensaje, proveedor: encontrada.ficha.proveedor, url: encontrada.url, marca: encontrada.ficha.marca, modelo: encontrada.ficha.modelo, diagonal: encontrada.ficha.diagonal });
    await actualizarLote(candidato.loteId);
    return { id: candidato.id, clave: candidato.clave, estado: "COMPLETADA" as const, mensaje };
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "No fue posible importar el producto.";
    const noEncontrada = /no se encontr|ning[uú]n.*coincid|búsqueda automática|ningún candidato|bloque|captcha|verificación humana/i.test(mensaje);
    const estado = noEncontrada ? "NO_ENCONTRADA" as const : "ERROR" as const;
    await prisma.importacionFtfRegistro.update({ where: { id: candidato.id }, data: { estado, mensaje, bloqueadoEn: null, procesadoEn: new Date() } });
    await intento(candidato.id, { accion: "IMPORTACION", estado, mensaje });
    await actualizarLote(candidato.loteId);
    return { id: candidato.id, clave: candidato.clave, estado, mensaje };
  }
}
