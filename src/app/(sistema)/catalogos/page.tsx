import { ListadoCatalogos } from "@/components/catalogos/listado-catalogos";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Catalogos() {
  const [linea, marca, tipoProducto] = await Promise.all([
    prisma.linea.findMany({ select: { id: true, clave: true, nombre: true }, orderBy: { id: "asc" } }),
    prisma.marca.findMany({ select: { id: true, clave: true, nombre: true }, orderBy: { id: "asc" } }),
    prisma.tipoProducto.findMany({ select: { id: true, clave: true, nombre: true }, orderBy: { id: "asc" } }),
  ]);
  return <main className="px-4 pb-28 pt-8 sm:px-8 lg:pb-10 xl:px-12"><header className="mb-8"><p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-[var(--primary)]">Inventarios y catálogos</p><h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Catálogos</h1><p className="mt-2 text-[var(--on-surface-variant)]">Consulta las líneas, marcas y tipos de producto registrados.</p></header><ListadoCatalogos datosIniciales={{ linea, marca, tipoProducto }} /></main>;
}
