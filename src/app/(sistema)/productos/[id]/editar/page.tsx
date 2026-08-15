import Link from "next/link";
import { notFound } from "next/navigation";
import { FormularioProducto } from "@/components/productos/formulario-producto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditarProducto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [producto, lineas, marcas, tiposProducto, ubicaciones] = await Promise.all([
    prisma.producto.findUnique({ where: { id }, select: { id: true, clave: true, descripcion: true, imagenUrl: true, lineaId: true, existencia: true, modelo: true, marcaId: true, color: true, claveMLFull: true, codigoUniversal: true, tipoProductoId: true, ubicaciones: { select: { id: true } } } }),
    prisma.linea.findMany({ select: { id: true, clave: true, nombre: true }, orderBy: { id: "asc" } }),
    prisma.marca.findMany({ select: { id: true, clave: true, nombre: true }, orderBy: { id: "asc" } }),
    prisma.tipoProducto.findMany({ select: { id: true, clave: true, nombre: true, categoria: true }, orderBy: { id: "asc" } }),
    prisma.ubicacion.findMany({ select: { id: true, almacen: true, cuentaAsociada: true, marketplace: true }, orderBy: [{ marketplace: "asc" }, { almacen: "asc" }] }),
  ]);
  if (!producto) notFound();
  return <main className="px-4 pb-28 pt-8 sm:px-8 lg:pb-10 xl:px-12"><header className="mb-8"><nav aria-label="Migas de pan" className="mb-3 flex items-center gap-2 text-sm text-[var(--on-surface-variant)]"><Link href="/inventario" className="hover:text-[var(--primary)]">Inventario</Link><i className="bx bx-chevron-right" /><span>Editar producto</span></nav><p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-[var(--primary)]">Inventarios y catálogos</p><h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Editar producto</h1><p className="mt-2 text-[var(--on-surface-variant)]">Modifica la información de {producto.clave}.</p></header><FormularioProducto modo="editar" productoId={producto.id} lineas={lineas} marcas={marcas} tiposProducto={tiposProducto} ubicaciones={ubicaciones} datosIniciales={{ clave: producto.clave, descripcion: producto.descripcion, linea: producto.lineaId, existencia: producto.existencia, modelo: producto.modelo, marca: producto.marcaId, color: producto.color ?? "", claveMLFull: producto.claveMLFull ?? "", codigoUniversal: producto.codigoUniversal ?? "", tipoProducto: producto.tipoProductoId, ubicaciones: producto.ubicaciones.map(ubicacion => ubicacion.id), imagenUrl: producto.imagenUrl ?? "" }} /></main>;
}
