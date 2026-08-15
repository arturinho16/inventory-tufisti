"use server";

import { randomUUID } from "node:crypto";
import ExcelJS from "exceljs";
import type { Prisma } from "@/generated/prisma/client";
import { copiarImagenExterna } from "@/lib/imagenes/almacen-local";
import { prisma } from "@/lib/prisma";
import { extraerFichaFtf } from "@/lib/ftf/extraer-url";
import { guardarFichaFtf } from "@/lib/ftf/persistir";
import { validarIdentidadFtf } from "@/lib/ftf/validar";
import { extraerDeviceSpecificationsGuardado } from "@/lib/ftf/buscar";
import { extraerPantallaFtf, faltantesPantallaFtf } from "@/lib/ftf/normalizar-pantalla";
import type { SeccionFtf } from "@/lib/ftf/extraer-url";

export type FilaUrlFtf = { clave: string; marca: string; modelo: string; diagonal: number; url: string };
export type ResultadoImportacionFtf = { clave: string; estado: "BUSCANDO" | "COMPLETADA" | "ERROR"; mensaje: string; url?: string; secciones?: number };
export type FiltrosSeguimientoFtf = { loteId?: string; estado?: string; marca?: string; diagonal?: string };

const diagnosticoIdentidad = (validacion: ReturnType<typeof validarIdentidadFtf>, diagonalFuente: number | null) => [
  `marca ${validacion.marcaCoincide ? "correcta" : "diferente"}`,
  `modelo ${validacion.modeloCoincide ? "correcto" : `con ${validacion.puntuacionModelo.toFixed(1)}% de coincidencia`}`,
  `variante ${validacion.variantesCoinciden ? "correcta" : `diferente (esperada: ${validacion.tokensEsperados.join(", ") || "base"}; encontrada: ${validacion.tokensFuente.join(", ") || "base"})`}`,
  `diagonal ${validacion.diagonalCoincide ? "correcta" : `${diagonalFuente ?? "no encontrada"} in`}`,
].join(", ");

export async function importarFtfPorUrl(fila: FilaUrlFtf): Promise<ResultadoImportacionFtf> {
  const clave = fila.clave.trim(), marca = fila.marca.trim(), modelo = fila.modelo.trim(), url = fila.url.trim();
  if (!clave || !marca || !modelo || !url || !Number.isFinite(fila.diagonal) || fila.diagonal <= 0) return { clave, estado: "ERROR", mensaje: "Clave, marca, modelo, diagonal y URL son obligatorios." };
  try {
    const producto = await prisma.producto.findUnique({ where: { clave }, include: { marca: { select: { nombre: true } } } });
    if (!producto) throw new Error("No existe un producto con esta Clave; usa la importación completa por Excel.");
    if (producto.marca.nombre.localeCompare(marca, "es", { sensitivity: "base" }) !== 0 || producto.modelo.localeCompare(modelo, "es", { sensitivity: "base" }) !== 0) throw new Error(`La Clave pertenece a ${producto.marca.nombre} ${producto.modelo}; corrige marca o modelo.`);
    const ficha = await extraerFichaFtf(url);
    const validacion = validarIdentidadFtf({ marca, modelo, diagonal: fila.diagonal }, ficha);
    if (!validacion.valida) throw new Error(`La fuente no pasó la validación: ${diagnosticoIdentidad(validacion, ficha.diagonal)}.`);
    await guardarFichaFtf(producto.id, url, ficha, validacion.diferencia);
    return { clave, estado: "COMPLETADA", mensaje: `FTF guardada desde ${ficha.proveedor}.`, url, secciones: ficha.secciones.length };
  } catch (error) { return { clave, estado: "ERROR", mensaje: error instanceof Error ? error.message : "No fue posible importar la FTF." }; }
}

