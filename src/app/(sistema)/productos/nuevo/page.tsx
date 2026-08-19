import Link from "next/link";
import { FormularioProducto } from "@/components/productos/formulario-producto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NuevoProducto() {
  const [lineas, marcas, tiposProducto, ubicaciones] = await Promise.all([
    prisma.linea.findMany({ select: { id: true, clave: true, nombre: true }, orderBy: { id: "asc" } }),
    prisma.marca.findMany({ select: { id: true, clave: true, nombre: true }, orderBy: { id: "asc" } }),
    prisma.tipoProducto.findMany({ select: { id: true, clave: true, nombre: true, categoria: true }, orderBy: { id: "asc" } }),
    prisma.ubicacion.findMany({ select: { id: true, almacen: true, cuentaAsociada: true, marketplace: true }, orderBy: [{ marketplace: "asc" }, { almacen: "asc" }] }),
  ]);
  return <main className="px-4 pb-24 pt-5 sm:px-8 lg:pb-6 xl:px-12"><header className="mb-4"><nav aria-label="Migas de pan" className="mb-1 flex items-center gap-2 text-xs text-[var(--on-surface-variant)]"><Link href="/inventario" className="hover:text-[var(--primary)]">Inventario</Link><i className="bx bx-chevron-right" /><span>Nuevo producto</span></nav><div className="flex flex-wrap items-end justify-between gap-2"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--primary)]">Inventarios y catálogos</p><h1 className="text-3xl font-bold tracking-tight">Agregar producto</h1></div><p className="text-sm text-[var(--on-surface-variant)]">Registra un teléfono, cristal templado u otro producto tecnológico.</p></div></header><FormularioProducto lineas={lineas} marcas={marcas} tiposProducto={tiposProducto} ubicaciones={ubicaciones} /></main>;
}
