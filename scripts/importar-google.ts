import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { z } from "zod";
import { TipoFormaPantalla } from "../src/generated/prisma/client";
import { analizarFichaTecnica, normalizarFormaYCristalFrontal, normalizarProfundidadColor } from "../src/lib/openai/analizar-ficha-tecnica";
import { copiarImagenExterna } from "../src/lib/imagenes/almacen-local";
import { prisma } from "../src/lib/prisma";

const DIRECTORIO_AUTOMATIZACION = path.resolve("automatizacion");
const RUTA_EXCEL = path.join(DIRECTORIO_AUTOMATIZACION, "google", "templateGoogle.xlsx");
const RUTA_RESULTADOS = path.join(DIRECTORIO_AUTOMATIZACION, "google", "resultados-analisis.json");
const VERSION_ANALISIS = 2;

const esquemaFila = z.object({
  clave: z.string().trim().min(2),
  descripcion: z.string().trim().min(3),
  linea: z.string().trim().min(1),
  existencia: z.coerce.number().int().min(0),
  modelo: z.string().trim().min(1),
  imagenurl: z.string().url(),
  ruta: z.string().trim().min(1),
  marca: z.string().trim().min(1),
  tipoproducto: z.string().trim().min(1),
  color: z.string().trim(),
  rutaimagencompletafc: z.string().trim().min(1),
});
type Fila = z.infer<typeof esquemaFila> & { rutaFicha: string };
type Analisis = Awaited<ReturnType<typeof analizarFichaTecnica>>["datos"];
type Cache = Record<string, { version: number; hashImagen: string; datos: Analisis }>;
type ImagenLocal = Awaited<ReturnType<typeof copiarImagenExterna>>;

const textoCelda = (celda: ExcelJS.Cell) => celda.text.trim();

async function leerFilas(): Promise<Fila[]> {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.readFile(RUTA_EXCEL);
  const hoja = libro.worksheets[0];
  if (!hoja) throw new Error("El Excel no contiene hojas.");
  const encabezados = new Map<string, number>();
  hoja.getRow(1).eachCell((celda, columna) => encabezados.set(textoCelda(celda).toLocaleLowerCase("es-MX"), columna));
  const requeridos = Object.keys(esquemaFila.shape);
  const ausentes = requeridos.filter((nombre) => !encabezados.has(nombre));
  if (ausentes.length) throw new Error(`Faltan columnas en el Excel: ${ausentes.join(", ")}.`);

  const filas: Fila[] = [];
  for (let numero = 2; numero <= hoja.rowCount; numero++) {
    const fila = hoja.getRow(numero);
    if (!textoCelda(fila.getCell(encabezados.get("clave")!))) continue;
    const entrada = Object.fromEntries(requeridos.map((nombre) => [nombre, textoCelda(fila.getCell(encabezados.get(nombre)!))]));
    const datos = esquemaFila.parse(entrada);
    const rutaFicha = path.resolve(DIRECTORIO_AUTOMATIZACION, datos.rutaimagencompletafc);
    if (!rutaFicha.startsWith(`${DIRECTORIO_AUTOMATIZACION}${path.sep}`)) throw new Error(`La fila ${numero} apunta fuera de automatizacion.`);
    await access(rutaFicha);
    filas.push({ ...datos, rutaFicha });
  }
  if (new Set(filas.map(({ clave }) => clave)).size !== filas.length) throw new Error("El Excel contiene Claves duplicadas.");
  return filas;
}

async function leerCache(): Promise<Cache> {
  try { return JSON.parse(await readFile(RUTA_RESULTADOS, "utf8")) as Cache; } catch { return {}; }
}

