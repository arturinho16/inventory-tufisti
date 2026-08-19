import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { z } from "zod";
import { CategoriaProducto, TipoFormaPantalla, type EspecificacionPantalla, type FormaPantallaPersonalizada, type Linea, type Marca, type Producto, type TipoProducto } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const VERSION = 1;
const MAXIMO_RESPALDO = 250 * 1024 * 1024;
const MAXIMO_EXTRAIDO = 500 * 1024 * 1024;
const RAIZ_IMAGENES = path.join(process.cwd(), "public", "imagenes", "productos");
const RAIZ_RESPALDOS = path.join(process.cwd(), ".datos", "backups");
const ARCHIVOS_DATOS = ["lineas", "marcas", "tipos-producto", "formas-pantalla", "productos", "especificaciones-pantalla"] as const;

type Recurso = typeof ARCHIVOS_DATOS[number] | "imagenes";
export type FiltrosRespaldo = { marcas?: string[]; lineas?: string[]; fichas?: "todos" | "con" | "sin"; incluirImagenes?: boolean };
export type OpcionesRestauracion = {
  recursos: Recurso[];
  marcas?: string[];
  lineas?: string[];
  fichas?: "todos" | "con" | "sin";
  modo: "fusionar" | "reemplazar-todo";
  conflicto: "conservar" | "actualizar";
  existencia: "conservar" | "restaurar";
  imagenes: "conservar" | "restaurar" | "solo-faltantes";
  confirmacion?: string;
};

const manifiestoSchema = z.object({
  formato: z.literal("tufis-inventario"),
  version: z.literal(VERSION),
  creadoEn: z.string().datetime(),
  completo: z.boolean(),
  cantidades: z.record(z.string(), z.number().int().nonnegative()),
  archivos: z.array(z.object({ ruta: z.string().min(1), sha256: z.string().regex(/^[a-f0-9]{64}$/), bytes: z.number().int().nonnegative() })),
});

const sha256 = (contenido: Uint8Array) => createHash("sha256").update(contenido).digest("hex");
const json = (valor: unknown) => Buffer.from(JSON.stringify(valor, null, 2));
const nombreSeguro = (valor: string) => path.basename(valor).replace(/[^a-zA-Z0-9._-]/g, "_");

export function validarClaveRespaldos(recibida: string | null) {
  const esperada = process.env.RESPALDOS_ADMIN_KEY?.trim();
  if (!esperada) throw new Error("Configura RESPALDOS_ADMIN_KEY para utilizar respaldos desde la interfaz.");
  const a = Buffer.from(recibida || ""), b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("La clave administrativa no es válida.");
}

async function recopilar(filtros: FiltrosRespaldo = {}) {
  const sinFiltros = !filtros.marcas?.length && !filtros.lineas?.length && (!filtros.fichas || filtros.fichas === "todos");
  const where = {
    ...(filtros.marcas?.length ? { marca: { clave: { in: filtros.marcas } } } : {}),
    ...(filtros.lineas?.length ? { linea: { clave: { in: filtros.lineas } } } : {}),
    ...(filtros.fichas === "con" ? { especificacionPantalla: { isNot: null } } : {}),
    ...(filtros.fichas === "sin" ? { especificacionPantalla: { is: null } } : {}),
  };
  const productos = await prisma.producto.findMany({ where, orderBy: { clave: "asc" } });
  const productoIds = productos.map(({ id }) => id);
  const [especificaciones, lineas, marcas, tipos, formas] = await Promise.all([
    prisma.especificacionPantalla.findMany({ where: { productoId: { in: productoIds } }, orderBy: { clave: "asc" } }),
    prisma.linea.findMany({ where: sinFiltros ? {} : { productos: { some: { id: { in: productoIds } } } }, orderBy: { clave: "asc" } }),
    prisma.marca.findMany({ where: sinFiltros ? {} : { productos: { some: { id: { in: productoIds } } } }, orderBy: { clave: "asc" } }),
    prisma.tipoProducto.findMany({ where: sinFiltros ? {} : { productos: { some: { id: { in: productoIds } } } }, orderBy: { clave: "asc" } }),
    prisma.formaPantallaPersonalizada.findMany({ orderBy: { nombre: "asc" } }),
  ]);
  return { lineas, marcas, tipos, formas, productos, especificaciones };
}

