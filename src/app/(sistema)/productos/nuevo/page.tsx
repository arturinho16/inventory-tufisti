import Link from "next/link";
import { FormularioProducto } from "@/components/productos/formulario-producto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NuevoProducto() {
  const [lineas, marcas, tiposProducto] = await Promise.all([
    prisma.linea.findMany({ select: { id: true, clave: true, nombre: true }, orderBy: { id: "asc" } }),
    prisma.marca.findMany({ select: { id: true, clave: true, nombre: true }, orderBy: { id: "asc" } }),
    prisma.tipoProducto.findMany({ select: { id: true, clave: true, nombre: true, categoria: true }, orderBy: { id: "asc" } }),
  ]);
  return <main className="px-4 pb-28 pt-8 sm:px-8 lg:pb-10 xl:px-12"><header className="mb-8"><nav aria-label="Migas de pan" className="mb-3 flex items-center gap-2 text-sm text-[var(--on-surface-variant)]"><Link href="/inventario" className="hover:text-[var(--primary)]">Inventario</Link><i className="bx bx-chevron-right" /><span>Nuevo producto</span></nav><p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-[var(--primary)]">Inventarios y catálogos</p><h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Agregar producto</h1><p className="mt-2 text-[var(--on-surface-variant)]">Registra un teléfono, cristal templado u otro producto tecnológico.</p></header><FormularioProducto lineas={lineas} marcas={marcas} tiposProducto={tiposProducto} /></main>;
}
