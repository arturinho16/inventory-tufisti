"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { copiarImagenExterna, eliminarImagenLocal, guardarArchivoLocal } from "@/lib/imagenes/almacen-local";
import { prisma } from "@/lib/prisma";

const esquema = z.object({
  clave: z.string().trim().min(2), descripcion: z.string().trim().min(3),
  lineaId: z.string().min(1), existencia: z.number().int().min(0), modelo: z.string().trim().min(1),
  marcaId: z.string().min(1), color: z.string(), claveMLFull: z.string(), codigoUniversal: z.string(),
  tipoProductoId: z.string().min(1), ubicacionIds: z.array(z.string()).min(1), imagenUrl: z.union([z.literal(""), z.string().url("El enlace de imagen no es válido."), z.string().startsWith("/imagenes/productos/")]),
});
export type DatosProductoPersistencia = z.infer<typeof esquema>;

const opcional = (valor: string) => valor.trim() || null;

export async function guardarProducto(datos: DatosProductoPersistencia, imagen: FormData, id?: string) {
  const validos = esquema.parse(datos);
  const anterior = id ? await prisma.producto.findUnique({ where: { id }, select: { imagenUrl: true } }) : null;
  const entradaArchivo = imagen.get("archivo");
  const archivo = entradaArchivo instanceof File ? entradaArchivo : undefined;
  const imagenArchivo = archivo?.size ? await guardarArchivoLocal(archivo, validos.clave, validos.modelo) : undefined;
  const imagenEnlace = !imagenArchivo && /^https?:\/\//i.test(validos.imagenUrl) ? await copiarImagenExterna(validos.imagenUrl, validos.clave, validos.modelo) : undefined;
  const imagenConservada = !imagenArchivo && !imagenEnlace && validos.imagenUrl.startsWith("/imagenes/productos/") ? { imagenUrl: validos.imagenUrl } : undefined;
  const imagenEliminada = !imagenArchivo && !imagenEnlace && !imagenConservada ? { imagenUrl: null, imagenNombre: null, imagenMimeType: null, imagenTamano: null } : undefined;
  const campos = { clave: validos.clave, descripcion: validos.descripcion, lineaId: validos.lineaId, existencia: validos.existencia, modelo: validos.modelo, marcaId: validos.marcaId, color: validos.color, claveMLFull: validos.claveMLFull, codigoUniversal: validos.codigoUniversal, tipoProductoId: validos.tipoProductoId };
  const data = { ...campos, ...imagenArchivo, ...imagenEnlace, ...imagenConservada, ...imagenEliminada, color: opcional(validos.color), claveMLFull: opcional(validos.claveMLFull), codigoUniversal: opcional(validos.codigoUniversal) };
  let producto: { id: string };
  try {
    producto = id ? await prisma.producto.update({ where: { id }, data: { ...data, ubicaciones: { set: validos.ubicacionIds.map(id => ({ id })) } }, select: { id: true } }) : await prisma.producto.create({ data: { ...data, ubicaciones: { connect: validos.ubicacionIds.map(id => ({ id })) } }, select: { id: true } });
  } catch (causa) {
    const mensaje = causa instanceof Error ? causa.message : "";
    if (mensaje.includes("Unique constraint") || mensaje.includes("P2002")) throw new Error("Ya existe un producto con esa Clave.");
    if (mensaje.includes("Foreign key constraint") || mensaje.includes("P2003")) throw new Error("La línea, marca o tipo seleccionado ya no existe.");
    throw new Error("No fue posible guardar el producto. Revisa la conexión con la base de datos e inténtalo nuevamente.");
  }
  const comprobado = await prisma.producto.findUnique({ where: { id: producto.id }, select: { id: true } });
  if (!comprobado) throw new Error("El producto no pudo comprobarse después de guardarlo.");
  const nuevaUrl = imagenArchivo?.imagenUrl ?? imagenEnlace?.imagenUrl ?? imagenConservada?.imagenUrl;
  if (anterior?.imagenUrl && anterior.imagenUrl !== (nuevaUrl ?? null)) await eliminarImagenLocal(anterior.imagenUrl);
  try { revalidatePath("/inventario"); } catch { /* El guardado confirmado no debe fallar por la caché de la vista. */ }
  return { id: comprobado.id, guardado: true as const };
}

