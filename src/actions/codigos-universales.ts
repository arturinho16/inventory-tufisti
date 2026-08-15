"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { crearCodigoUniversalInterno, esGtinValido } from "@/lib/codigos-universales";
import { prisma } from "@/lib/prisma";

const destino = (estado: "exito" | "error", mensaje: string) => `/codigos-universales?${new URLSearchParams({ [estado]: mensaje }).toString()}`;

export async function generarCodigoInterno(formData: FormData) {
  const productoId = String(formData.get("productoId") ?? "");
  const producto = await prisma.producto.findUnique({
    where: { id: productoId },
    select: { id: true, clave: true, codigoUniversal: true, linea: { select: { clave: true } }, marca: { select: { clave: true } } },
  });
  if (!producto) redirect(destino("error", "El producto ya no existe."));
  if (producto.codigoUniversal) redirect(destino("error", "El producto ya tiene un código universal. Bórralo desde la edición del producto antes de sustituirlo."));
  const codigo = crearCodigoUniversalInterno(producto.clave, producto.linea.clave, producto.marca.clave);
  const duplicado = await prisma.producto.findFirst({ where: { codigoUniversal: codigo, NOT: { id: producto.id } }, select: { id: true } });
  if (duplicado) redirect(destino("error", "La combinación produjo un código existente; asigna un GTIN oficial o revisa las claves."));
  await prisma.producto.update({ where: { id: producto.id }, data: { codigoUniversal: codigo } });
  revalidatePath("/codigos-universales"); revalidatePath("/inventario");
  redirect(destino("exito", `Código interno ${codigo} guardado correctamente.`));
}

export async function guardarGtinOficial(formData: FormData) {
  const productoId = String(formData.get("productoId") ?? "");
  const gtin = String(formData.get("gtin") ?? "").trim();
  if (!esGtinValido(gtin)) redirect(destino("error", "El GTIN debe tener 8, 12, 13 o 14 dígitos y un dígito verificador válido."));
  const duplicado = await prisma.producto.findFirst({ where: { codigoUniversal: gtin, NOT: { id: productoId } }, select: { id: true } });
  if (duplicado) redirect(destino("error", "Ese GTIN ya está asignado a otro producto."));
  const actualizado = await prisma.producto.updateMany({ where: { id: productoId }, data: { codigoUniversal: gtin } });
  if (!actualizado.count) redirect(destino("error", "El producto ya no existe."));
  revalidatePath("/codigos-universales"); revalidatePath("/inventario");
  redirect(destino("exito", `GTIN ${gtin} validado y guardado correctamente.`));
}
