"use server";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { z } from "zod";
import { detectarFormatoImagen } from "@/lib/imagenes/almacen-local";
import { analizarFichaB, esquemaFichaB, type DatosFichaB } from "@/lib/openai/analizar-ficha-b";
import { prisma } from "@/lib/prisma";

const MAXIMO_BYTES = 100 * 1024 * 1024;
const MAXIMO_IMAGEN_BYTES = 10 * 1024 * 1024;
const TIPOS_IMAGEN_PERMITIDOS = ["image/png", "image/jpeg", "image/webp"] as const;
const RAIZ = path.join(process.cwd(), ".datos", "importaciones-fichas-b");
export type ResultadoValidacionFichaB = { fila: number; clave: string; marca: string; modelo: string; rutaDf: string; rutaSes: string; dfEncontrado: boolean; sesEncontrado: boolean; productoEncontrado: boolean; estado: "Listo" | "Error"; problema: string };
type FilaGuardada = ResultadoValidacionFichaB & { dfArchivo: string; sesArchivo: string; dfMime: string; sesMime: string };
export type ResultadoAnalisisFichaB = { fila: FilaGuardada; datos: DatosFichaB; modeloOpenAI: string };

export async function analizarFichaBDesdeImagenes(formData: FormData) {
  const productoId = z.string().min(1, "Selecciona un producto.").parse(formData.get("productoId"));
  const df = formData.get("df"), ses = formData.get("ses");
  if (!(df instanceof File) || df.size === 0) throw new Error("Selecciona la imagen DF.");
  if (!(ses instanceof File) || ses.size === 0) throw new Error("Selecciona la imagen SES.");
  for (const archivo of [df, ses]) {
    if (archivo.size > MAXIMO_IMAGEN_BYTES) throw new Error("Cada imagen debe pesar como máximo 10 MB.");
    if (!TIPOS_IMAGEN_PERMITIDOS.includes(archivo.type as (typeof TIPOS_IMAGEN_PERMITIDOS)[number])) throw new Error("Usa imágenes PNG, JPEG o WebP.");
  }
  const producto = await prisma.producto.findUnique({ where: { id: productoId }, select: { clave: true, modelo: true } });
  if (!producto) throw new Error("El producto seleccionado ya no existe.");
  return analizarFichaB({
    df: Buffer.from(await df.arrayBuffer()), dfMime: df.type,
    ses: Buffer.from(await ses.arrayBuffer()), sesMime: ses.type,
    clave: producto.clave, modelo: producto.modelo,
  });
}

export async function guardarFichaBDesdeImagenes(productoId: string, entrada: unknown) {
  const { datos, modeloOpenAI } = z.object({ datos: esquemaFichaB, modeloOpenAI: z.string().min(1).optional() }).parse(entrada);
  const producto = await prisma.producto.findUnique({
    where: { id: productoId },
    select: { especificacionPantalla: { select: { anchoDisplayMm: true, altoDisplayMm: true, diagonalMm: true, aspectRatio: true, areaDisplayPorcentaje: true } } },
  });
  if (!producto) throw new Error("El producto seleccionado ya no existe.");
  const a = producto.especificacionPantalla;
  const anchoDisplayMm = a ? Number(a.anchoDisplayMm) : datos.anchoDisplayMm;
  const altoDisplayMm = a ? Number(a.altoDisplayMm) : datos.altoDisplayMm;
  const ficha = {
    ...datos,
    anchoDisplayMm, altoDisplayMm,
    diagonalDisplayMm: a ? Number(a.diagonalMm) : datos.diagonalDisplayMm,
    aspectRatio: a?.aspectRatio ?? datos.aspectRatio,
    areaDisplayPorcentaje: a ? Number(a.areaDisplayPorcentaje) : datos.areaDisplayPorcentaje,
    biselLateralMm: datos.anchoCuerpoMm !== null && anchoDisplayMm !== null ? Math.max(0, (datos.anchoCuerpoMm - anchoDisplayMm) / 2) : null,
    biselVerticalTotalMm: datos.altoCuerpoMm !== null && altoDisplayMm !== null ? Math.max(0, datos.altoCuerpoMm - altoDisplayMm) : null,
    ...(modeloOpenAI ? { fuenteDf: "Carga individual DF", fuenteSes: "Carga individual SES", modeloOpenAI, analizadoEn: new Date() } : {}),
  };
  await prisma.fichaTecnicaB.upsert({ where: { productoId }, create: { productoId, ...ficha }, update: ficha });
  return { guardado: true };
}