export async function eliminarProducto(id: string) {
  const producto = await prisma.producto.findUnique({ where: { id }, select: { imagenUrl: true } });
  await prisma.producto.delete({ where: { id } });
  await eliminarImagenLocal(producto?.imagenUrl);
  revalidatePath("/inventario");
}

const esquemaEdicionMasiva = z.object({
  productoIds: z.array(z.string().min(1)).min(1).max(5000),
  operacion: z.enum(["AGREGAR_UBICACION", "QUITAR_UBICACION", "REEMPLAZAR_UBICACION", "CAMBIAR_LINEA", "CAMBIAR_MARCA", "CAMBIAR_TIPO"]),
  valorId: z.string().min(1),
  reemplazoId: z.string().optional(),
});

export async function editarProductosMasivamente(entrada: z.input<typeof esquemaEdicionMasiva>) {
  const datos = esquemaEdicionMasiva.parse(entrada);
  const ids = [...new Set(datos.productoIds)];
  const existentes = await prisma.producto.findMany({ where: { id: { in: ids } }, select: { id: true, ubicaciones: { select: { id: true } } } });
  if (existentes.length !== ids.length) throw new Error("Uno o más productos ya no existen.");
  let omitidos = 0;
  await prisma.$transaction(async (tx) => {
    if (datos.operacion === "CAMBIAR_LINEA") { await tx.linea.findUniqueOrThrow({ where: { id: datos.valorId } }); await tx.producto.updateMany({ where: { id: { in: ids } }, data: { lineaId: datos.valorId } }); return; }
    if (datos.operacion === "CAMBIAR_MARCA") { await tx.marca.findUniqueOrThrow({ where: { id: datos.valorId } }); await tx.producto.updateMany({ where: { id: { in: ids } }, data: { marcaId: datos.valorId } }); return; }
    if (datos.operacion === "CAMBIAR_TIPO") { await tx.tipoProducto.findUniqueOrThrow({ where: { id: datos.valorId } }); await tx.producto.updateMany({ where: { id: { in: ids } }, data: { tipoProductoId: datos.valorId } }); return; }
    await tx.ubicacion.findUniqueOrThrow({ where: { id: datos.valorId } });
    if (datos.operacion === "REEMPLAZAR_UBICACION") {
      if (!datos.reemplazoId || datos.reemplazoId === datos.valorId) return;
      await tx.ubicacion.findUniqueOrThrow({ where: { id: datos.reemplazoId } });
    }
    for (const producto of existentes) {
      const asignadas = producto.ubicaciones.map(({ id }) => id);
      if (datos.operacion === "AGREGAR_UBICACION") {
        if (asignadas.includes(datos.valorId)) { omitidos++; continue; }
        await tx.producto.update({ where: { id: producto.id }, data: { ubicaciones: { connect: { id: datos.valorId } } } });
      } else if (datos.operacion === "QUITAR_UBICACION") {
        if (!asignadas.includes(datos.valorId) || asignadas.length === 1) { omitidos++; continue; }
        await tx.producto.update({ where: { id: producto.id }, data: { ubicaciones: { disconnect: { id: datos.valorId } } } });
      } else {
        if (!asignadas.includes(datos.valorId)) { omitidos++; continue; }
        await tx.producto.update({ where: { id: producto.id }, data: { ubicaciones: { disconnect: { id: datos.valorId }, connect: { id: datos.reemplazoId! } } } });
      }
    }
  });
  revalidatePath("/inventario");
  if (datos.operacion === "REEMPLAZAR_UBICACION" && datos.reemplazoId === datos.valorId) return { modificados: 0, omitidos: ids.length, error: "Selecciona una ubicación de reemplazo diferente." };
  return { modificados: ids.length - omitidos, omitidos, error: null };
}
