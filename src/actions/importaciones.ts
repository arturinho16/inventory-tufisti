"use server";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { z } from "zod";
import { TipoFormaPantalla } from "@/generated/prisma/client";
import { copiarImagenExterna, detectarFormatoImagen } from "@/lib/imagenes/almacen-local";
import { interpretarUbicacionesImportacion, type UbicacionImportacion } from "@/lib/importaciones/ubicaciones";
import { analizarFichaTecnica, esquemaFichaTecnicaExtraida, normalizarFormaYCristalFrontal } from "@/lib/openai/analizar-ficha-tecnica";
import { prisma } from "@/lib/prisma";

const RAIZ = path.join(process.cwd(), ".datos", "importaciones");
const MAXIMO = 25 * 1024 * 1024;
const columnas = ["clave", "descripcion", "linea", "existencia", "modelo", "imagenurl", "marca", "tipoproducto", "color", "rutaimagencompletafc", "almacenubicacion", "cuentaasociada", "marketplace"] as const;
const filaSchema = z.object({ clave: z.string().min(2), descripcion: z.string().min(3), linea: z.string().min(1), existencia: z.coerce.number().int().min(0), modelo: z.string().min(1), imagenurl: z.string().url(), marca: z.string().min(1), tipoproducto: z.string().min(1), color: z.string(), rutaimagencompletafc: z.string().min(1), almacenubicacion: z.string().min(1), cuentaasociada: z.string().min(1), marketplace: z.string().min(1) });
type Fila = Omit<z.infer<typeof filaSchema>, "almacenubicacion" | "cuentaasociada" | "marketplace"> & { ubicaciones: UbicacionImportacion[] };
type FilaGuardada = Fila & { fichaArchivo: string; fichaMimeType: "image/png" | "image/jpeg" | "image/webp" };
type ErrorFila = { fila: number; clave: string; modelo: string; tipo: "Error" | "Advertencia"; problema: string };

const rutaLote = (id: string) => {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("El identificador del lote no es válido.");
  return path.join(RAIZ, id);
};
async function limpiarLotesAntiguos() {
  try {
    const ahora = Date.now();
    for (const nombre of await readdir(RAIZ)) if (/^[a-f0-9-]{36}$/.test(nombre)) {
      const ruta = path.join(RAIZ, nombre), estado = await stat(ruta);
      if (ahora - estado.mtimeMs > 7 * 24 * 60 * 60 * 1000) await rm(ruta, { recursive: true, force: true });
    }
  } catch { /* El directorio puede no existir todavía. */ }
}

