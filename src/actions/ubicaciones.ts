"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { copiarImagenExterna, eliminarImagenLocal, guardarArchivoLocal } from "@/lib/imagenes/almacen-local";
import { prisma } from "@/lib/prisma";

const esquema = z.object({
  almacen: z.string().trim().min(2, "Escribe el almacén o ubicación."),
  cuentaAsociada: z.string().trim().min(1, "Escribe la cuenta asociada."),
  marketplace: z.enum(["MERCADO_LIBRE", "AMAZON", "WALMART", "TIENDANUBE", "CLAROSHOP"]),
  imagenUrl: z.union([z.literal(""), z.string().url("Escribe un enlace de imagen válido."), z.string().startsWith("/imagenes/productos/")]),
});

export async function guardarUbicacion(formulario: FormData, id?: string) {
  const datos = esquema.parse({ almacen: formulario.get("almacen"), cuentaAsociada: formulario.get("cuentaAsociada"), marketplace: formulario.get("marketplace"), imagenUrl: formulario.get("imagenUrl") ?? "" });
  const anterior = id ? await prisma.ubicacion.findUnique({ where: { id }, select: { imagenUrl: true } }) : null;
  if (id && !anterior) throw new Error("La ubicación ya no existe.");
  const entrada = formulario.get("imagen");
  const archivo = entrada instanceof File && entrada.size ? entrada : undefined;
  const base = `ubicacion-${datos.marketplace}`;
  const nombre = `${datos.almacen}-${datos.cuentaAsociada}`;
  const imagenArchivo = archivo ? await guardarArchivoLocal(archivo, base, nombre) : undefined;
  const imagenEnlace = !imagenArchivo && /^https?:\/\//i.test(datos.imagenUrl) ? await copiarImagenExterna(datos.imagenUrl, base, nombre) : undefined;
  const conservar = !imagenArchivo && !imagenEnlace && datos.imagenUrl.startsWith("/imagenes/productos/") ? { imagenUrl: datos.imagenUrl } : undefined;
  const eliminar = !imagenArchivo && !imagenEnlace && !conservar ? { imagenUrl: null, imagenNombre: null, imagenMimeType: null, imagenTamano: null } : undefined;
  const imagen = imagenArchivo ?? imagenEnlace ?? conservar ?? eliminar ?? {};
  try {
    if (id) await prisma.ubicacion.update({ where: { id }, data: { almacen: datos.almacen, cuentaAsociada: datos.cuentaAsociada, marketplace: datos.marketplace, ...imagen } });
    else await prisma.ubicacion.create({ data: { almacen: datos.almacen, cuentaAsociada: datos.cuentaAsociada, marketplace: datos.marketplace, ...imagen } });
  } catch (error) {
    const nuevaUrl = imagenArchivo?.imagenUrl ?? imagenEnlace?.imagenUrl;
    if (nuevaUrl && nuevaUrl !== anterior?.imagenUrl) await eliminarImagenLocal(nuevaUrl);
    const mensaje = error instanceof Error ? error.message : "";
    if (mensaje.includes("P2002") || mensaje.includes("Unique constraint")) throw new Error("Ya existe esa ubicación para la cuenta y marketplace seleccionados.");
    throw new Error("No fue posible guardar la ubicación.");
  }
  const nuevaUrl = imagenArchivo?.imagenUrl ?? imagenEnlace?.imagenUrl ?? conservar?.imagenUrl ?? null;
  if (anterior?.imagenUrl && anterior.imagenUrl !== nuevaUrl) await eliminarImagenLocal(anterior.imagenUrl);
  revalidatePath("/ubicaciones");
  revalidatePath("/ubicaciones/registradas");
  revalidatePath("/productos/nuevo");
}

export async function eliminarUbicacion(id: string) {
  const ubicacion = await prisma.ubicacion.findUnique({ where: { id }, select: { imagenUrl: true, _count: { select: { productos: true } } } });
  if (!ubicacion) return;
  if (ubicacion._count.productos) throw new Error("No puedes eliminar una ubicación asociada a productos.");
  await prisma.ubicacion.delete({ where: { id } });
  await eliminarImagenLocal(ubicacion.imagenUrl);
  revalidatePath("/ubicaciones");
  revalidatePath("/ubicaciones/registradas");
}
