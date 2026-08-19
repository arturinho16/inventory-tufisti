import Link from "next/link";
import { GestorUbicaciones } from "@/components/ubicaciones/gestor-ubicaciones";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Ubicaciones({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  const id = (await searchParams).editar;
  const ubicacion = id ? await prisma.ubicacion.findUnique({ where: { id }, select: { id: true, almacen: true, cuentaAsociada: true, marketplace: true, imagenUrl: true, actualizadoEn: true } }) : null;
  return <main className="min-h-[calc(100vh-5rem)] px-4 pb-28 pt-8 sm:px-8 lg:pb-10 xl:px-12"><header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--primary)]">Inventario</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">Ubicaciones</h1><p className="mt-2 max-w-3xl text-[var(--on-surface-variant)]">Registra o modifica almacenes, cuentas asociadas y marketplaces.</p></div><Link href="/ubicaciones/registradas" className="inline-flex items-center justify-center gap-2 rounded-full bg-white/65 px-5 py-3 font-semibold text-[var(--primary)]"><i className="bx bx-list-ul text-xl" />Ver ubicaciones registradas</Link></header><GestorUbicaciones ubicacionInicial={ubicacion ? { ...ubicacion, actualizadoEn: ubicacion.actualizadoEn.getTime() } : null} /></main>;
}
