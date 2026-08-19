import type { Prisma } from "@/generated/prisma/client";
import { FormularioFiltros, GrupoChecks } from "@/components/inventario/filtros-inventario";
import { PaginaCuenta, PaginacionCuenta } from "@/components/mercadolibre/pagina-cuenta";
import { ImagenProducto } from "@/components/productos/imagen-producto";
import { formarFechaMercadoLibre, obtenerCuentaMercadoLibre, paginaSegura } from "@/lib/mercadolibre/consultas";
import { traducirEstadoMercadoLibre } from "@/lib/mercadolibre/datos";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const POR_PAGINA = 15;

function fechaFiltro(valor: string, finDelDia = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return undefined;
  const fecha = new Date(`${valor}T${finDelDia ? "23:59:59.999" : "00:00:00.000"}-06:00`);
  return Number.isNaN(fecha.getTime()) ? undefined : fecha;
}

function dinero(valor: { toString(): string } | number, moneda: string) {
  return Number(valor).toLocaleString("es-MX", { style: "currency", currency: moneda || "MXN" });
}

export default async function VentasMercadoLibre({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const cuenta = await obtenerCuentaMercadoLibre();
  const params = await searchParams;
  const valor = (clave: string) => typeof params[clave] === "string" ? params[clave] : "";
  const desde = valor("desde");
  const hasta = valor("hasta");
  const logistica = valor("logistica") === "FULL" ? "FULL" : valor("logistica") === "LOCAL" ? "LOCAL" : "";
  const paginaSolicitada = paginaSegura(valor("pagina"));

  if (!cuenta) return <PaginaCuenta cuenta={null} titulo="Ventas" descripcion="Productos vendidos en Mercado Libre."><span /></PaginaCuenta>;

  const publicacionesLogistica = logistica ? await prisma.productoMercadoLibre.findMany({
    where: { cuentaId: cuenta.id, logistica }, distinct: ["publicacionId"], select: { publicacionId: true },
  }) : [];
  const idsLogistica = publicacionesLogistica.map(({ publicacionId }) => publicacionId);
  const inicio = fechaFiltro(desde), fin = fechaFiltro(hasta, true);
  const filtroFecha: Prisma.DateTimeFilter = { ...(inicio ? { gte: inicio } : {}), ...(fin ? { lte: fin } : {}) };
  const where: Prisma.PartidaVentaMercadoLibreWhereInput = {
    venta: { cuentaId: cuenta.id, ...(Object.keys(filtroFecha).length ? { fechaCreacion: filtroFecha } : {}) },
    ...(logistica ? { publicacionId: { in: idsLogistica } } : {}),
  };
  const total = logistica && !idsLogistica.length ? 0 : await prisma.partidaVentaMercadoLibre.count({ where });
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const pagina = Math.min(paginaSolicitada, paginas);
  const partidas = total ? await prisma.partidaVentaMercadoLibre.findMany({
    where, include: { venta: true }, orderBy: [{ venta: { fechaCreacion: "desc" } }, { id: "asc" }], skip: (pagina - 1) * POR_PAGINA, take: POR_PAGINA,
  }) : [];
  const publicacionesIds = [...new Set(partidas.map(({ publicacionId }) => publicacionId))];
  const productos = publicacionesIds.length ? await prisma.productoMercadoLibre.findMany({
    where: { cuentaId: cuenta.id, publicacionId: { in: publicacionesIds } }, orderBy: { variacionId: "asc" },
  }) : [];
  const productoPorPartida = new Map(productos.map(producto => [`${producto.publicacionId}|${producto.variacionId}`, producto]));
  const productoPorPublicacion = new Map(productos.map(producto => [producto.publicacionId, producto]));
  const query = { ...(desde ? { desde } : {}), ...(hasta ? { hasta } : {}), ...(logistica ? { logistica } : {}) };

  return <PaginaCuenta cuenta={cuenta} titulo="Ventas" descripcion="Productos vendidos, fechas y logística de la cuenta. Información de solo lectura.">
    <FormularioFiltros className="relative z-40 mb-6 grid gap-3 rounded-[2rem] border border-white/60 bg-white/40 p-4 backdrop-blur-xl sm:grid-cols-2 xl:grid-cols-[repeat(2,minmax(10rem,1fr))_minmax(11rem,1fr)_auto]">
      <label className="rounded-2xl bg-white/45 px-4 py-2"><span className="block text-xs font-semibold text-[var(--on-surface-variant)]">Desde</span><input type="date" name="desde" defaultValue={desde} max={hasta || undefined} className="mt-1 w-full bg-transparent font-mono outline-none" /></label>
      <label className="rounded-2xl bg-white/45 px-4 py-2"><span className="block text-xs font-semibold text-[var(--on-surface-variant)]">Hasta</span><input type="date" name="hasta" defaultValue={hasta} min={desde || undefined} className="mt-1 w-full bg-transparent font-mono outline-none" /></label>
      <GrupoChecks nombre="logistica" etiqueta="Logística" seleccionados={logistica ? [logistica] : []} opciones={[{ valor: "FULL", etiqueta: "F · Full" }, { valor: "LOCAL", etiqueta: "L · Local" }]} exclusivo />
      <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] px-6 py-3 font-semibold text-white"><i className="bx bx-filter-alt" />Aplicar rango</button>
    </FormularioFiltros>
    {!partidas.length ? <section className="rounded-[2.5rem] border border-white/60 bg-white/40 p-10 text-center"><i className="bx bx-receipt text-5xl text-[var(--primary)]" /><h2 className="mt-3 text-2xl font-semibold">Sin ventas en este rango</h2><p className="mt-2 text-[var(--on-surface-variant)]">Cambia las fechas o la logística para consultar otros productos vendidos.</p></section> :
      <div className="relative z-0 grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">{partidas.map(partida => {
        const producto = productoPorPartida.get(`${partida.publicacionId}|${partida.variacionId}`) ?? productoPorPublicacion.get(partida.publicacionId);
        const esFull = producto?.logistica === "FULL";
        return <article key={partida.id} className="rounded-[2rem] border border-white/60 bg-white/40 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl">
          <div className="flex min-w-0 items-start gap-4"><div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 text-3xl text-[var(--primary)]"><ImagenProducto url={producto?.imagenUrl} descripcion={partida.titulo} sizes="96px" icono="bx-package" /></div><div className="min-w-0 flex-1"><p className="font-mono text-[0.68rem] font-semibold text-[var(--primary)]">VENTA {partida.venta.ordenId}</p><h2 className="mt-1 line-clamp-3 text-base font-semibold leading-snug" title={partida.titulo}>{partida.titulo}</h2></div></div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className={`grid size-7 place-items-center rounded-full font-bold text-white ${esFull ? "bg-blue-600" : "bg-emerald-600"}`} aria-label={esFull ? "Logística Full" : "Logística local"}>{esFull ? "F" : "L"}</span><span className="rounded-full bg-white/65 px-3 py-1.5 font-semibold">Cantidad: {partida.cantidad}</span><span className="rounded-full bg-white/65 px-3 py-1.5 font-semibold">{traducirEstadoMercadoLibre(partida.venta.estado)}</span></div>
          <div className="mt-3 flex items-end justify-between gap-3"><div><p className="text-xs text-[var(--on-surface-variant)]">Fecha de venta</p><p className="mt-1 text-sm">{formarFechaMercadoLibre(partida.venta.fechaCreacion.toISOString())}</p></div><strong className="font-mono text-sm">{dinero(Number(partida.precioUnitario) * partida.cantidad, partida.venta.moneda)}</strong></div>
          <details className="group mt-4"><summary aria-label={`Mostrar más información de ${partida.titulo}`} className="ml-auto grid size-10 cursor-pointer list-none place-items-center rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] text-xl text-white transition-transform group-open:rotate-45"><i className="bx bx-plus" /></summary><dl className="mt-3 grid gap-3 rounded-2xl bg-white/50 p-4 text-sm sm:grid-cols-2"><div><dt className="font-semibold">Publicación</dt><dd className="break-all font-mono text-xs">{partida.publicacionId}</dd></div><div><dt className="font-semibold">Variación</dt><dd className="font-mono text-xs">{partida.variacionId || "Sin variación"}</dd></div><div><dt className="font-semibold">Precio unitario</dt><dd>{dinero(partida.precioUnitario, partida.venta.moneda)}</dd></div><div><dt className="font-semibold">Total de la orden</dt><dd>{dinero(partida.venta.importeTotal, partida.venta.moneda)}</dd></div><div><dt className="font-semibold">Código ML</dt><dd className="font-mono text-xs">{producto?.codigoVendedor ?? "No informado"}</dd></div><div><dt className="font-semibold">Logística</dt><dd>{esFull ? "Full" : "Local"}</dd></div><div className="sm:col-span-2"><dt className="font-semibold">Cierre</dt><dd>{formarFechaMercadoLibre(partida.venta.fechaCierre?.toISOString())}</dd></div></dl></details>
        </article>;
      })}</div>}
    <PaginacionCuenta pagina={pagina} total={total} ruta="/cuenta/orders-v2" limite={POR_PAGINA} query={query} />
  </PaginaCuenta>;
}