export type ProductoExcelFtf = { fila: number; clave: string; descripcion: string; linea: string; existencia: number; color: string; tipoProducto: string; marca: string; modelo: string; imagenUrl: string; diagonal: number; almacen: string; cuenta: string; marketplace: string; urlFtf: string };
type ProductoExcel = ProductoExcelFtf;
type ErrorExcel = { fila: number; clave: string; problema: string };
const normalizar = (valor: unknown) => String(valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
const textoCelda = (valor: ExcelJS.CellValue) => typeof valor === "object" && valor && "text" in valor ? String(valor.text) : String(valor ?? "").trim();
const encabezados: Record<string, keyof Omit<ProductoExcel, "fila">> = {
  clave: "clave", descripcion: "descripcion", linea: "linea", existencia: "existencia", existencias: "existencia", color: "color",
  tipodeproducto: "tipoProducto", tipoproducto: "tipoProducto", marca: "marca", modelo: "modelo", imagenurl: "imagenUrl",
  tamanoenpantalla: "diagonal", diagonal: "diagonal", almacenubicacion: "almacen", cuentaasociada: "cuenta", marketplace: "marketplace",
  urlftf: "urlFtf", urlficha: "urlFtf",
};

export async function validarExcelProductosFtf(formData: FormData) {
  const entrada = formData.get("excel");
  if (!(entrada instanceof File) || !entrada.name.toLowerCase().endsWith(".xlsx")) throw new Error("Selecciona un archivo .xlsx válido.");
  if (entrada.size > 10 * 1024 * 1024) throw new Error("El Excel no debe superar 10 MB.");
  const libro = new ExcelJS.Workbook(); await libro.xlsx.load(await entrada.arrayBuffer());
  const hoja = libro.worksheets[0]; if (!hoja) throw new Error("El Excel no contiene hojas.");
  const columnas = new Map<number, keyof Omit<ProductoExcel, "fila">>();
  hoja.getRow(1).eachCell((celda, columna) => { const campo = encabezados[normalizar(textoCelda(celda.value))]; if (campo) columnas.set(columna, campo); });
  const obligatorios: Array<keyof Omit<ProductoExcel, "fila">> = ["clave", "descripcion", "linea", "existencia", "color", "tipoProducto", "marca", "modelo", "imagenUrl", "diagonal", "almacen", "cuenta", "marketplace"];
  const ausentes = obligatorios.filter((campo) => ![...columnas.values()].includes(campo));
  if (ausentes.length) throw new Error(`Faltan columnas obligatorias: ${ausentes.join(", ")}.`);
  const filas: ProductoExcel[] = [], errores: ErrorExcel[] = [];
  hoja.eachRow((fila, numeroFila) => {
    if (numeroFila === 1) return;
    const datos: Record<string, string> = {}; columnas.forEach((campo, columna) => { datos[campo] = textoCelda(fila.getCell(columna).value); });
    if (!Object.values(datos).some(Boolean)) return;
    const producto = { fila: numeroFila, clave: datos.clave, descripcion: datos.descripcion, linea: datos.linea, existencia: Number(datos.existencia), color: datos.color, tipoProducto: datos.tipoProducto, marca: datos.marca, modelo: datos.modelo, imagenUrl: datos.imagenUrl, diagonal: Number(String(datos.diagonal).replace(",", ".").match(/\d+(?:\.\d+)?/)?.[0]), almacen: datos.almacen, cuenta: datos.cuenta, marketplace: datos.marketplace, urlFtf: datos.urlFtf ?? "" };
    const vacios = obligatorios.filter((campo) => campo !== "existencia" && campo !== "diagonal" && !String(producto[campo]).trim());
    if (vacios.length) errores.push({ fila: numeroFila, clave: producto.clave, problema: `Campos vacíos: ${vacios.join(", ")}.` });
    if (!Number.isInteger(producto.existencia) || producto.existencia < 0) errores.push({ fila: numeroFila, clave: producto.clave, problema: "Existencia debe ser un entero mayor o igual a cero." });
    if (!Number.isFinite(producto.diagonal) || producto.diagonal <= 0) errores.push({ fila: numeroFila, clave: producto.clave, problema: "Tamaño en pantalla debe ser una diagonal válida en pulgadas." });
    try { const u = new URL(producto.imagenUrl); if (!/^https?:$/.test(u.protocol)) throw new Error(); } catch { errores.push({ fila: numeroFila, clave: producto.clave, problema: "imagenurl debe ser una URL HTTP o HTTPS válida." }); }
    if (producto.urlFtf) try { const u = new URL(producto.urlFtf); if (u.protocol !== "https:") throw new Error(); } catch { errores.push({ fila: numeroFila, clave: producto.clave, problema: "URL FTF debe ser una dirección HTTPS válida." }); }
    filas.push(producto);
  });
  const repetidas = filas.filter((fila, indice) => filas.findIndex((otra) => otra.clave === fila.clave) !== indice);
  repetidas.forEach((fila) => errores.push({ fila: fila.fila, clave: fila.clave, problema: "La Clave está repetida en el Excel." }));
  const clavesExcel = filas.map((fila) => fila.clave);
  const [existentes, pendientesPrevios] = filas.length ? await Promise.all([
    prisma.producto.findMany({ where: { clave: { in: clavesExcel } }, select: { clave: true } }),
    prisma.importacionFtfRegistro.findMany({ where: { clave: { in: clavesExcel }, estado: { not: "COMPLETADA" } }, distinct: ["clave"], select: { clave: true, loteId: true, estado: true } }),
  ]) : [[], []];
  existentes.forEach(({ clave }) => errores.push({ fila: filas.find((fila) => fila.clave === clave)?.fila ?? 0, clave, problema: "La Clave ya existe; para ella usa el modo de complemento por URL." }));
  pendientesPrevios.forEach(({ clave, loteId, estado }) => errores.push({ fila: filas.find((fila) => fila.clave === clave)?.fila ?? 0, clave, problema: `La Clave ya tiene un proceso pendiente (${estado}) en el lote ${loteId.slice(0, 8)}. Resuélvelo desde Seguimiento en vez de volver a cargarla.` }));
  const [lineas, marcas, tipos, ubicaciones] = await Promise.all([
    prisma.linea.findMany({ select: { nombre: true } }), prisma.marca.findMany({ select: { nombre: true } }),
    prisma.tipoProducto.findMany({ select: { nombre: true } }), prisma.ubicacion.findMany({ select: { almacen: true, cuentaAsociada: true, marketplace: true } }),
  ]);
  for (const fila of filas) {
    if (!lineas.some((item) => normalizar(item.nombre) === normalizar(fila.linea))) errores.push({ fila: fila.fila, clave: fila.clave, problema: `La Línea “${fila.linea}” no existe en el catálogo.` });
    if (!marcas.some((item) => normalizar(item.nombre) === normalizar(fila.marca))) errores.push({ fila: fila.fila, clave: fila.clave, problema: `La Marca “${fila.marca}” no existe en el catálogo.` });
    if (!tipos.some((item) => normalizar(item.nombre) === normalizar(fila.tipoProducto))) errores.push({ fila: fila.fila, clave: fila.clave, problema: `El Tipo de producto “${fila.tipoProducto}” no existe en el catálogo.` });
    const mp = marketplace(fila.marketplace);
    if (!mp || !ubicaciones.some((item) => normalizar(item.almacen) === normalizar(fila.almacen) && normalizar(item.cuentaAsociada) === normalizar(fila.cuenta) && item.marketplace === mp)) errores.push({ fila: fila.fila, clave: fila.clave, problema: "Almacén, cuenta asociada y marketplace no forman una ubicación registrada." });
  }
  const loteId = randomUUID();
  await prisma.importacionFtfLote.create({ data: {
    id: loteId, nombreArchivo: entrada.name, total: filas.length, estado: errores.length ? "REVISION" : "VALIDADA",
    registros: { create: filas.map((fila) => { const problemas = errores.filter((error) => error.fila === fila.fila).map((error) => error.problema); return { fila: fila.fila, clave: fila.clave, marca: fila.marca, modelo: fila.modelo, diagonalEsperada: fila.diagonal, estado: problemas.length ? "REVISION" : "VALIDADA", mensaje: problemas.join(" ") || "Fila validada y lista para buscar la FTF.", datosProducto: fila as unknown as Prisma.InputJsonValue }; }) },
  } });
  return { loteId, total: filas.length, errores, valido: filas.length > 0 && errores.length === 0, filas: filas.map(({ fila, clave, marca, modelo, diagonal }) => ({ fila, clave, marca, modelo, diagonal })) };
}

const marketplace = (valor: string) => ({ mercadolibre: "MERCADO_LIBRE", ml: "MERCADO_LIBRE", amazon: "AMAZON", walmart: "WALMART", tiendanube: "TIENDANUBE", claroshop: "CLAROSHOP" } as const)[normalizar(valor)];
export async function importarExcelProductosFtf(loteId: string): Promise<ResultadoImportacionFtf[]> {
  if (!/^[0-9a-f-]{36}$/i.test(loteId)) throw new Error("El lote no es válido.");
  const lote = await prisma.importacionFtfLote.findUnique({ where: { id: loteId }, include: { registros: { orderBy: { fila: "asc" } } } });
  if (!lote) throw new Error("El lote ya no existe.");
  if (lote.estado !== "VALIDADA") throw new Error("El lote no está validado o ya fue confirmado.");
  await prisma.$transaction([
    prisma.importacionFtfRegistro.updateMany({ where: { loteId, estado: "VALIDADA" }, data: { estado: "BUSCANDO", mensaje: "En cola para buscar la FTF.", disponibleEn: new Date() } }),
    prisma.importacionFtfLote.update({ where: { id: loteId }, data: { estado: "BUSCANDO" } }),
  ]);
  return lote.registros.map((registro) => ({ clave: registro.clave, estado: "BUSCANDO", mensaje: "En cola; el proceso continuará aunque cierres esta página." }));
}

export async function listarSeguimientoFtf(filtros: FiltrosSeguimientoFtf = {}) {
  const diagonal = filtros.diagonal ? Number(filtros.diagonal) : undefined;
  const registros = await prisma.importacionFtfRegistro.findMany({
    where: { loteId: filtros.loteId || undefined, estado: filtros.estado && filtros.estado !== "TODOS" ? filtros.estado as never : undefined, marca: filtros.marca && filtros.marca !== "TODAS" ? filtros.marca : undefined, diagonalEsperada: Number.isFinite(diagonal) ? diagonal : undefined },
    include: { lote: { select: { nombreArchivo: true, creadoEn: true } }, intentosDetalle: { orderBy: { creadoEn: "desc" }, take: 3, select: { id: true, estado: true, proveedor: true, mensaje: true, creadoEn: true } } }, orderBy: { actualizadoEn: "desc" }, take: 500,
  });
  const [lotes, marcas, estados, diagonales] = await Promise.all([
    prisma.importacionFtfLote.findMany({ orderBy: { creadoEn: "desc" }, take: 30, select: { id: true, nombreArchivo: true, estado: true, total: true, creadoEn: true } }),
    prisma.importacionFtfRegistro.findMany({ distinct: ["marca"], orderBy: { marca: "asc" }, select: { marca: true } }),
    prisma.importacionFtfRegistro.groupBy({ by: ["estado"], _count: true }),
    prisma.importacionFtfRegistro.findMany({ distinct: ["diagonalEsperada"], orderBy: { diagonalEsperada: "asc" }, select: { diagonalEsperada: true } }),
  ]);
  const productos = registros.length ? await prisma.producto.findMany({
    where: { clave: { in: [...new Set(registros.map((registro) => registro.clave))] } },
    select: { clave: true, fichaTecnicaFull: { select: { secciones: true } }, especificacionPantalla: { select: { id: true } } },
  }) : [];
  type EstadoTecnico = "SIN_FTF" | "FTF_INCOMPLETA" | "LISTA_PARALELO" | "EN_PARALELO";
  const tecnicoPorClave = new Map<string, { estadoTecnico: EstadoTecnico; faltantesFtf: string[] }>();
  for (const producto of productos) {
    if (producto.especificacionPantalla) { tecnicoPorClave.set(producto.clave, { estadoTecnico: "EN_PARALELO", faltantesFtf: [] }); continue; }
    if (!producto.fichaTecnicaFull) { tecnicoPorClave.set(producto.clave, { estadoTecnico: "SIN_FTF", faltantesFtf: [] }); continue; }
    const faltantes = faltantesPantallaFtf(extraerPantallaFtf(producto.fichaTecnicaFull.secciones as unknown as SeccionFtf[]));
    tecnicoPorClave.set(producto.clave, { estadoTecnico: faltantes.length ? "FTF_INCOMPLETA" : "LISTA_PARALELO", faltantesFtf: faltantes });
  }
  return { registros: registros.map((r) => ({ id: r.id, loteId: r.loteId, archivo: r.lote.nombreArchivo, fila: r.fila, clave: r.clave, marca: r.marca, modelo: r.modelo, diagonal: Number(r.diagonalEsperada), estado: r.estado, mensaje: r.mensaje, url: r.urlFuente, marcaEncontrada: r.marcaEncontrada, modeloEncontrado: r.modeloEncontrado, diagonalEncontrada: r.diagonalEncontrada === null ? null : Number(r.diagonalEncontrada), intentos: r.intentos, historial: r.intentosDetalle.map((i) => ({ ...i, creadoEn: i.creadoEn.toISOString() })), actualizadoEn: r.actualizadoEn.toISOString(), ...(tecnicoPorClave.get(r.clave) ?? { estadoTecnico: "SIN_FTF" as const, faltantesFtf: [] as string[] }) })), lotes: lotes.map((l) => ({ ...l, creadoEn: l.creadoEn.toISOString() })), marcas: marcas.map((m) => m.marca), estados: estados.map((e) => ({ estado: e.estado, total: e._count })), diagonales: diagonales.map((d) => Number(d.diagonalEsperada)) };
}

export async function actualizarEsperadoRegistroFtf(registroId: string, modelo: string, diagonal: number) {
  if (!modelo.trim() || !Number.isFinite(diagonal) || diagonal <= 0) throw new Error("Modelo y diagonal son obligatorios.");
  const registro = await prisma.importacionFtfRegistro.findUnique({ where: { id: registroId } });
  if (!registro || registro.estado === "COMPLETADA") throw new Error("El registro no puede corregirse.");
  const fila = registro.datosProducto as unknown as ProductoExcel;
  const corregida = { ...fila, modelo: modelo.trim(), diagonal };
  await prisma.$transaction([
    prisma.importacionFtfRegistro.update({ where: { id: registroId }, data: { modelo: corregida.modelo, diagonalEsperada: diagonal, datosProducto: corregida as unknown as Prisma.InputJsonValue, estado: "BUSCANDO", disponibleEn: new Date(), bloqueadoEn: null, mensaje: "Datos corregidos; en cola para repetir la búsqueda automática." } }),
    prisma.importacionFtfIntento.create({ data: { registroId, accion: "CORRECCION_MANUAL", estado: "BUSCANDO", mensaje: `Modelo y diagonal corregidos a ${corregida.modelo}, ${diagonal} in.`, metadatos: { modeloAnterior: fila.modelo, diagonalAnterior: fila.diagonal } } }),
  ]);
  return { correcto: true, mensaje: "Corrección guardada y búsqueda reiniciada." };
}

const esUrlDeviceSpecifications = (url: string) => /^https:\/\/(?:www\.)?devicespecifications\.com\/en\/model\/[a-z0-9]+\/?(?:[?#].*)?$/i.test(url);
const extraerUrlManual = (url: string) => esUrlDeviceSpecifications(url) ? extraerDeviceSpecificationsGuardado(url) : extraerFichaFtf(url);

export async function guardarEnlaceRegistroFtf(registroId: string, urlNueva: string | null) {
  const registro = await prisma.importacionFtfRegistro.findUnique({ where: { id: registroId } });
  if (!registro) throw new Error("El registro ya no existe.");
  const url = urlNueva?.trim() || null;
  if (url) {
    let valida: URL;
    try { valida = new URL(url); } catch { throw new Error("Captura una URL válida."); }
    if (valida.protocol !== "https:" || !["devicespecifications.com", "www.devicespecifications.com", "smart-gsm.com", "www.smart-gsm.com"].includes(valida.hostname)) throw new Error("El enlace debe ser HTTPS de DeviceSpecifications o SmartGSM.");
  }
  const fila = registro.datosProducto as unknown as ProductoExcel;
  const datosProducto = { ...fila, urlFtf: url ?? "" };
  const mensaje = url ? `Enlace preferido guardado: ${url}.` : "Enlace preferido eliminado; la FTF ya obtenida se conserva.";
  await prisma.$transaction([
    prisma.importacionFtfRegistro.update({ where: { id: registroId }, data: { urlFuente: url, datosProducto: datosProducto as unknown as Prisma.InputJsonValue, mensaje } }),
    prisma.importacionFtfIntento.create({ data: { registroId, accion: url ? "ENLACE_EDITADO" : "ENLACE_BORRADO", estado: registro.estado, url, mensaje, metadatos: { urlAnterior: registro.urlFuente } } }),
  ]);
  return { correcto: true, mensaje };
}

export async function revalidarRegistroFtf(registroId: string, urlManual: string, aprobarManualmente = false) {
  const registro = await prisma.importacionFtfRegistro.findUnique({ where: { id: registroId } });
  if (!registro) throw new Error("El registro ya no existe.");
  const fila = registro.datosProducto as unknown as ProductoExcel;
  const url = urlManual.trim(); if (!url) throw new Error("Captura la URL de la FTF.");
  await prisma.importacionFtfRegistro.update({ where: { id: registroId }, data: { estado: "BUSCANDO", urlFuente: url, mensaje: "Validando la URL manual…", intentos: { increment: 1 } } });
  await prisma.importacionFtfIntento.create({ data: { registroId, accion: "URL_MANUAL", estado: "BUSCANDO", url, mensaje: "Inició la validación de una URL manual." } });
  try {
    const ficha = await extraerUrlManual(url); const validacion = validarIdentidadFtf({ marca: fila.marca, modelo: fila.modelo, diagonal: fila.diagonal }, ficha);
    if (!validacion.valida && !aprobarManualmente) {
      const mensaje = `La URL no coincide automáticamente: ${diagnosticoIdentidad(validacion, ficha.diagonal)}. La fuente contiene ${ficha.marca} ${ficha.modelo}.`;
      await prisma.$transaction([prisma.importacionFtfRegistro.update({ where: { id: registroId }, data: { estado: "REVISION", mensaje, urlFuente: url, marcaEncontrada: ficha.marca, modeloEncontrado: ficha.modelo, diagonalEncontrada: ficha.diagonal, procesadoEn: new Date() } }), prisma.importacionFtfIntento.create({ data: { registroId, accion: "URL_MANUAL", estado: "REVISION", url, proveedor: ficha.proveedor, mensaje, marcaEncontrada: ficha.marca, modeloEncontrado: ficha.modelo, diagonalEncontrada: ficha.diagonal, metadatos: validacion as unknown as Prisma.InputJsonValue } })]);
      return { correcto: false, permiteAprobacion: true, mensaje };
    }
    const etiquetaValidacion = aprobarManualmente ? "APROBADA_MANUAL" : "VALIDADA";
    const producto = await prisma.producto.findUnique({ where: { clave: fila.clave } });
    if (producto) await guardarFichaFtf(producto.id, url, ficha, validacion.diferencia, etiquetaValidacion);
    else {
      const [linea, marca, tipo, ubicacion] = await Promise.all([prisma.linea.findFirst({ where: { nombre: { equals: fila.linea, mode: "insensitive" } } }), prisma.marca.findFirst({ where: { nombre: { equals: fila.marca, mode: "insensitive" } } }), prisma.tipoProducto.findFirst({ where: { nombre: { equals: fila.tipoProducto, mode: "insensitive" } } }), prisma.ubicacion.findFirst({ where: { almacen: { equals: fila.almacen, mode: "insensitive" }, cuentaAsociada: { equals: fila.cuenta, mode: "insensitive" } } })]);
      if (!linea || !marca || !tipo || !ubicacion) throw new Error("Los catálogos del registro ya no son válidos.");
      const imagen = await copiarImagenExterna(fila.imagenUrl, fila.clave, fila.modelo);
      await prisma.$transaction(async (tx) => { const creado = await tx.producto.create({ data: { clave: fila.clave, descripcion: fila.descripcion, existencia: fila.existencia, modelo: fila.modelo, color: fila.color, lineaId: linea.id, marcaId: marca.id, tipoProductoId: tipo.id, ...imagen, ubicaciones: { connect: { id: ubicacion.id } } } }); await tx.fichaTecnicaFull.create({ data: { productoId: creado.id, urlFuente: url, proveedor: ficha.proveedor, marcaFuente: ficha.marca, modeloFuente: ficha.modelo, diagonalFuente: ficha.diagonal, diferenciaDiagonal: validacion.diferencia, validacion: etiquetaValidacion, secciones: ficha.secciones as unknown as Prisma.InputJsonValue, cantidadSecciones: ficha.secciones.length } }); });
    }
    await prisma.importacionFtfRegistro.update({ where: { id: registroId }, data: { estado: "COMPLETADA", mensaje: `URL manual validada; producto y FTF guardados (${ficha.secciones.length} secciones).`, marcaEncontrada: ficha.marca, modeloEncontrado: ficha.modelo, diagonalEncontrada: ficha.diagonal, procesadoEn: new Date() } });
    await prisma.importacionFtfIntento.create({ data: { registroId, accion: aprobarManualmente ? "APROBACION_MANUAL" : "URL_MANUAL", estado: "COMPLETADA", url, proveedor: ficha.proveedor, mensaje: `${aprobarManualmente ? "Aprobación bajo responsabilidad del operador" : "URL manual validada"}; FTF guardada (${ficha.secciones.length} secciones).`, marcaEncontrada: ficha.marca, modeloEncontrado: ficha.modelo, diagonalEncontrada: ficha.diagonal, metadatos: aprobarManualmente ? validacion as unknown as Prisma.InputJsonValue : undefined } });
    const pendientes = await prisma.importacionFtfRegistro.count({ where: { loteId: registro.loteId, estado: { in: ["VALIDANDO", "VALIDADA", "BUSCANDO", "IMPORTANDO"] } } });
    const conRevision = await prisma.importacionFtfRegistro.count({ where: { loteId: registro.loteId, estado: { in: ["NO_ENCONTRADA", "REVISION", "ERROR"] } } });
    await prisma.importacionFtfLote.update({ where: { id: registro.loteId }, data: { estado: pendientes ? "BUSCANDO" : conRevision ? "REVISION" : "COMPLETADA" } });
    return { correcto: true, mensaje: "Registro completado." };
  } catch (error) { const mensaje = error instanceof Error ? error.message : "No fue posible validar la URL."; await prisma.$transaction([prisma.importacionFtfRegistro.update({ where: { id: registroId }, data: { estado: "REVISION", mensaje, procesadoEn: new Date() } }), prisma.importacionFtfIntento.create({ data: { registroId, accion: "URL_MANUAL", estado: "ERROR", url, mensaje } })]); return { correcto: false, mensaje }; }
}
