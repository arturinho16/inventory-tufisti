import { ImagenProducto } from "@/components/productos/imagen-producto";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { EditorEtiquetasDinamico } from "@/components/etiquetas/editor-etiquetas-dinamico";
import { BotonLimpiarFiltros, BusquedaEnVivo, FormularioFiltros, GrupoChecks } from "@/components/inventario/filtros-inventario";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const POR_PAGINA = 8;

export default async function Etiquetas({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const valor = (clave: string) => typeof params[clave] === "string" ? params[clave] : "";
  const valores = (clave: string) => Array.isArray(params[clave]) ? params[clave] : typeof params[clave] === "string" && params[clave] ? [params[clave]] : [];
  const buscar = valor("buscar").trim(), productoId = valor("productoId");
  const marcas = valores("marca"), modelos = valores("modelo"), tamanos = valores("tamano");
  const paginaSolicitada = Number.parseInt(valor("pagina"), 10);
  const paginaBase = Number.isFinite(paginaSolicitada) ? Math.max(1, paginaSolicitada) : 1;
  const where: Prisma.ProductoWhereInput = {
    ...(buscar ? { OR: [{ clave: { contains: buscar, mode: "insensitive" } }, { descripcion: { contains: buscar, mode: "insensitive" } }, { modelo: { contains: buscar, mode: "insensitive" } }, { codigoUniversal: { contains: buscar, mode: "insensitive" } }] } : {}),
    ...(marcas.length ? { marca: { nombre: { in: marcas } } } : {}),
    ...(modelos.length ? { modelo: { in: modelos } } : {}),
    ...(tamanos.length ? { especificacionPantalla: { diagonalPulgadas: { in: tamanos } } } : {}),
  };
  const [total, catalogoMarcas, catalogoModelos, catalogoTamanos] = await Promise.all([
    prisma.producto.count({ where }),
    prisma.marca.findMany({ orderBy: { nombre: "asc" }, select: { nombre: true } }),
    prisma.producto.findMany({ distinct: ["modelo"], orderBy: { modelo: "asc" }, select: { modelo: true } }),
    prisma.especificacionPantalla.findMany({ distinct: ["diagonalPulgadas"], orderBy: { diagonalPulgadas: "asc" }, select: { diagonalPulgadas: true } }),
  ]);
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA)), pagina = Math.min(paginaBase, totalPaginas);
  const resultados = await prisma.producto.findMany({ where, skip: (pagina - 1) * POR_PAGINA, take: POR_PAGINA, orderBy: { actualizadoEn: "desc" }, select: { id: true, clave: true, descripcion: true, imagenUrl: true, existencia: true, modelo: true, codigoUniversal: true, linea: { select: { nombre: true } }, marca: { select: { nombre: true } }, especificacionPantalla: { select: { diagonalPulgadas: true } } } });
  const seleccionado = productoId ? await prisma.producto.findFirst({ where: { id: productoId }, select: { id: true, clave: true, descripcion: true, modelo: true, codigoUniversal: true, linea: { select: { nombre: true } }, marca: { select: { nombre: true } } } }) : resultados[0] ?? null;
  const crearHref = (opciones: { pagina?: number; productoId?: string } = {}) => {
    const query = new URLSearchParams();
    if (buscar) query.set("buscar", buscar);
    marcas.forEach((marca) => query.append("marca", marca)); modelos.forEach((modelo) => query.append("modelo", modelo)); tamanos.forEach((tamano) => query.append("tamano", tamano));
    if (opciones.pagina && opciones.pagina > 1) query.set("pagina", String(opciones.pagina));
    if (opciones.productoId) query.set("productoId", opciones.productoId);
    return `/etiquetas?${query.toString()}`;
  };

  return <main className="px-4 pb-28 pt-8 sm:px-8 xl:px-12">
    <header className="mb-8"><p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-[var(--primary)]">Inventarios y catálogos</p><h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Diseño e impresión de etiquetas</h1><p className="mt-2 text-[var(--on-surface-variant)]">Filtra, selecciona un producto y envía su etiqueta a una impresora térmica.</p></header>
    <section className="mb-6 overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl">
      <FormularioFiltros className="grid gap-3 border-b border-white/60 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_repeat(3,minmax(9rem,.55fr))_auto] xl:p-6">
        <label className="relative sm:col-span-2 xl:col-span-1"><span className="sr-only">Buscar productos para etiquetar</span><i className="bx bx-search absolute left-4 top-1/2 -translate-y-1/2 text-xl text-[var(--outline)]" /><BusquedaEnVivo valor={buscar} placeholder="Buscar por Clave, modelo, descripción o código..." /></label>
        <GrupoChecks nombre="marca" etiqueta="Marcas" seleccionados={marcas} opciones={catalogoMarcas.map(({ nombre }) => ({ valor: nombre, etiqueta: nombre }))} />
        <GrupoChecks nombre="modelo" etiqueta="Modelos" seleccionados={modelos} opciones={catalogoModelos.map(({ modelo }) => ({ valor: modelo, etiqueta: modelo }))} />
        <GrupoChecks nombre="tamano" etiqueta="T/Pantalla" seleccionados={tamanos} opciones={catalogoTamanos.map(({ diagonalPulgadas }) => ({ valor: diagonalPulgadas.toString(), etiqueta: `${diagonalPulgadas.toString()} pulgadas` }))} buscable />
        <BotonLimpiarFiltros total={marcas.length + modelos.length + tamanos.length} />
      </FormularioFiltros>
      <div className="grid gap-3 p-4 lg:grid-cols-2 xl:p-6">
        {resultados.map((producto) => <Link key={producto.id} href={crearHref({ pagina, productoId: producto.id })} aria-current={producto.id === seleccionado?.id ? "true" : undefined} className={`group grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-4 rounded-3xl border p-3 transition ${producto.id === seleccionado?.id ? "border-[var(--primary)] bg-purple-100/80 shadow-md" : "border-white/70 bg-white/45 hover:bg-white/70"}`}>
          <div className="relative grid size-[4.5rem] place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 text-3xl text-[var(--primary)]"><ImagenProducto url={producto.imagenUrl} descripcion={producto.descripcion} sizes="72px" /></div>
          <div className="min-w-0"><strong className="block font-mono text-sm text-[var(--primary)]">{producto.clave}</strong><h2 className="truncate font-semibold">{producto.descripcion}</h2><p className="truncate text-sm text-[var(--on-surface-variant)]">{producto.marca.nombre} · {producto.modelo}</p><p className="mt-1 text-xs text-[var(--on-surface-variant)]">{producto.especificacionPantalla ? `${producto.especificacionPantalla.diagonalPulgadas.toString()} pulgadas · ` : ""}Existencia: {producto.existencia.toLocaleString("es-MX")}</p></div>
          <span className={`grid size-10 place-items-center rounded-full text-xl ${producto.id === seleccionado?.id ? "bg-[var(--primary)] text-white" : "bg-white/70 text-[var(--primary)]"}`}><i className={`bx ${producto.id === seleccionado?.id ? "bx-check" : "bx-chevron-right"}`} /></span>
        </Link>)}
        {!resultados.length && <div className="col-span-full py-10 text-center"><i className="bx bx-search-alt text-5xl text-[var(--outline)]" /><h2 className="mt-3 text-xl font-semibold">No encontramos productos</h2><p className="text-[var(--on-surface-variant)]">Prueba con otros filtros.</p></div>}
      </div>
      <footer className="flex flex-col items-center justify-between gap-4 border-t border-white/60 p-5 text-sm text-[var(--on-surface-variant)] sm:flex-row"><span>Mostrando {resultados.length} de {total} productos</span><nav aria-label="Paginación de productos para etiquetas" className="flex items-center gap-2">{pagina > 1 && <Link href={crearHref({ pagina: pagina - 1 })} className="grid size-10 place-items-center rounded-full bg-white/60" aria-label="Página anterior"><i className="bx bx-chevron-left" /></Link>}<span className="px-2 font-semibold">Página {pagina} de {totalPaginas}</span>{pagina < totalPaginas && <Link href={crearHref({ pagina: pagina + 1 })} className="grid size-10 place-items-center rounded-full bg-white/60" aria-label="Página siguiente"><i className="bx bx-chevron-right" /></Link>}</nav></footer>
    </section>
    {seleccionado ? <EditorEtiquetasDinamico producto={{ id: seleccionado.id, clave: seleccionado.clave, descripcion: seleccionado.descripcion, modelo: seleccionado.modelo, codigoUniversal: seleccionado.codigoUniversal, linea: seleccionado.linea.nombre, marca: seleccionado.marca.nombre }} /> : <section className="rounded-[2.5rem] border border-white/60 bg-white/40 p-10 text-center"><i className="bx bx-package text-5xl text-[var(--outline)]" /><h2 className="mt-3 text-xl font-semibold">No hay productos para etiquetar</h2><p className="mt-2 text-[var(--on-surface-variant)]">Registra un producto o cambia los filtros.</p></section>}
  </main>;
}
