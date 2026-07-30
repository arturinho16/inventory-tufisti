import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { FiltrosInventario } from "@/components/inventario/filtros-inventario";
import { TablaInventario } from "@/components/inventario/tabla-inventario";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Inventario({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const valor = (clave: string) => typeof params[clave] === "string" ? params[clave] : "";
  const busqueda = valor("buscar").trim(), linea = valor("linea"), marca = valor("marca"), tipo = valor("tipo");
  const porPagina = 10;
  const paginaSolicitada = Number.parseInt(valor("pagina"), 10);
  const paginaBase = Number.isFinite(paginaSolicitada) ? Math.max(paginaSolicitada, 1) : 1;
  const where: Prisma.ProductoWhereInput = {
    ...(busqueda ? { OR: ["clave", "descripcion", "modelo", "codigoUniversal", "claveMLFull"].map((campo) => ({ [campo]: { contains: busqueda, mode: "insensitive" } })) } : {}),
    ...(linea ? { linea: { nombre: linea } } : {}),
    ...(marca ? { marca: { nombre: marca } } : {}),
    ...(tipo ? { tipoProducto: { nombre: tipo } } : {}),
  };
  const [totalFiltrado, totalProductos, existencia, existenciasBajas] = await Promise.all([
    prisma.producto.count({ where }), prisma.producto.count(),
    prisma.producto.aggregate({ _sum: { existencia: true } }),
    prisma.producto.count({ where: { existencia: { lte: 20 } } }),
  ]);
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrado / porPagina));
  const pagina = Math.min(paginaBase, totalPaginas);
  const registros = await prisma.producto.findMany({
    where, orderBy: { creadoEn: "desc" }, skip: (pagina - 1) * porPagina, take: porPagina,
    select: { id: true, clave: true, descripcion: true, imagenUrl: true, existencia: true, modelo: true, color: true, claveMLFull: true, codigoUniversal: true, linea: { select: { nombre: true } }, marca: { select: { nombre: true } }, tipoProducto: { select: { nombre: true } } },
  });
  const productos = registros.map((producto) => ({ ...producto, imagenUrl: producto.imagenUrl ?? undefined, color: producto.color ?? "—", claveMLFull: producto.claveMLFull ?? "—", codigoUniversal: producto.codigoUniversal ?? "—", linea: producto.linea.nombre, marca: producto.marca.nombre, tipoProducto: producto.tipoProducto.nombre as "Teléfono" | "Cristal templado" | "Otro" }));
  const hrefPagina = (destino: number) => {
    const parametros = new URLSearchParams();
    if (busqueda) parametros.set("buscar", busqueda); if (linea) parametros.set("linea", linea); if (marca) parametros.set("marca", marca); if (tipo) parametros.set("tipo", tipo);
    parametros.set("pagina", String(destino)); return `/inventario?${parametros.toString()}`;
  };

  return <main className="px-4 pb-28 pt-8 sm:px-8 lg:pb-10 xl:px-12">
    <section className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-[var(--primary)]">Inventarios y catálogos</p><h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Inventario general</h1><p className="mt-2 text-[var(--on-surface-variant)]">Consulta existencias y encuentra cualquier producto rápidamente.</p></div><Link href="/productos/nuevo" className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] px-6 py-3 font-semibold text-white shadow-lg hover:brightness-110"><i className="bx bx-plus text-xl" />Nuevo producto</Link></section>
    <section className="mb-6 grid gap-4 sm:grid-cols-3">{[["Productos registrados", totalProductos], ["Unidades disponibles", existencia._sum.existencia ?? 0], ["Existencias bajas", existenciasBajas]].map(([etiqueta, cifra]) => <article key={etiqueta} className="rounded-[2rem] border border-white/60 bg-white/40 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl"><span className="text-sm text-[var(--on-surface-variant)]">{etiqueta}</span><strong className="mt-2 block text-3xl">{Number(cifra).toLocaleString("es-MX")}</strong></article>)}</section>
    <section className="overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl"><FiltrosInventario busqueda={busqueda} linea={linea} marca={marca} tipo={tipo} /><TablaInventario productos={productos} /><footer className="flex flex-col items-center justify-between gap-4 border-t border-white/60 p-5 text-sm text-[var(--on-surface-variant)] sm:flex-row"><span>Mostrando {productos.length} de {totalFiltrado} productos</span><nav aria-label="Paginación del inventario" className="flex items-center gap-2">{pagina > 1 && <Link href={hrefPagina(pagina - 1)} className="grid size-10 place-items-center rounded-full bg-white/60" aria-label="Página anterior"><i className="bx bx-chevron-left" /></Link>}{Array.from({ length: totalPaginas }, (_, indice) => indice + 1).map(numero => <Link key={numero} href={hrefPagina(numero)} aria-current={numero === pagina ? "page" : undefined} className={`grid size-10 place-items-center rounded-full font-semibold ${numero === pagina ? "bg-[var(--primary)] text-white" : "bg-white/60"}`}>{numero}</Link>)}{pagina < totalPaginas && <Link href={hrefPagina(pagina + 1)} className="grid size-10 place-items-center rounded-full bg-white/60" aria-label="Página siguiente"><i className="bx bx-chevron-right" /></Link>}</nav></footer></section>
  </main>;
}