export async function crearRespaldoInventario(filtros: FiltrosRespaldo = {}) {
  const datos = await recopilar(filtros);
  const zip = new JSZip();
  const archivos: { ruta: string; sha256: string; bytes: number }[] = [];
  const agregar = (ruta: string, contenido: Buffer) => { zip.file(ruta, contenido); archivos.push({ ruta, sha256: sha256(contenido), bytes: contenido.byteLength }); };
  const colecciones = {
    "lineas": datos.lineas,
    "marcas": datos.marcas,
    "tipos-producto": datos.tipos,
    "formas-pantalla": datos.formas,
    "productos": datos.productos,
    "especificaciones-pantalla": datos.especificaciones,
  };
  for (const nombre of ARCHIVOS_DATOS) agregar(`datos/${nombre}.json`, json(colecciones[nombre]));

  let totalImagenes = 0;
  if (filtros.incluirImagenes !== false) for (const producto of datos.productos) {
    if (!producto.imagenUrl?.startsWith("/imagenes/productos/")) continue;
    const nombre = nombreSeguro(path.basename(producto.imagenUrl));
    try { const contenido = await readFile(path.join(RAIZ_IMAGENES, nombre)); agregar(`imagenes/${nombre}`, contenido); totalImagenes++; } catch { /* Se conserva el enlace aunque falte el archivo local. */ }
  }
  const completo = !filtros.marcas?.length && !filtros.lineas?.length && (!filtros.fichas || filtros.fichas === "todos") && filtros.incluirImagenes !== false;
  const manifiesto = {
    formato: "tufis-inventario" as const, version: VERSION, creadoEn: new Date().toISOString(), completo,
    cantidades: { lineas: datos.lineas.length, marcas: datos.marcas.length, tiposProducto: datos.tipos.length, formasPantalla: datos.formas.length, productos: datos.productos.length, especificacionesPantalla: datos.especificaciones.length, imagenes: totalImagenes },
    archivos,
  };
  zip.file("manifest.json", json(manifiesto));
  return { archivo: await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } }), manifiesto };
}

export async function leerRespaldoInventario(buffer: Buffer) {
  if (!buffer.length || buffer.length > MAXIMO_RESPALDO) throw new Error("El respaldo debe pesar entre 1 byte y 250 MB.");
  const zip = await JSZip.loadAsync(buffer, { checkCRC32: true, createFolders: false });
  const entradaManifiesto = zip.file("manifest.json");
  if (!entradaManifiesto) throw new Error("El respaldo no contiene manifest.json.");
  const manifiesto = manifiestoSchema.parse(JSON.parse(await entradaManifiesto.async("text")));
  let total = 0;
  const contenidos = new Map<string, Buffer>();
  for (const archivo of manifiesto.archivos) {
    if (archivo.ruta.includes("..") || archivo.ruta.startsWith("/") || archivo.ruta.includes("\\")) throw new Error("El respaldo contiene una ruta no permitida.");
    total += archivo.bytes;
    if (total > MAXIMO_EXTRAIDO) throw new Error("El respaldo excede 500 MB después de descomprimirse.");
    const entrada = zip.file(archivo.ruta);
    if (!entrada) throw new Error(`Falta ${archivo.ruta}.`);
    const contenido = await entrada.async("nodebuffer");
    if (contenido.byteLength !== archivo.bytes || sha256(contenido) !== archivo.sha256) throw new Error(`La integridad de ${archivo.ruta} no es válida.`);
    contenidos.set(archivo.ruta, contenido);
  }
  const obtener = <T>(nombre: typeof ARCHIVOS_DATOS[number]) => JSON.parse(contenidos.get(`datos/${nombre}.json`)!.toString("utf8")) as T[];
  return {
    manifiesto, contenidos,
    datos: { lineas: obtener<Linea>("lineas"), marcas: obtener<Marca>("marcas"), tipos: obtener<TipoProducto>("tipos-producto"), formas: obtener<FormaPantallaPersonalizada>("formas-pantalla"), productos: obtener<Producto>("productos"), especificaciones: obtener<EspecificacionPantalla>("especificaciones-pantalla") },
  };
}

