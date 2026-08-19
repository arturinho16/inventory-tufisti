import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { BotonSincronizarMercadoLibre } from "@/components/mercadolibre/boton-sincronizar";
import { PaginaCuenta, PaginacionCuenta } from "@/components/mercadolibre/pagina-cuenta";
import { BusquedaEnVivo, FormularioFiltros, GrupoChecks } from "@/components/inventario/filtros-inventario";
import { ImagenProducto } from "@/components/productos/imagen-producto";
import { obtenerCuentaMercadoLibre, paginaSegura } from "@/lib/mercadolibre/consultas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const estadoEspanol = (estado: string) => estado === "active" ? "Activa" : "Inactiva";
const condicionEspanol = (condicion: string | null) => condicion === "new" ? "Nuevo" : condicion === "used" ? "Usado" : condicion === "not_specified" ? "No especificada" : condicion ?? "No informada";

export default async function ProductosMercadoLibre({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const cuenta = await obtenerCuentaMercadoLibre();
  const params = await searchParams;
  const valor = (clave: string) => typeof params[clave] === "string" ? params[clave] : "";
  const buscar = valor("buscar").trim();
  const marca = valor("marca");
  const logistica = valor("logistica");
  const estado = valor("estado");
  const ordenVentas = valor("ordenVentas") === "asc" ? "asc" : valor("ordenVentas") === "desc" ? "desc" : "";
  const paginaSolicitada = paginaSegura(valor("pagina"));
  const porPagina = 20;

  if (!cuenta) return <PaginaCuenta cuenta={null} titulo="Productos" descripcion="Productos consultados desde Mercado Libre."><span /></PaginaCuenta>;

  const where: Prisma.ProductoMercadoLibreWhereInput = {
    cuentaId: cuenta.id,
    ...(buscar ? { OR: [
      { titulo: { contains: buscar, mode: "insensitive" } },
      { codigoVendedor: { contains: buscar, mode: "insensitive" } },
      { marca: { contains: buscar, mode: "insensitive" } },
      { modelo: { contains: buscar, mode: "insensitive" } },
    ] } : {}),
    ...(marca ? { marca } : {}),
    ...(logistica ? { logistica } : {}),
    ...(estado ? { estado: estado === "ACTIVA" ? "active" : { not: "active" } } : {}),
  };
  const [total, marcas, resumenFull] = await Promise.all([
    prisma.productoMercadoLibre.count({ where }),
    prisma.productoMercadoLibre.findMany({ where: { cuentaId: cuenta.id, marca: { not: null } }, distinct: ["marca"], orderBy: { marca: "asc" }, select: { marca: true } }),
    prisma.productoMercadoLibre.aggregate({ where: { cuentaId: cuenta.id, logistica: "FULL" }, _count: true, _sum: { existenciaFullTotal: true, existenciaFullDisponible: true, existenciaFullNoDisponible: true } }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const pagina = Math.min(paginaSolicitada, paginas);
  const orderBy: Prisma.ProductoMercadoLibreOrderByWithRelationInput[] = ordenVentas
    ? [{ vendidos: ordenVentas }, { titulo: "asc" }]
    : [{ estado: "asc" }, { titulo: "asc" }];
  const productos = await prisma.productoMercadoLibre.findMany({ where, orderBy, skip: (pagina - 1) * porPagina, take: porPagina });
  const codigos = productos.map(producto => producto.codigoVendedor).filter((codigo): codigo is string => Boolean(codigo));
  const locales = await prisma.producto.findMany({ where: { clave: { in: codigos } }, select: { id: true, clave: true, descripcion: true, existencia: true } });
  const localPorClave = new Map(locales.map(local => [local.clave, local]));
  const query = {
    ...(buscar ? { buscar } : {}), ...(marca ? { marca } : {}), ...(logistica ? { logistica } : {}),
    ...(estado ? { estado } : {}), ...(ordenVentas ? { ordenVentas } : {}),
  };

  return <PaginaCuenta cuenta={cuenta} titulo="Productos" descripcion="Catálogo de solo lectura sincronizado desde Mercado Libre. Ninguna acción modifica publicaciones ni existencias." mostrarCuenta={false}>
    <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-end">
      <FormularioFiltros className="grid flex-1 gap-2 rounded-[2rem] border border-white/60 bg-white/40 p-3 backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <label className="relative"><span className="sr-only">Buscar productos</span><i className="bx bx-search absolute left-4 top-1/2 -translate-y-1/2 text-lg text-[var(--outline)]" /><BusquedaEnVivo valor={buscar} placeholder="Buscar nombre, Clave, marca…" /></label>
        <GrupoChecks nombre="marca" etiqueta="Marca" seleccionados={marca ? [marca] : []} opciones={marcas.map(item => ({ valor: item.marca!, etiqueta: item.marca! }))} />
        <GrupoChecks nombre="logistica" etiqueta="Logística" seleccionados={logistica ? [logistica] : []} opciones={[{ valor: "LOCAL", etiqueta: "L · Local" }, { valor: "FULL", etiqueta: "F · Full" }]} />
        <GrupoChecks nombre="estado" etiqueta="Estado" seleccionados={estado ? [estado] : []} opciones={[{ valor: "ACTIVA", etiqueta: "Activa" }, { valor: "INACTIVA", etiqueta: "Inactiva" }]} />
        <GrupoChecks nombre="ordenVentas" etiqueta="Ordenar ventas" seleccionados={ordenVentas ? [ordenVentas] : []} opciones={[{ valor: "desc", etiqueta: "Más vendidas primero" }, { valor: "asc", etiqueta: "Menos vendidas primero" }]} exclusivo />
      </FormularioFiltros>
      <BotonSincronizarMercadoLibre />
    </div>

    <section aria-label="Resumen de existencia Full" className="mb-5 grid gap-2 sm:grid-cols-4">
      <div className="rounded-[1.5rem] bg-blue-50/80 p-3"><p className="text-xs text-blue-800">Productos Full</p><strong className="font-mono text-xl text-blue-900">{resumenFull._count}</strong></div>
      <div className="rounded-[1.5rem] bg-white/50 p-3"><p className="text-xs text-[var(--on-surface-variant)]">Total en Full</p><strong className="font-mono text-xl">{resumenFull._sum.existenciaFullTotal ?? "—"}</strong></div>
      <div className="rounded-[1.5rem] bg-emerald-50/80 p-3"><p className="text-xs text-emerald-800">Disponible en Full</p><strong className="font-mono text-xl text-emerald-900">{resumenFull._sum.existenciaFullDisponible ?? "—"}</strong></div>
      <div className="rounded-[1.5rem] bg-red-50/80 p-3"><p className="text-xs text-red-800">No disponible en Full</p><strong className="font-mono text-xl text-red-900">{resumenFull._sum.existenciaFullNoDisponible ?? "—"}</strong></div>
    </section>

    {!productos.length ? <section className="rounded-[2.5rem] border border-white/60 bg-white/40 p-10 text-center"><i className="bx bx-cloud-download text-5xl text-[var(--primary)]" /><h2 className="mt-3 text-2xl font-semibold">Sin productos sincronizados</h2><p className="mt-2 text-[var(--on-surface-variant)]">Pulsa Actualizar productos para obtener una copia de lectura desde Mercado Libre.</p></section> :
      <div className="grid auto-rows-[19rem] items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {productos.map(producto => {
          const local = producto.codigoVendedor ? localPorClave.get(producto.codigoVendedor) : undefined;
          const activa = producto.estado === "active";
          return <article key={producto.id} className="relative flex h-[19rem] min-w-0 flex-col overflow-visible rounded-[2rem] border border-white/60 bg-white/40 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl">
            <div className="flex min-w-0 items-start gap-3">
              <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 text-3xl text-[var(--primary)]"><ImagenProducto url={producto.imagenUrl} descripcion={producto.titulo} sizes="80px" /></div>
              <div className="min-w-0 flex-1"><h2 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5" title={producto.titulo}>{producto.titulo}</h2><p className="mt-1 truncate font-mono text-[0.68rem] text-[var(--primary)]">Clave ML: {producto.codigoVendedor ?? "No informada"}</p></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span aria-label={producto.logistica === "FULL" ? "Logística Full" : "Logística local"} className={`grid size-7 place-items-center rounded-full text-xs font-bold text-white ${producto.logistica === "FULL" ? "bg-blue-600" : "bg-emerald-600"}`}>{producto.logistica === "FULL" ? "F" : "L"}</span>
              <span className="rounded-full bg-white/65 px-2.5 py-1 text-[0.68rem] font-semibold">Existencia: {producto.existencia}</span>
              <span className="rounded-full bg-white/65 px-2.5 py-1 text-[0.68rem] font-semibold">Vendidos: {producto.vendidos}</span>
              <span className={`rounded-full px-2.5 py-1 text-[0.68rem] font-semibold ${activa ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{estadoEspanol(producto.estado)}</span>
            </div>
            <details className="group mt-auto">
              <summary className="flex cursor-pointer list-none items-center justify-center gap-1 rounded-full bg-purple-100 px-3 py-2 text-xs font-semibold text-[var(--primary)] group-open:absolute group-open:right-3 group-open:top-3 group-open:z-20 group-open:size-8 group-open:p-0"><i className="bx bx-plus text-base group-open:rotate-45" /><span className="group-open:sr-only">Mostrar nombre completo</span></summary>
              <div className="absolute inset-0 z-10 overflow-y-auto rounded-[2rem] border border-white/80 bg-[var(--surface-container-lowest)]/95 p-4 shadow-xl backdrop-blur-xl">
                <div className="flex items-start justify-between gap-12"><h3 className="text-base font-semibold leading-snug">{producto.titulo}</h3></div>
                <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
                  <div><dt className="font-semibold">Marca</dt><dd>{producto.marca ?? "No informada"}</dd></div><div><dt className="font-semibold">Modelo</dt><dd>{producto.modelo ?? "No informado"}</dd></div>
                  <div><dt className="font-semibold">GTIN oficial</dt><dd className="font-mono">{producto.gtin ?? "No informado"}</dd></div><div><dt className="font-semibold">Condición</dt><dd>{condicionEspanol(producto.condicion)}</dd></div>
                  <div><dt className="font-semibold">Publicación</dt><dd className="font-mono">{producto.publicacionId}{producto.variacionId ? ` · ${producto.variacionId}` : ""}</dd></div><div><dt className="font-semibold">Ventas acumuladas</dt><dd>{producto.vendidos}</dd></div>
                  <div className="sm:col-span-2"><dt className="font-semibold">Coincidencia en TUFIS</dt><dd>{local ? <Link href={`/productos/${local.id}/editar`} className="text-[var(--primary)] hover:underline">{local.clave} · {local.descripcion} · Existencia local: {local.existencia}</Link> : "Sin coincidencia exacta por Clave"}</dd></div>
                  {producto.enlacePublicacion && <div className="sm:col-span-2"><a href={producto.enlacePublicacion} target="_blank" rel="noreferrer" className="font-semibold text-[var(--primary)] hover:underline">Abrir publicación en Mercado Libre <i className="bx bx-link-external" /></a></div>}
                </dl>
              </div>
            </details>
          </article>;
        })}
      </div>}
    <PaginacionCuenta pagina={pagina} total={total} ruta="/cuenta/productos" limite={porPagina} query={query} />
  </PaginaCuenta>;
}