const normalizar = (v: string) => v.trim().toLocaleLowerCase("es-MX").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
const limpiarRuta = (v: string) => v.replaceAll("\\", "/").replace(/^\.\//, "").replace(/^\//, "").trim();
const directorioLote = (id: string) => { if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("El lote no es válido."); return path.join(RAIZ, id); };
const sinEntradasZip = (f: ResultadoValidacionFichaB & { df?: unknown; ses?: unknown }): ResultadoValidacionFichaB => ({ fila: f.fila, clave: f.clave, marca: f.marca, modelo: f.modelo, rutaDf: f.rutaDf, rutaSes: f.rutaSes, dfEncontrado: f.dfEncontrado, sesEncontrado: f.sesEncontrado, productoEncontrado: f.productoEncontrado, estado: f.estado, problema: f.problema });

export async function validarLoteFichasB(formData: FormData) {
  const excelEntrada = formData.get("excel"), zipEntrada = formData.get("imagenes");
  if (!(excelEntrada instanceof File) || !(zipEntrada instanceof File)) throw new Error("Selecciona el Excel y el ZIP de imágenes.");
  if (!excelEntrada.name.toLowerCase().endsWith(".xlsx") || !zipEntrada.name.toLowerCase().endsWith(".zip")) throw new Error("Selecciona una plantilla .xlsx y un archivo .zip.");
  if (excelEntrada.size + zipEntrada.size > MAXIMO_BYTES) throw new Error("El Excel y el ZIP no deben superar 100 MB en conjunto.");
  const libro = new ExcelJS.Workbook(); await libro.xlsx.load(await excelEntrada.arrayBuffer());
  const hoja = libro.getWorksheet("Manifest") ?? libro.worksheets[0]; if (!hoja) throw new Error("El Excel no contiene una hoja Manifest.");
  const encabezados = new Map<string, number>(); hoja.getRow(1).eachCell((c, i) => encabezados.set(normalizar(c.text), i));
  const columna = (...ns: string[]) => ns.map(normalizar).map(n => encabezados.get(n)).find(Boolean);
  const cols = { clave: columna("Clave"), marca: columna("Marca"), modelo: columna("Modelo"), rutaDf: columna("Ruta DF", "RutaDF"), rutaSes: columna("Ruta SES", "RutaSES") };
  const faltantes = Object.entries(cols).filter(([, i]) => !i).map(([n]) => n); if (faltantes.length) throw new Error(`Faltan columnas: ${faltantes.join(", ")}.`);
  const zip = await JSZip.loadAsync(await zipEntrada.arrayBuffer(), { checkCRC32: true });
  const archivos = Object.values(zip.files).filter(e => !e.dir).map(entrada => ({ entrada, ruta: limpiarRuta(entrada.name), rutaNormalizada: limpiarRuta(entrada.name).toLowerCase() }));
  const buscar = (ruta: string) => archivos.find(a => a.rutaNormalizada === limpiarRuta(ruta).toLowerCase());
  const inferir = (clave: string, tipo: "df" | "ses") => archivos.find(({ rutaNormalizada }) => { const p = rutaNormalizada.split("/"), carpeta = p.at(-2) ?? "", nombre = p.at(-1) ?? ""; return (carpeta === clave.toLowerCase() || carpeta.startsWith(`${clave.toLowerCase()}_`) || carpeta.startsWith(`${clave.toLowerCase()}-`)) && new RegExp(`^${tipo}(?:[._-]|$)`, "i").test(nombre) && /\.(png|jpe?g|webp)$/i.test(nombre); });
  const preliminares: Array<ResultadoValidacionFichaB & { df?: typeof archivos[number]; ses?: typeof archivos[number] }> = [];
  for (let numero = 2; numero <= hoja.rowCount; numero++) { const fila = hoja.getRow(numero), texto = (i?: number) => i ? fila.getCell(i).text.trim() : "", clave = texto(cols.clave); if (!clave) continue;
    const rd = limpiarRuta(texto(cols.rutaDf)), rs = limpiarRuta(texto(cols.rutaSes)), df = (rd && buscar(rd)) || inferir(clave, "df"), ses = (rs && buscar(rs)) || inferir(clave, "ses");
    preliminares.push({ fila: numero, clave, marca: texto(cols.marca), modelo: texto(cols.modelo), rutaDf: df?.ruta ?? rd, rutaSes: ses?.ruta ?? rs, dfEncontrado: !!df, sesEncontrado: !!ses, productoEncontrado: false, estado: "Error", problema: "", df: df || undefined, ses: ses || undefined });
  }
  if (!preliminares.length) throw new Error("El Excel no contiene registros con Clave.");
  const productos = await prisma.producto.findMany({ where: { clave: { in: preliminares.map(f => f.clave) } }, select: { clave: true, modelo: true, marca: { select: { nombre: true } } } });
  const resultados = preliminares.map(f => { const producto = productos.find(p => p.clave === f.clave), problemas = [!f.df && "No se encontró DF", !f.ses && "No se encontró SES", !producto && "La Clave no existe en productos"].filter(Boolean).join("; "); return { ...f, productoEncontrado: !!producto, estado: problemas ? "Error" as const : "Listo" as const, problema: problemas, modelo: f.modelo || producto?.modelo || "", marca: f.marca || producto?.marca.nombre || "" }; });
  const listos = resultados.filter(f => f.estado === "Listo"); let loteId = "";
  if (listos.length) { loteId = randomUUID(); const dir = directorioLote(loteId); await mkdir(path.join(dir, "imagenes"), { recursive: true }); const filas: FilaGuardada[] = [];
    for (const f of listos) { const dfBuffer = await f.df!.entrada.async("nodebuffer"), sesBuffer = await f.ses!.entrada.async("nodebuffer"), dfFormato = detectarFormatoImagen(dfBuffer), sesFormato = detectarFormatoImagen(sesBuffer); if (!dfFormato || !sesFormato) throw new Error(`DF o SES de ${f.clave} no es una imagen válida.`); const dfArchivo = `${f.clave}-DF.${dfFormato.extension}`, sesArchivo = `${f.clave}-SES.${sesFormato.extension}`; await writeFile(path.join(dir, "imagenes", dfArchivo), dfBuffer); await writeFile(path.join(dir, "imagenes", sesArchivo), sesBuffer); filas.push({ ...sinEntradasZip(f), dfArchivo, sesArchivo, dfMime: dfFormato.mimeType, sesMime: sesFormato.mimeType }); }
    await writeFile(path.join(dir, "manifest.json"), JSON.stringify({ filas }, null, 2));
  }
  return { resultados: resultados.map(sinEntradasZip), total: resultados.length, listos: listos.length, loteId };
}

export async function analizarLoteFichasB(loteId: string) {
  const dir = directorioLote(loteId), { filas } = JSON.parse(await readFile(path.join(dir, "manifest.json"), "utf8")) as { filas: FilaGuardada[] };
  let resultados: ResultadoAnalisisFichaB[] = []; try { resultados = JSON.parse(await readFile(path.join(dir, "resultados.json"), "utf8")); } catch { /* Inicio del análisis. */ }
  const completadas = new Set(resultados.map(r => r.fila.clave));
  for (const fila of filas.filter(f => !completadas.has(f.clave)).slice(0, 2)) { const respuesta = await analizarFichaB({ df: await readFile(path.join(dir, "imagenes", fila.dfArchivo)), dfMime: fila.dfMime, ses: await readFile(path.join(dir, "imagenes", fila.sesArchivo)), sesMime: fila.sesMime, clave: fila.clave, modelo: fila.modelo }); resultados.push({ fila, ...respuesta }); await writeFile(path.join(dir, "resultados.json"), JSON.stringify(resultados, null, 2)); }
  return { total: filas.length, analizados: resultados.length, completo: resultados.length === filas.length, resultados };
}

const esquemaAjuste = esquemaFichaB.extend({ biselLateralMm: z.number().min(0).nullable(), biselVerticalTotalMm: z.number().min(0).nullable() });
export async function importarLoteFichasB(loteId: string, ajustes: { clave: string; datos: unknown }[]) {
  const dir = directorioLote(loteId), resultados = JSON.parse(await readFile(path.join(dir, "resultados.json"), "utf8")) as ResultadoAnalisisFichaB[];
  if (!resultados.length) throw new Error("El lote todavía no tiene análisis."); const porClave = new Map(ajustes.map(a => [a.clave, esquemaAjuste.parse(a.datos)]));
  await prisma.$transaction(async tx => { for (const r of resultados) {
    const producto = await tx.producto.findUniqueOrThrow({ where: { clave: r.fila.clave }, select: { id: true, especificacionPantalla: { select: { anchoDisplayMm: true, altoDisplayMm: true, diagonalMm: true, aspectRatio: true, areaDisplayPorcentaje: true } } } });
    const revisado = porClave.get(r.fila.clave) ?? r.datos, a = producto.especificacionPantalla;
    const anchoDisplayMm = a ? Number(a.anchoDisplayMm) : revisado.anchoDisplayMm, altoDisplayMm = a ? Number(a.altoDisplayMm) : revisado.altoDisplayMm;
    const biselLateralMm = revisado.anchoCuerpoMm !== null && anchoDisplayMm !== null ? Math.max(0, (revisado.anchoCuerpoMm - anchoDisplayMm) / 2) : null;
    const biselVerticalTotalMm = revisado.altoCuerpoMm !== null && altoDisplayMm !== null ? Math.max(0, revisado.altoCuerpoMm - altoDisplayMm) : null;
    const ficha = { ...revisado, anchoDisplayMm, altoDisplayMm, diagonalDisplayMm: a ? Number(a.diagonalMm) : revisado.diagonalDisplayMm, aspectRatio: a?.aspectRatio ?? revisado.aspectRatio, areaDisplayPorcentaje: a ? Number(a.areaDisplayPorcentaje) : revisado.areaDisplayPorcentaje, biselLateralMm, biselVerticalTotalMm, fuenteDf: r.fila.rutaDf, fuenteSes: r.fila.rutaSes, modeloOpenAI: r.modeloOpenAI, analizadoEn: new Date() };
    await tx.fichaTecnicaB.upsert({ where: { productoId: producto.id }, create: { productoId: producto.id, ...ficha }, update: ficha });
  } }, { timeout: 60_000 });
  await rm(dir, { recursive: true, force: true }); return { importados: resultados.length };
}
