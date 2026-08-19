"use server";

import { z } from "zod";
import { analizarFichaTecnica } from "@/lib/openai/analizar-ficha-tecnica";
import { prisma } from "@/lib/prisma";
import { requiereRegistroTecnico } from "@/lib/productos/requiere-registro-tecnico";

const MAXIMO_IMAGEN_BYTES = 10 * 1024 * 1024;
const tiposPermitidos = ["image/png", "image/jpeg", "image/webp"] as const;
const esquemaSolicitud = z.object({ productoId: z.string().min(1, "Selecciona un producto.") });

export async function analizarFichaTecnicaDesdeImagen(formData: FormData) {
  const { productoId } = esquemaSolicitud.parse({ productoId: formData.get("productoId") });
  const archivo = formData.get("imagen");
  if (!(archivo instanceof File) || archivo.size === 0) throw new Error("Selecciona una imagen de la ficha técnica.");
  if (archivo.size > MAXIMO_IMAGEN_BYTES) throw new Error("La imagen no debe superar 10 MB.");
  if (!tiposPermitidos.includes(archivo.type as (typeof tiposPermitidos)[number])) throw new Error("Usa una imagen PNG, JPEG o WebP.");

  const producto = await prisma.producto.findUnique({
    where: { id: productoId },
    select: { modelo: true, linea: { select: { nombre: true } } },
  });
  if (!producto) throw new Error("El producto seleccionado ya no existe.");
  if (!requiereRegistroTecnico(producto.linea.nombre)) throw new Error("La carga por imagen está disponible únicamente para cristales templados.");

  const resultado = await analizarFichaTecnica({
    imagen: Buffer.from(await archivo.arrayBuffer()),
    mimeType: archivo.type as (typeof tiposPermitidos)[number],
    modeloProducto: producto.modelo,
  });
  return resultado;
}