async function obtenerAnalisis(filas: Fila[]) {
  const cache = await leerCache();
  for (const [indice, fila] of filas.entries()) {
    const imagen = await readFile(fila.rutaFicha);
    const hashImagen = createHash("sha256").update(imagen).digest("hex");
    const guardado = cache[fila.clave];
    if (guardado?.version === VERSION_ANALISIS && guardado.hashImagen === hashImagen) {
      guardado.datos.profundidadColor = normalizarProfundidadColor(guardado.datos.profundidadColor);
      Object.assign(guardado.datos, normalizarFormaYCristalFrontal(guardado.datos.cristalFrontal));
      console.log(`[${indice + 1}/${filas.length}] ${fila.clave} ${fila.modelo}: análisis reutilizado.`);
      continue;
    }
    console.log(`[${indice + 1}/${filas.length}] ${fila.clave} ${fila.modelo}: analizando ficha...`);
    const resultado = await analizarFichaTecnica({ imagen, mimeType: "image/png", modeloProducto: fila.modelo });
    cache[fila.clave] = { version: VERSION_ANALISIS, hashImagen, datos: resultado.datos };
    await writeFile(RUTA_RESULTADOS, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
  }
  return cache;
}

function validarAnalisis(filas: Fila[], cache: Cache) {
  const obligatorios = ["tecnologia", "diagonalMm", "diagonalPulgadas", "anchoDisplayMm", "altoDisplayMm", "aspectRatio", "resolucionAnchoPx", "resolucionAltoPx", "densidadPpi", "profundidadColor", "areaDisplayPorcentaje"] as const;
  const incompletos = filas.flatMap((fila) => {
    const datos = cache[fila.clave]?.datos;
    const faltantes = datos ? obligatorios.filter((campo) => datos[campo] === null || datos[campo] === "") : [...obligatorios];
    return faltantes.length ? [`${fila.clave} (${fila.modelo}): ${faltantes.join(", ")}`] : [];
  });
  if (incompletos.length) throw new Error(`Hay análisis incompletos:\n${incompletos.join("\n")}`);
}

async function main() {
  const soloValidar = process.argv.includes("--validar");
  const filas = await leerFilas();
  console.log(`Excel validado: ${filas.length} productos y ${filas.length} fichas accesibles.`);

  const [linea, marca, tipo, existentes] = await Promise.all([
    prisma.linea.findFirst({ where: { nombre: { equals: filas[0].linea, mode: "insensitive" } } }),
    prisma.marca.findFirst({ where: { nombre: { equals: filas[0].marca, mode: "insensitive" } } }),
    prisma.tipoProducto.findFirst({ where: { nombre: { equals: filas[0].tipoproducto, mode: "insensitive" } } }),
    prisma.producto.findMany({ where: { clave: { in: filas.map(({ clave }) => clave) } }, select: { clave: true, imagenUrl: true } }),
  ]);
  if (!linea || !marca || !tipo) throw new Error("No se encontraron la línea, marca o tipo de producto indicados por el Excel.");
  console.log(`Catálogos: ${linea.nombre} / ${marca.nombre} / ${tipo.nombre}. Existentes por Clave: ${existentes.length}.`);
  if (soloValidar) return;

  const cache = await obtenerAnalisis(filas);
  validarAnalisis(filas, cache);
  const existentesPorClave = new Map(existentes.map((producto) => [producto.clave, producto]));
  const preparados: { fila: Fila; datos: Analisis; imagen: ImagenLocal | undefined }[] = [];
  for (const [indice, fila] of filas.entries()) {
    const existente = existentesPorClave.get(fila.clave);
    console.log(`[${indice + 1}/${filas.length}] ${fila.clave}: preparando imagen del producto...`);
    const imagen = existente?.imagenUrl?.startsWith("/imagenes/productos/") ? undefined : await copiarImagenExterna(fila.imagenurl, fila.clave, fila.modelo);
    preparados.push({ fila, datos: cache[fila.clave].datos, imagen });
  }

  await prisma.$transaction(async (tx) => {
    for (const { fila, datos, imagen } of preparados) {
      const producto = await tx.producto.upsert({
        where: { clave: fila.clave },
        create: { clave: fila.clave, descripcion: fila.descripcion, existencia: fila.existencia, modelo: fila.modelo, color: fila.color || null, lineaId: linea.id, marcaId: marca.id, tipoProductoId: tipo.id, ...imagen },
        update: { descripcion: fila.descripcion, existencia: fila.existencia, modelo: fila.modelo, color: fila.color || null, lineaId: linea.id, marcaId: marca.id, tipoProductoId: tipo.id, ...imagen },
      });
      await tx.especificacionPantalla.upsert({
        where: { productoId: producto.id },
        create: { productoId: producto.id, clave: producto.clave, modelo: producto.modelo, lineaId: linea.id, marcaId: marca.id, tecnologia: datos.tecnologia!, tipoFormaPantalla: datos.tipoFormaPantalla as TipoFormaPantalla, tipoFormaOtro: null, diagonalMm: datos.diagonalMm!, diagonalPulgadas: datos.diagonalPulgadas!, anchoDisplayMm: datos.anchoDisplayMm!, altoDisplayMm: datos.altoDisplayMm!, aspectRatio: datos.aspectRatio!, resolucionAnchoPx: datos.resolucionAnchoPx!, resolucionAltoPx: datos.resolucionAltoPx!, densidadPpi: datos.densidadPpi!, profundidadColor: datos.profundidadColor!, areaDisplayPorcentaje: datos.areaDisplayPorcentaje!, cristalFrontal: datos.cristalFrontal, refrescoHz: datos.refrescoHz },
        update: { clave: producto.clave, modelo: producto.modelo, lineaId: linea.id, marcaId: marca.id, tecnologia: datos.tecnologia!, tipoFormaPantalla: datos.tipoFormaPantalla as TipoFormaPantalla, tipoFormaOtro: null, diagonalMm: datos.diagonalMm!, diagonalPulgadas: datos.diagonalPulgadas!, anchoDisplayMm: datos.anchoDisplayMm!, altoDisplayMm: datos.altoDisplayMm!, aspectRatio: datos.aspectRatio!, resolucionAnchoPx: datos.resolucionAnchoPx!, resolucionAltoPx: datos.resolucionAltoPx!, densidadPpi: datos.densidadPpi!, profundidadColor: datos.profundidadColor!, areaDisplayPorcentaje: datos.areaDisplayPorcentaje!, cristalFrontal: datos.cristalFrontal, refrescoHz: datos.refrescoHz },
      });
    }
  }, { timeout: 60_000 });

  const [productosGuardados, fichasGuardadas] = await Promise.all([
    prisma.producto.count({ where: { clave: { in: filas.map(({ clave }) => clave) } } }),
    prisma.especificacionPantalla.count({ where: { clave: { in: filas.map(({ clave }) => clave) } } }),
  ]);
  console.log(`Importación confirmada: ${productosGuardados} productos y ${fichasGuardadas} registros técnicos.`);
}

main().catch((causa) => {
  console.error(causa instanceof Error ? causa.message : "No fue posible completar la importación.");
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
