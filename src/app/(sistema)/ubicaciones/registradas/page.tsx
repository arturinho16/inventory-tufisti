import Link from "next/link";
import { ListadoUbicaciones } from "@/components/ubicaciones/listado-ubicaciones";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const POR_PAGINA = 20;

export default async function UbicacionesRegistradas({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const solicitada = Math.max(1, Number.parseInt((await searchParams).pagina ?? "1", 10) || 1);
  const total = await prisma.ubicacion.count(); const paginas = Math.max(1, Math.ceil(total / POR_PAGINA)); const pagina = Math.min(solicitada, paginas);
  const datos = await prisma.ubicacion.findMany({ orderBy: [{ marketplace: "asc" }, { almacen: "asc" }], skip: (pagina - 1) * POR_PAGINA, take: POR_PAGINA, select: { id: true, almacen: true, cuentaAsociada: true, marketplace: true, imagenUrl: true, actualizadoEn: true, _count: { select: { productos: true } } } });
  const ubicaciones = datos.map(item => ({ ...item, actualizadoEn: item.actualizadoEn.getTime(), productos: item._count.productos }));
  return <main className="min-h-[calc(100vh-5rem)] px-4 pb-28 pt-8 sm:px-8 lg:pb-10 xl:px-12"><header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--primary)]">Ubicaciones</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">Ubicaciones registradas</h1><p className="mt-2 text-[var(--on-surface-variant)]">Consulta y administra todas las ubicaciones en una pantalla independiente.</p></div><Link href="/ubicaciones" className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] px-5 py-3 font-semibold text-white"><i className="bx bx-plus" />Nueva ubicación</Link></header>{ubicaciones.length ? <ListadoUbicaciones ubicaciones={ubicaciones} /> : <p className="rounded-[2rem] bg-white/40 p-8 text-center">Todavía no hay ubicaciones registradas.</p>}<nav aria-label="Paginación" className="mt-6 flex items-center justify-center gap-3">{pagina > 1 && <Link href={`?pagina=${pagina - 1}`} className="rounded-full bg-white/60 px-4 py-2 text-sm font-semibold">Anterior</Link>}<span className="text-sm">Página {pagina} de {paginas}</span>{pagina < paginas && <Link href={`?pagina=${pagina + 1}`} className="rounded-full bg-white/60 px-4 py-2 text-sm font-semibold">Siguiente</Link>}</nav></main>;
}
