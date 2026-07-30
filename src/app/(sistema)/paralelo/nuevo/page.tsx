import Link from "next/link";
import { FormularioEspecificacion } from "@/components/smart-match/formulario-especificacion";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NuevoRegistroTecnico({ searchParams }: { searchParams: Promise<{ productoId?: string }> }) {
  const { productoId } = await searchParams;
  const [registros, formasPersonalizadas] = await Promise.all([prisma.producto.findMany({
    where: { linea: { nombre: { equals: "Cristal templado para celular", mode: "insensitive" } } },
    select: { id: true, clave: true, descripcion: true, modelo: true, imagenUrl: true, linea: { select: { nombre: true } }, marca: { select: { nombre: true } }, tipoProducto: { select: { nombre: true } } },
    orderBy: { clave: "asc" },
  }), prisma.formaPantallaPersonalizada.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } })]);
  const productos = registros.map(p => ({ ...p, linea: p.linea.nombre, marca: p.marca.nombre, tipo: p.tipoProducto.nombre }));
  const seleccionado = productos.some(p => p.id === productoId) ? productoId : productos[0]?.id;

  return <main className="px-4 pb-28 pt-8 sm:px-8 xl:px-12">
    <header className="mb-8"><nav aria-label="Migas de pan" className="mb-3 flex items-center gap-2 text-sm text-[var(--on-surface-variant)]"><Link href="/paralelo/registros">Paralelo visual</Link><i className="bx bx-chevron-right" /><span>Nuevo registro técnico</span></nav><p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-[var(--primary)]">Smart Match</p><h1 className="text-3xl font-bold sm:text-5xl">Alta de parámetros de pantalla</h1><p className="mt-2 text-[var(--on-surface-variant)]">Registra tipo, tecnología, dimensiones, resolución, densidad, profundidad de color, área, forma y refresco.</p></header>
    {!productos.length && <section role="status" className="mb-6 rounded-[2rem] border border-white/60 bg-white/50 p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-semibold">No hay cristales templados registrados</h2><p className="mt-1 text-[var(--on-surface-variant)]">Agrega un producto y asígnalo a la línea Cristal templado para celular para capturar sus características de pantalla.</p></div><Link href="/productos/nuevo" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 py-3 font-semibold text-white"><i className="bx bx-plus" />Registrar producto</Link></div></section>}
    <FormularioEspecificacion productos={productos} formasPersonalizadas={formasPersonalizadas} inicial={{ productoId: seleccionado }} />
  </main>;
}
