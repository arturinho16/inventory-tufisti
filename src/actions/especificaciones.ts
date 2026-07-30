"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TipoFormaPantalla } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const esquema = z.object({
  productoId: z.string().min(1), tecnologia: z.string().trim().min(1),
  tipoFormaPantalla: z.nativeEnum(TipoFormaPantalla), tipoFormaOtro: z.string(),
  diagonalMm: z.number().positive(), diagonalPulgadas: z.number().positive(),
  anchoDisplayMm: z.number().positive(), altoDisplayMm: z.number().positive(),
  aspectRatio: z.string().trim().min(1), resolucionAnchoPx: z.number().int().positive(),
  resolucionAltoPx: z.number().int().positive(), densidadPpi: z.number().int().positive(),
  profundidadColor: z.string().trim().min(1), areaDisplayPorcentaje: z.number().min(0).max(100),
  cristalFrontal: z.string(), refrescoHz: z.number().int().positive().nullable(),
}).refine((datos) => datos.tipoFormaPantalla !== TipoFormaPantalla.OTRO || datos.tipoFormaOtro.trim().length > 0, { path: ["tipoFormaOtro"], message: "Describe la forma de pantalla." });

export type DatosEspecificacion = z.infer<typeof esquema>;

export async function crearFormaPantallaPersonalizada(nombre: string) {
  const nombreValido = z.string().trim().min(3, "Escribe al menos 3 caracteres.").max(100, "Usa como máximo 100 caracteres.").parse(nombre);
  const existente = await prisma.formaPantallaPersonalizada.findFirst({ where: { nombre: { equals: nombreValido, mode: "insensitive" } }, select: { id: true, nombre: true } });
  if (existente) return { ...existente, creada: false as const };
  const creada = await prisma.formaPantallaPersonalizada.create({ data: { nombre: nombreValido }, select: { id: true, nombre: true } });
  try { revalidatePath("/paralelo/nuevo"); } catch { /* El catálogo ya fue guardado. */ }
  return { ...creada, creada: true as const };
}

export async function guardarEspecificacion(datos: DatosEspecificacion, id?: string) {
  const validos = esquema.parse(datos);
  const producto = await prisma.producto.findUnique({ where: { id: validos.productoId }, select: { clave: true, modelo: true, lineaId: true, marcaId: true, linea: { select: { nombre: true } } } });
  if (!producto) throw new Error("El producto seleccionado ya no existe.");
  if (producto.linea.nombre.toLocaleLowerCase("es-MX") !== "cristal templado para celular") throw new Error("Solo los productos de la línea Cristal templado para celular admiten este registro técnico.");
  const data = { ...validos, tipoFormaOtro: validos.tipoFormaOtro.trim() || null, cristalFrontal: validos.cristalFrontal.trim() || null, clave: producto.clave, modelo: producto.modelo, lineaId: producto.lineaId, marcaId: producto.marcaId };
  const existente = id ? null : await prisma.especificacionPantalla.findUnique({ where: { productoId: validos.productoId }, select: { id: true } });
  const guardada = id ? await prisma.especificacionPantalla.update({ where: { id }, data, select: { id: true } }) : existente ? await prisma.especificacionPantalla.update({ where: { id: existente.id }, data, select: { id: true } }) : await prisma.especificacionPantalla.create({ data, select: { id: true } });
  const comprobada = await prisma.especificacionPantalla.findUnique({ where: { id: guardada.id }, select: { id: true } });
  if (!comprobada) throw new Error("No fue posible comprobar el registro técnico después de guardarlo.");
  try {
    revalidatePath("/paralelo/registros");
    revalidatePath("/paralelo/nuevo");
  } catch { /* La ficha ya fue comprobada en PostgreSQL. */ }
  return { id: comprobada.id, guardado: true as const };
}

export async function eliminarEspecificacion(id: string) {
  await prisma.especificacionPantalla.delete({ where: { id } });
  revalidatePath("/paralelo/registros");
  revalidatePath("/paralelo/nuevo");
}
