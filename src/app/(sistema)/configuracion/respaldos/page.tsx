import { GestorProgramaciones } from "@/components/respaldos/gestor-programaciones";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ConfiguracionRespaldos() {
  const [programaciones, ejecuciones, marcas, lineas] = await Promise.all([
    prisma.programacionRespaldo.findMany({ orderBy: [{ activa: "desc" }, { nombre: "asc" }] }),
    prisma.ejecucionRespaldo.findMany({ take: 30, orderBy: { iniciadaEn: "desc" }, include: { programacion: { select: { nombre: true } } } }),
    prisma.marca.findMany({ orderBy: { nombre: "asc" }, select: { clave: true, nombre: true } }),
    prisma.linea.findMany({ orderBy: { nombre: "asc" }, select: { clave: true, nombre: true } }),
  ]);
  const datos = programaciones.map(p => ({ ...p, zonaHoraria: "America/Mexico_City" as const, fichas: (["todos", "con", "sin"].includes(p.fichas) ? p.fichas : "todos") as "todos" | "con" | "sin", ultimaEjecucion: p.ultimaEjecucion?.toISOString() || null, creadoEn: p.creadoEn.toISOString(), actualizadoEn: p.actualizadoEn.toISOString() }));
  const historial = ejecuciones.map(e => ({ id: e.id, programacionId: e.programacionId, programacion: e.programacion.nombre, estado: e.estado, archivoNombre: e.archivoNombre, tamanoBytes: e.tamanoBytes, error: e.error, iniciadaEn: e.iniciadaEn.toISOString(), finalizadaEn: e.finalizadaEn?.toISOString() || null }));
  return <main className="px-4 pb-28 pt-8 sm:px-8 lg:pb-10 xl:px-12"><header className="mb-8"><p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--primary)]">Configuración</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">Respaldos programados</h1><p className="mt-2 max-w-3xl text-[var(--on-surface-variant)]">Programa copias privadas del inventario. Se ejecutan aunque el navegador esté cerrado.</p></header><GestorProgramaciones programaciones={datos} ejecuciones={historial} marcas={marcas} lineas={lineas} /></main>;
}