export async function validarArchivosLote(formData: FormData) {
  await limpiarLotesAntiguos();
  const excel = formData.get("excel"), zipEntrada = formData.get("imagenes");
  if (!(excel instanceof File) || !(zipEntrada instanceof File)) throw new Error("Selecciona el Excel y el ZIP de imágenes.");
  if (!excel.name.toLowerCase().endsWith(".xlsx")) throw new Error("El archivo de productos debe ser .xlsx.");
  if (!zipEntrada.name.toLowerCase().endsWith(".zip")) throw new Error("Las fichas técnicas deben enviarse en un archivo .zip.");
  if (excel.size + zipEntrada.size > MAXIMO) throw new Error("El conjunto de archivos no debe superar 25 MB.");
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(await excel.arrayBuffer());
  const hoja = libro.worksheets[0];
  if (!hoja) throw new Error("El Excel no contiene hojas.");
  const indices = new Map<string, number>();
  hoja.getRow(1).eachCell((celda, indice) => indices.set(celda.text.trim().toLowerCase(), indice));
  const faltantes = columnas.filter((nombre) => !indices.has(nombre));
  if (faltantes.length) return { valido: false as const, errores: faltantes.map((nombre) => ({ fila: 1, clave: "—", modelo: "—", tipo: "Error" as const, problema: `Falta la columna ${nombre}.` })) };
  const zip = await JSZip.loadAsync(await zipEntrada.arrayBuffer());
  const entradas = new Map(Object.values(zip.files).filter((item) => !item.dir).map((item) => [item.name.replaceAll("\\", "/").replace(/^\.\//, ""), item]));
  const filas: Fila[] = [], errores: ErrorFila[] = [], claves = new Set<string>(), usadas = new Set<string>();
  for (let numero = 2; numero <= hoja.rowCount; numero++) {
    const obtener = (nombre: typeof columnas[number]) => hoja.getRow(numero).getCell(indices.get(nombre)!).text.trim();
    if (!obtener("clave")) continue;
    const resultado = filaSchema.safeParse(Object.fromEntries(columnas.map((nombre) => [nombre, obtener(nombre)])));
    if (!resultado.success) { errores.push({ fila: numero, clave: obtener("clave") || "—", modelo: obtener("modelo") || "—", tipo: "Error", problema: resultado.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }); continue; }
    let ubicaciones: UbicacionImportacion[];
    try { ubicaciones = interpretarUbicacionesImportacion(resultado.data); } catch (causa) {
      errores.push({ fila: numero, clave: resultado.data.clave, modelo: resultado.data.modelo, tipo: "Error", problema: causa instanceof Error ? causa.message : "Las ubicaciones no son válidas." });
      continue;
    }
    const fila: Fila = {
      clave: resultado.data.clave, descripcion: resultado.data.descripcion, linea: resultado.data.linea,
      existencia: resultado.data.existencia, modelo: resultado.data.modelo, imagenurl: resultado.data.imagenurl,
      marca: resultado.data.marca, tipoproducto: resultado.data.tipoproducto, color: resultado.data.color,
      rutaimagencompletafc: resultado.data.rutaimagencompletafc, ubicaciones,
    };
    if (claves.has(fila.clave)) errores.push({ fila: numero, clave: fila.clave, modelo: fila.modelo, tipo: "Error", problema: "La Clave está duplicada en el Excel." });
    claves.add(fila.clave);
    const ruta = fila.rutaimagencompletafc.replaceAll("\\", "/").replace(/^\.\//, "");
    const entrada = entradas.get(ruta);
    if (!entrada) errores.push({ fila: numero, clave: fila.clave, modelo: fila.modelo, tipo: "Error", problema: `No se encontró ${ruta} dentro del ZIP.` }); else usadas.add(ruta);
    filas.push(fila);
  }
  const [lineas, marcas, tipos, existentes, ubicacionesRegistradas] = await Promise.all([
    prisma.linea.findMany({ select: { nombre: true } }), prisma.marca.findMany({ select: { nombre: true } }), prisma.tipoProducto.findMany({ select: { nombre: true } }), prisma.producto.findMany({ where: { clave: { in: filas.map((f) => f.clave) } }, select: { clave: true } }), prisma.ubicacion.findMany({ select: { almacen: true, cuentaAsociada: true, marketplace: true } }),
  ]);
  const existe = (lista: { nombre: string }[], nombre: string) => lista.some((x) => x.nombre.localeCompare(nombre, "es-MX", { sensitivity: "base" }) === 0);
  filas.forEach((fila, indice) => {
    const numero = indice + 2;
    if (!existe(lineas, fila.linea)) errores.push({ fila: numero, clave: fila.clave, modelo: fila.modelo, tipo: "Error", problema: `No existe la línea ${fila.linea}.` });
    if (!existe(marcas, fila.marca)) errores.push({ fila: numero, clave: fila.clave, modelo: fila.modelo, tipo: "Error", problema: `No existe la marca ${fila.marca}.` });
    if (!existe(tipos, fila.tipoproducto)) errores.push({ fila: numero, clave: fila.clave, modelo: fila.modelo, tipo: "Error", problema: `No existe el tipo ${fila.tipoproducto}.` });
    for (const ubicacion of fila.ubicaciones) if (!ubicacionesRegistradas.some((registrada) => registrada.marketplace === ubicacion.marketplace && registrada.almacen.localeCompare(ubicacion.almacen, "es-MX", { sensitivity: "base" }) === 0 && registrada.cuentaAsociada.localeCompare(ubicacion.cuentaAsociada, "es-MX", { sensitivity: "base" }) === 0)) errores.push({ fila: numero, clave: fila.clave, modelo: fila.modelo, tipo: "Error", problema: `No existe la ubicación ${ubicacion.almacen} · ${ubicacion.cuentaAsociada} · ${ubicacion.marketplace}.` });
    if (existentes.some((p) => p.clave === fila.clave)) errores.push({ fila: numero, clave: fila.clave, modelo: fila.modelo, tipo: "Advertencia", problema: "La Clave ya existe y será actualizada." });
  });
  entradas.forEach((_, nombre) => { if (!usadas.has(nombre) && /\.(png|jpe?g|webp)$/i.test(nombre)) errores.push({ fila: 0, clave: "—", modelo: "—", tipo: "Advertencia", problema: `Imagen no utilizada: ${nombre}.` }); });
  if (errores.some((e) => e.tipo === "Error")) return { valido: false as const, errores };
  const loteId = randomUUID(), directorio = rutaLote(loteId);
  await mkdir(path.join(directorio, "fichas"), { recursive: true });
  const filasGuardadas: FilaGuardada[] = [];
  for (const fila of filas) {
    const buffer = await entradas.get(fila.rutaimagencompletafc)!.async("nodebuffer"), formato = detectarFormatoImagen(buffer);
    if (!formato) throw new Error(`La ficha de ${fila.clave} no es una imagen PNG, JPEG o WebP válida.`);
    const fichaArchivo = `${fila.clave}.${formato.extension}`;
    await writeFile(path.join(directorio, "fichas", fichaArchivo), buffer);
    filasGuardadas.push({ ...fila, fichaArchivo, fichaMimeType: formato.mimeType });
  }
  await writeFile(path.join(directorio, "manifest.json"), JSON.stringify({ filas: filasGuardadas }, null, 2));
  return { valido: true as const, loteId, errores, total: filas.length };
}

export async function analizarLote(loteId: string) {
  const directorio = rutaLote(loteId), { filas } = JSON.parse(await readFile(path.join(directorio, "manifest.json"), "utf8")) as { filas: FilaGuardada[] };
  let resultados: { fila: FilaGuardada; datos: Awaited<ReturnType<typeof analizarFichaTecnica>>["datos"]; numero: number }[] = [];
  try { resultados = (JSON.parse(await readFile(path.join(directorio, "resultados.json"), "utf8")) as { resultados: typeof resultados }).resultados; } catch { /* El lote todavía no tiene resultados. */ }
  const completadas = new Set(resultados.map(resultado => resultado.fila.clave));
  const pendientes = filas.filter(fila => !completadas.has(fila.clave)).slice(0, 3);
  for (const fila of pendientes) {
    const imagen = await readFile(path.join(directorio, "fichas", fila.fichaArchivo));
    const { datos } = await analizarFichaTecnica({ imagen, mimeType: fila.fichaMimeType, modeloProducto: fila.modelo });
    resultados.push({ fila, datos, numero: filas.findIndex(item => item.clave === fila.clave) + 1 });
    await writeFile(path.join(directorio, "resultados.json"), JSON.stringify({ resultados }, null, 2));
  }
  const orden = new Map(filas.map((fila, indice) => [fila.clave, indice]));
  resultados.sort((a, b) => orden.get(a.fila.clave)! - orden.get(b.fila.clave)!);
  return { total: filas.length, analizados: resultados.length, completo: resultados.length === filas.length, resultados };
}

export async function confirmarLote(loteId: string, ajustes: { clave: string; datos: unknown }[]) {
  const directorio = rutaLote(loteId), { resultados } = JSON.parse(await readFile(path.join(directorio, "resultados.json"), "utf8")) as { resultados: { fila: Fila; datos: Awaited<ReturnType<typeof analizarFichaTecnica>>["datos"] }[] };
  const ajustesPorClave = new Map<string, z.infer<typeof esquemaFichaTecnicaExtraida>>();
  for (const ajuste of ajustes) {
    const validado = esquemaFichaTecnicaExtraida.safeParse(ajuste.datos);
    if (!validado.success) return { importados: 0, error: `La ficha ${ajuste.clave} contiene valores técnicos no válidos.` };
    ajustesPorClave.set(ajuste.clave, validado.data);
  }
  for (const resultado of resultados) {
    const ajuste = ajustesPorClave.get(resultado.fila.clave);
    if (ajuste) resultado.datos = { ...resultado.datos, ...ajuste };
    resultado.datos = { ...resultado.datos, ...normalizarFormaYCristalFrontal(resultado.datos.cristalFrontal) };
    const obligatorios = ["tecnologia", "diagonalMm", "diagonalPulgadas", "anchoDisplayMm", "altoDisplayMm", "aspectRatio", "resolucionAnchoPx", "resolucionAltoPx", "densidadPpi", "profundidadColor", "areaDisplayPorcentaje"] as const;
    const faltantes = obligatorios.filter((campo) => resultado.datos[campo] === null || resultado.datos[campo] === "");
    if (faltantes.length) return { importados: 0, error: `La ficha ${resultado.fila.clave} todavía tiene campos obligatorios vacíos: ${faltantes.join(", ")}.` };
  }
  const preparados: { fila: Fila; datos: Awaited<ReturnType<typeof analizarFichaTecnica>>["datos"]; imagen: Awaited<ReturnType<typeof copiarImagenExterna>> }[] = [];
  for (const resultado of resultados) preparados.push({ ...resultado, imagen: await copiarImagenExterna(resultado.fila.imagenurl, resultado.fila.clave, resultado.fila.modelo) });
  await prisma.$transaction(async (tx) => {
    for (const { fila, datos, imagen } of preparados) {
      const linea = await tx.linea.findFirstOrThrow({ where: { nombre: { equals: fila.linea, mode: "insensitive" } } }), marca = await tx.marca.findFirstOrThrow({ where: { nombre: { equals: fila.marca, mode: "insensitive" } } }), tipo = await tx.tipoProducto.findFirstOrThrow({ where: { nombre: { equals: fila.tipoproducto, mode: "insensitive" } } });
      if (!fila.ubicaciones?.length) throw new Error(`La ficha ${fila.clave} no contiene ubicaciones.`);
      const ubicacionIds = [];
      for (const ubicacion of fila.ubicaciones) {
        const registrada = await tx.ubicacion.findFirst({ where: { almacen: { equals: ubicacion.almacen, mode: "insensitive" }, cuentaAsociada: { equals: ubicacion.cuentaAsociada, mode: "insensitive" }, marketplace: ubicacion.marketplace }, select: { id: true } });
        if (!registrada) throw new Error(`La ubicación de ${fila.clave} ya no existe: ${ubicacion.almacen} · ${ubicacion.cuentaAsociada} · ${ubicacion.marketplace}.`);
        ubicacionIds.push(registrada.id);
      }
      const relaciones = { set: ubicacionIds.map((id) => ({ id })) };
      const producto = await tx.producto.upsert({ where: { clave: fila.clave }, create: { clave: fila.clave, descripcion: fila.descripcion, existencia: fila.existencia, modelo: fila.modelo, color: fila.color || null, lineaId: linea.id, marcaId: marca.id, tipoProductoId: tipo.id, ubicaciones: { connect: ubicacionIds.map((id) => ({ id })) }, ...imagen }, update: { descripcion: fila.descripcion, existencia: fila.existencia, modelo: fila.modelo, color: fila.color || null, lineaId: linea.id, marcaId: marca.id, tipoProductoId: tipo.id, ubicaciones: relaciones, ...imagen } });
      const ficha = { clave: fila.clave, modelo: fila.modelo, lineaId: linea.id, marcaId: marca.id, tecnologia: datos.tecnologia!, tipoFormaPantalla: datos.tipoFormaPantalla as TipoFormaPantalla, diagonalMm: datos.diagonalMm!, diagonalPulgadas: datos.diagonalPulgadas!, anchoDisplayMm: datos.anchoDisplayMm!, altoDisplayMm: datos.altoDisplayMm!, aspectRatio: datos.aspectRatio!, resolucionAnchoPx: datos.resolucionAnchoPx!, resolucionAltoPx: datos.resolucionAltoPx!, densidadPpi: datos.densidadPpi!, profundidadColor: datos.profundidadColor!, areaDisplayPorcentaje: datos.areaDisplayPorcentaje!, cristalFrontal: datos.cristalFrontal, refrescoHz: datos.refrescoHz };
      await tx.especificacionPantalla.upsert({ where: { productoId: producto.id }, create: { productoId: producto.id, ...ficha }, update: ficha });
    }
  }, { timeout: 60_000 });
  await rm(directorio, { recursive: true, force: true });
  return { importados: resultados.length, error: null };
}