function seleccionarProductos(datos: Awaited<ReturnType<typeof leerRespaldoInventario>>["datos"], opciones: OpcionesRestauracion) {
  const marcas = new Map(datos.marcas.map((item) => [item.id, item.clave])), lineas = new Map(datos.lineas.map((item) => [item.id, item.clave]));
  const permitidos = datos.productos.filter((p) => (!opciones.marcas?.length || opciones.marcas.includes(marcas.get(p.marcaId) || "")) && (!opciones.lineas?.length || opciones.lineas.includes(lineas.get(p.lineaId) || "")));
  const conFicha = new Set(datos.especificaciones.map((e) => e.productoId));
  return permitidos.filter((p) => opciones.fichas !== "con" || conFicha.has(p.id)).filter((p) => opciones.fichas !== "sin" || !conFicha.has(p.id));
}

export async function restaurarInventario(buffer: Buffer, opciones: OpcionesRestauracion) {
  const respaldo = await leerRespaldoInventario(buffer);
  const recursos = new Set(opciones.recursos);
  const seleccionados = seleccionarProductos(respaldo.datos, opciones);
  const seleccionIds = new Set(seleccionados.map((p) => p.id));
  if (opciones.modo === "reemplazar-todo") {
    if (opciones.confirmacion !== "RESTAURAR") throw new Error("Escribe RESTAURAR para confirmar el reemplazo completo.");
    if (!respaldo.manifiesto.completo || recursos.size !== 7 || opciones.marcas?.length || opciones.lineas?.length || (opciones.fichas && opciones.fichas !== "todos")) throw new Error("El reemplazo completo requiere un respaldo completo y todos los recursos seleccionados.");
    const previo = await crearRespaldoInventario({ incluirImagenes: true });
    await mkdir(RAIZ_RESPALDOS, { recursive: true });
    await writeFile(path.join(RAIZ_RESPALDOS, `automatico-antes-restaurar-${new Date().toISOString().replaceAll(":", "-")}.tufis.zip`), previo.archivo);
  }

  await prisma.$transaction(async (tx) => {
    if (opciones.modo === "reemplazar-todo") {
      await tx.especificacionPantalla.deleteMany(); await tx.producto.deleteMany(); await tx.formaPantallaPersonalizada.deleteMany(); await tx.tipoProducto.deleteMany(); await tx.linea.deleteMany(); await tx.marca.deleteMany();
    }
    const requiereDependencias = recursos.has("productos") || recursos.has("especificaciones-pantalla");
    const idsLineas = new Set(seleccionados.map((p) => p.lineaId)), idsMarcas = new Set(seleccionados.map((p) => p.marcaId)), idsTipos = new Set(seleccionados.map((p) => p.tipoProductoId));
    const lineasFuente = respaldo.datos.lineas.filter((x) => recursos.has("lineas") || (requiereDependencias && idsLineas.has(x.id)));
    const marcasFuente = respaldo.datos.marcas.filter((x) => recursos.has("marcas") || (requiereDependencias && idsMarcas.has(x.id)));
    const tiposFuente = respaldo.datos.tipos.filter((x) => recursos.has("tipos-producto") || (requiereDependencias && idsTipos.has(x.id)));
    const lineas = new Map<string, string>(), marcas = new Map<string, string>(), tipos = new Map<string, string>();
    for (const item of lineasFuente) { const x = await tx.linea.upsert({ where: { clave: item.clave }, create: { clave: item.clave, nombre: item.nombre }, update: recursos.has("lineas") ? { nombre: item.nombre } : {} }); lineas.set(item.id, x.id); }
    for (const item of marcasFuente) { const x = await tx.marca.upsert({ where: { clave: item.clave }, create: { clave: item.clave, nombre: item.nombre }, update: recursos.has("marcas") ? { nombre: item.nombre } : {} }); marcas.set(item.id, x.id); }
    for (const item of tiposFuente) { const x = await tx.tipoProducto.upsert({ where: { clave: item.clave }, create: { clave: item.clave, nombre: item.nombre, categoria: item.categoria as CategoriaProducto }, update: recursos.has("tipos-producto") ? { nombre: item.nombre, categoria: item.categoria as CategoriaProducto } : {} }); tipos.set(item.id, x.id); }
    if (recursos.has("formas-pantalla")) for (const item of respaldo.datos.formas) await tx.formaPantallaPersonalizada.upsert({ where: { nombre: item.nombre }, create: { nombre: item.nombre }, update: {} });

    const productos = new Map<string, string>();
    for (const item of seleccionados) {
      if (!recursos.has("productos")) { const actual = await tx.producto.findUnique({ where: { clave: item.clave }, select: { id: true } }); if (actual) productos.set(item.id, actual.id); continue; }
      const datos = { descripcion: item.descripcion, imagenUrl: item.imagenUrl, imagenNombre: item.imagenNombre, imagenMimeType: item.imagenMimeType, imagenTamano: item.imagenTamano, existencia: item.existencia, modelo: item.modelo, color: item.color, claveMLFull: item.claveMLFull, codigoUniversal: item.codigoUniversal, lineaId: lineas.get(item.lineaId)!, marcaId: marcas.get(item.marcaId)!, tipoProductoId: tipos.get(item.tipoProductoId)! };
      const existente = await tx.producto.findUnique({ where: { clave: item.clave } });
      let resultado = existente;
      if (!existente) resultado = await tx.producto.create({ data: { clave: item.clave, ...datos } });
      else if (recursos.has("productos") && opciones.conflicto === "actualizar") resultado = await tx.producto.update({ where: { id: existente.id }, data: { ...datos, ...(opciones.existencia === "conservar" ? { existencia: existente.existencia } : {}) } });
      productos.set(item.id, resultado!.id);
    }
    if (recursos.has("especificaciones-pantalla")) for (const item of respaldo.datos.especificaciones.filter((e) => seleccionIds.has(e.productoId))) {
      const productoId = productos.get(item.productoId); if (!productoId) continue;
      const datos = { clave: item.clave, modelo: item.modelo, lineaId: lineas.get(item.lineaId)!, marcaId: marcas.get(item.marcaId)!, tecnologia: item.tecnologia, tipoFormaPantalla: item.tipoFormaPantalla as TipoFormaPantalla, tipoFormaOtro: item.tipoFormaOtro, diagonalMm: item.diagonalMm, diagonalPulgadas: item.diagonalPulgadas, anchoDisplayMm: item.anchoDisplayMm, altoDisplayMm: item.altoDisplayMm, aspectRatio: item.aspectRatio, resolucionAnchoPx: item.resolucionAnchoPx, resolucionAltoPx: item.resolucionAltoPx, densidadPpi: item.densidadPpi, profundidadColor: item.profundidadColor, areaDisplayPorcentaje: item.areaDisplayPorcentaje, cristalFrontal: item.cristalFrontal, refrescoHz: item.refrescoHz };
      await tx.especificacionPantalla.upsert({ where: { productoId }, create: { productoId, ...datos }, update: opciones.conflicto === "actualizar" ? datos : {} });
    }
  }, { timeout: 120_000 });

  let imagenes = 0;
  if (recursos.has("imagenes") && opciones.imagenes !== "conservar") {
    await mkdir(RAIZ_IMAGENES, { recursive: true });
    for (const producto of seleccionados) {
      if (!producto.imagenUrl?.startsWith("/imagenes/productos/")) continue;
      const nombre = nombreSeguro(path.basename(producto.imagenUrl)), contenido = respaldo.contenidos.get(`imagenes/${nombre}`);
      if (!contenido) continue;
      const destino = path.join(RAIZ_IMAGENES, nombre);
      if (opciones.imagenes === "solo-faltantes") { try { await readFile(destino); continue; } catch {} }
      const temporal = `${destino}.${randomUUID()}.tmp`; await writeFile(temporal, contenido); await rename(temporal, destino); imagenes++;
    }
  }
  return { productos: seleccionados.length, imagenes, especificaciones: respaldo.datos.especificaciones.filter((e) => seleccionIds.has(e.productoId)).length };
}
