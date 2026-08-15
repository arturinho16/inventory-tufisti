import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { BotonLimpiarFiltros, BusquedaEnVivo, FiltroUltimasAgregadas, FormularioFiltros, GrupoChecks } from "@/components/inventario/filtros-inventario";
import { ListadoRegistros, type RegistroTecnico } from "@/components/smart-match/listado-registros";
import { prisma } from "@/lib/prisma";
import { fechaDesdeHaceDosDias } from "@/lib/fechas";

export const dynamic = "force-dynamic";

export default async function RegistrosParalelo({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const valor = (clave: string) => typeof params[clave] === "string" ? params[clave] : "";
  const valores = (clave: string) => Array.isArray(params[clave]) ? params[clave] : typeof params[clave] === "string" && params[clave] ? [params[clave]] : [];
  const buscar = valor("buscar").trim();
  const recientes = valor("recientes") === "1";
  const desdeHaceDosDias = fechaDesdeHaceDosDias();
  const marcas = valores("marca"), modelos = valores("modelo"), tamanos = valores("tamano");
  const solicitada = Number.parseInt(valor("pagina"), 10);
  const paginaSolicitada = Number.isFinite(solicitada) ? Math.max(solicitada, 1) : 1;
  const porPagina = 10;
  const where: Prisma.EspecificacionPantallaWhereInput = {
    ...((buscar || recientes) ? { producto: {
      ...(buscar ? { OR: [
        { clave: { contains: buscar, mode: "insensitive" as const } },
        { modelo: { contains: buscar, mode: "insensitive" as const } },
        { descripcion: { contains: buscar, mode: "insensitive" as const } },
      ] } : {}),
      ...(recientes ? { creadoEn: { gte: desdeHaceDosDias } } : {}),
    } } : {}),
    ...(marcas.length ? { marca: { nombre: { in: marcas } } } : {}),
    ...(modelos.length ? { modelo: { in: modelos } } : {}),
    ...(tamanos.length ? { diagonalPulgadas: { in: tamanos } } : {}),
  };

  const [total, opcionesMarcas, opcionesModelos, opcionesTamanos] = await Promise.all([
    prisma.especificacionPantalla.count({ where }),
    prisma.marca.findMany({ where: { especificacionesPantalla: { some: {} } }, orderBy: { nombre: "asc" }, select: { nombre: true } }),
    prisma.especificacionPantalla.findMany({ distinct: ["modelo"], orderBy: { modelo: "asc" }, select: { modelo: true } }),
    prisma.especificacionPantalla.findMany({ distinct: ["diagonalPulgadas"], orderBy: { diagonalPulgadas: "asc" }, select: { diagonalPulgadas: true } }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const pagina = Math.min(paginaSolicitada, paginas);
  const datos = await prisma.especificacionPantalla.findMany({
    where,
    take: porPagina,
    skip: (pagina - 1) * porPagina,
    orderBy: [{ producto: { creadoEn: "asc" } }, { clave: "asc" }],
    include: { producto: { include: { linea: true, marca: true, tipoProducto: true, fichaTecnicaB: true } } },
  });
  const registros = datos.map((dato) => ({
    id: dato.id, clave: dato.producto.clave, descripcion: dato.producto.descripcion, imagenUrl: dato.producto.imagenUrl,
    modelo: dato.producto.modelo, linea: dato.producto.linea.nombre, marca: dato.producto.marca.nombre,
    tipoProducto: dato.producto.tipoProducto.nombre, existencia: dato.producto.existencia, color: dato.producto.color,
    tecnologia: dato.tecnologia, tipoFormaPantalla: dato.tipoFormaPantalla, tipoFormaOtro: dato.tipoFormaOtro,
    diagonalMm: dato.diagonalMm.toString(), diagonalPulgadas: dato.diagonalPulgadas.toString(),
    anchoDisplayMm: dato.anchoDisplayMm.toString(), altoDisplayMm: dato.altoDisplayMm.toString(), aspectRatio: dato.aspectRatio,
    resolucionAnchoPx: dato.resolucionAnchoPx, resolucionAltoPx: dato.resolucionAltoPx, densidadPpi: dato.densidadPpi,
    profundidadColor: dato.profundidadColor, areaDisplayPorcentaje: dato.areaDisplayPorcentaje.toString(),
    cristalFrontal: dato.cristalFrontal, refrescoHz: dato.refrescoHz,
    fichaB: dato.producto.fichaTecnicaB ? Object.fromEntries(Object.entries(dato.producto.fichaTecnicaB).filter(([clave]) => !["id", "productoId", "fuenteDf", "fuenteSes", "modeloOpenAI", "analizadoEn", "creadoEn", "actualizadoEn"].includes(clave)).map(([clave, valor]) => [clave, typeof valor === "object" && valor !== null && "toString" in valor && !Array.isArray(valor) ? valor.toString() : valor])) as unknown as RegistroTecnico["fichaB"] : null,
  }));
  const hrefPagina = (destino: number) => {
    const query = new URLSearchParams();
    if (buscar) query.set("buscar", buscar);
    marcas.forEach((marca) => query.append("marca", marca));
    modelos.forEach((modelo) => query.append("modelo", modelo));
    tamanos.forEach((tamano) => query.append("tamano", tamano));
    if (recientes) query.set("recientes", "1");
    query.set("pagina", String(destino));
    return `/paralelo/registros?${query.toString()}`;
  };

  return (
    <main className="px-4 pb-28 pt-8 sm:px-8 xl:px-12">
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-[var(--primary)]">Smart Match</p><h1 className="text-3xl font-bold sm:text-5xl">Registros del paralelo visual</h1><p className="mt-2 text-[var(--on-surface-variant)]">Administra las fichas técnicas utilizadas en las comparaciones.</p></div>
        <Link href="/paralelo/nuevo" className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] px-6 py-3 font-semibold text-white"><i className="bx bx-plus" />Nuevo registro técnico</Link>
      </header>
      <FormularioFiltros className="relative z-20 mb-6 grid gap-3 rounded-[2rem] border border-white/60 bg-white/40 p-4 backdrop-blur-xl sm:grid-cols-2 xl:grid-cols-[minmax(12rem,0.8fr)_repeat(4,minmax(8.5rem,0.55fr))_auto]">
        <label className="relative">
          <span className="sr-only">Buscar registros</span><i className="bx bx-search absolute left-4 top-1/2 -translate-y-1/2 text-xl text-[var(--outline)]" />
          <BusquedaEnVivo valor={buscar} placeholder="Buscar por clave, modelo o descripción..." />
        </label>
        <GrupoChecks nombre="marca" etiqueta="Marcas" seleccionados={marcas} opciones={opcionesMarcas.map(({ nombre }) => ({ valor: nombre, etiqueta: nombre }))} />
        <GrupoChecks nombre="modelo" etiqueta="Modelos" seleccionados={modelos} opciones={opcionesModelos.map(({ modelo }) => ({ valor: modelo, etiqueta: modelo }))} />
        <GrupoChecks nombre="tamano" etiqueta="T/Pantalla" seleccionados={tamanos} opciones={opcionesTamanos.map(({ diagonalPulgadas }) => ({ valor: diagonalPulgadas.toString(), etiqueta: `${diagonalPulgadas.toString()} pulgadas` }))} buscable />
        <FiltroUltimasAgregadas activo={recientes} />
        <BotonLimpiarFiltros total={marcas.length + modelos.length + tamanos.length + Number(recientes)} />
      </FormularioFiltros>
      <ListadoRegistros registros={registros} />
      <footer className="mt-7 flex flex-col items-center justify-between gap-4 text-sm text-[var(--on-surface-variant)] sm:flex-row">
        <span>Mostrando {registros.length} de {total} registros</span>
        <nav aria-label="Paginación de registros" className="flex flex-wrap justify-center gap-2">
          {pagina > 1 && <Link href={hrefPagina(pagina - 1)} aria-label="Página anterior" className="grid size-10 place-items-center rounded-full bg-white/60"><i className="bx bx-chevron-left" /></Link>}
          {Array.from({ length: paginas }, (_, indice) => indice + 1).map((numero) => <Link key={numero} href={hrefPagina(numero)} aria-current={numero === pagina ? "page" : undefined} className={`grid size-10 place-items-center rounded-full font-semibold ${numero === pagina ? "bg-[var(--primary)] text-white" : "bg-white/60"}`}>{numero}</Link>)}
          {pagina < paginas && <Link href={hrefPagina(pagina + 1)} aria-label="Página siguiente" className="grid size-10 place-items-center rounded-full bg-white/60"><i className="bx bx-chevron-right" /></Link>}
        </nav>
      </footer>
    </main>
  );
}
