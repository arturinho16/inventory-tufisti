"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const formatosImagen = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const tamanoMaximoImagen = 5 * 1024 * 1024;

const esquema = z.object({
  clave: z.string().trim().min(2), descripcion: z.string().trim().min(3),
  lineaId: z.string().min(1), existencia: z.number().int().min(0), modelo: z.string().trim().min(1),
  marcaId: z.string().min(1), color: z.string(), claveMLFull: z.string(), codigoUniversal: z.string(),
  tipoProductoId: z.string().min(1), imagenUrl: z.union([z.literal(""), z.string().url("El enlace de imagen no es válido.")]),
});
export type DatosProductoPersistencia = z.infer<typeof esquema>;

const opcional = (valor: string) => valor.trim() || null;

async function guardarImagen(archivo: File) {
  const extension = formatosImagen.get(archivo.type);
  if (!extension) throw new Error("La imagen debe estar en formato JPG, PNG o WebP.");
  if (archivo.size > tamanoMaximoImagen) throw new Error("La imagen no debe superar 5 MB.");
  const nombre = `${randomUUID()}.${extension}`;
  const directorio = path.join(process.cwd(), "public", "imagenes", "productos");
  await mkdir(directorio, { recursive: true });
  await writeFile(path.join(directorio, nombre), Buffer.from(await archivo.arrayBuffer()));
  return { imagenUrl: `/imagenes/productos/${nombre}`, imagenNombre: archivo.name, imagenMimeType: archivo.type, imagenTamano: archivo.size };
}

export async function guardarProducto(datos: DatosProductoPersistencia, imagen: FormData, id?: string) {
  const validos = esquema.parse(datos);
  const entradaArchivo = imagen.get("archivo");
  const archivo = entradaArchivo instanceof File ? entradaArchivo : undefined;
  const imagenArchivo = archivo?.size ? await guardarImagen(archivo) : undefined;
  const imagenEnlace = !imagenArchivo && validos.imagenUrl
    ? { imagenUrl: validos.imagenUrl, imagenNombre: null, imagenMimeType: null, imagenTamano: null }
    : undefined;
  const campos = { clave: validos.clave, descripcion: validos.descripcion, lineaId: validos.lineaId, existencia: validos.existencia, modelo: validos.modelo, marcaId: validos.marcaId, color: validos.color, claveMLFull: validos.claveMLFull, codigoUniversal: validos.codigoUniversal, tipoProductoId: validos.tipoProductoId };
  const data = { ...campos, ...imagenArchivo, ...imagenEnlace, color: opcional(validos.color), claveMLFull: opcional(validos.claveMLFull), codigoUniversal: opcional(validos.codigoUniversal) };
  let producto: { id: string };
  try {
    producto = id ? await prisma.producto.update({ where: { id }, data, select: { id: true } }) : await prisma.producto.create({ data, select: { id: true } });
  } catch (causa) {
    const mensaje = causa instanceof Error ? causa.message : "";
    if (mensaje.includes("Unique constraint") || mensaje.includes("P2002")) throw new Error("Ya existe un producto con esa Clave.");
    if (mensaje.includes("Foreign key constraint") || mensaje.includes("P2003")) throw new Error("La línea, marca o tipo seleccionado ya no existe.");
    throw new Error("No fue posible guardar el producto. Revisa la conexión con la base de datos e inténtalo nuevamente.");
  }
  const comprobado = await prisma.producto.findUnique({ where: { id: producto.id }, select: { id: true } });
  if (!comprobado) throw new Error("El producto no pudo comprobarse después de guardarlo.");
  try { revalidatePath("/inventario"); } catch { /* El guardado confirmado no debe fallar por la caché de la vista. */ }
  return { id: comprobado.id, guardado: true as const };
}

export async function eliminarProducto(id: string) {
  await prisma.producto.delete({ where: { id } });
  revalidatePath("/inventario");
}
