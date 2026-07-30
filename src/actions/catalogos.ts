"use server";

import { revalidatePath } from "next/cache";
import { CategoriaProducto } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function crearCatalogo(tipo: "linea" | "marca" | "tipoProducto", registro: { clave: string; nombre: string }) {
  const datos = { clave: registro.clave.trim().toUpperCase(), nombre: registro.nombre.trim() };
  if (!datos.clave || !datos.nombre) throw new Error("Completa la clave y el nombre.");
  const creado = tipo === "linea" ? await prisma.linea.create({ data: datos, select: { id: true } })
    : tipo === "marca" ? await prisma.marca.create({ data: datos, select: { id: true } })
      : await prisma.tipoProducto.create({ data: { ...datos, categoria: CategoriaProducto.OTRO }, select: { id: true } });
  const comprobado = tipo === "linea" ? await prisma.linea.findUnique({ where: { id: creado.id }, select: { id: true } })
    : tipo === "marca" ? await prisma.marca.findUnique({ where: { id: creado.id }, select: { id: true } })
      : await prisma.tipoProducto.findUnique({ where: { id: creado.id }, select: { id: true } });
  if (!comprobado) throw new Error("No fue posible comprobar el catálogo después de guardarlo.");
  try {
    revalidatePath("/catalogos");
    revalidatePath("/productos/nuevo");
  } catch { /* El catálogo ya fue comprobado en PostgreSQL. */ }
  return { id: comprobado.id, guardado: true as const };
}

export async function actualizarCatalogo(tipo: "linea" | "marca" | "tipoProducto", id: string, registro: { clave: string; nombre: string }) {
  const datos = { clave: registro.clave.trim().toUpperCase(), nombre: registro.nombre.trim() };
  if (!datos.clave || !datos.nombre) throw new Error("Completa la clave y el nombre.");
  if (tipo === "linea") await prisma.linea.update({ where: { id }, data: datos });
  else if (tipo === "marca") await prisma.marca.update({ where: { id }, data: datos });
  else await prisma.tipoProducto.update({ where: { id }, data: datos });
  revalidatePath("/catalogos");
  revalidatePath("/productos/nuevo");
}

export async function eliminarCatalogo(tipo: "linea" | "marca" | "tipoProducto", id: string) {
  const productos = tipo === "linea" ? await prisma.producto.count({ where: { lineaId: id } }) : tipo === "marca" ? await prisma.producto.count({ where: { marcaId: id } }) : await prisma.producto.count({ where: { tipoProductoId: id } });
  if (productos > 0) throw new Error(`No se puede eliminar porque está asignado a ${productos} producto${productos === 1 ? "" : "s"}.`);
  if (tipo === "linea") await prisma.linea.delete({ where: { id } });
  else if (tipo === "marca") await prisma.marca.delete({ where: { id } });
  else await prisma.tipoProducto.delete({ where: { id } });
  revalidatePath("/catalogos");
  revalidatePath("/productos/nuevo");
}
