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
  const cristales: Prisma.ProductoWhereInput = { tipoProducto: { categoria: "CRISTAL_TEMPLADO" } };
  const where: Prisma.ProductoWhereInput = {
    ...cristales,
    ...(buscar ? { OR: [
      { clave: { contains: buscar, mode: "insensitive" as const } },
      { modelo: { contains: buscar, mode: "insensitive" as const } },
      { descripcion: { contains: buscar, mode: "insensitive" as const } },
    ] } : {}),
    ...(recientes ? { creadoEn: { gte: desdeHaceDosDias } } : {}),
    ...(marcas.length ? { marca: { nombre: { in: marcas } } } : {}),
    ...(modelos.length ? { modelo: { in: modelos } } : {}),
    ...(tamanos.length ? { especificacionPantalla: { diagonalPulgadas: { in: tamanos } } } : {}),
  };

  const [total, totalCristales, totalConFicha, totalConFtf, opcionesMarcas, opcionesModelos, opcionesTamanos] = await Promise.all([
    prisma.producto.count({ where }),
    prisma.producto.count({ where: cristales }),
    prisma.producto.count({ where: { ...cristales, especificacionPantalla: { isNot: null } } }),
    prisma.producto.count({ where: { ...cristales, fichaTecnicaFull: { isNot: null } } }),
    prisma.marca.findMany({ where: { productos: { some: cristales } }, orderBy: { nombre: "asc" }, select: { nombre: true } }),
    prisma.producto.findMany({ where: cristales, distinct: ["modelo"], orderBy: { modelo: "asc" }, select: { modelo: true } }),
    prisma.especificacionPantalla.findMany({ where: { producto: cristales }, distinct: ["diagonalPulgadas"], orderBy: { diagonalPulgadas: "asc" }, select: { diagonalPulgadas: true } }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const pagina = Math.min(paginaSolicitada, paginas);
  const datos = await prisma.producto.findMany({
    where,
    take: porPagina,
    skip: (pagina - 1) * porPagina,
    orderBy: [{ creadoEn: "asc" }, { clave: "asc" }],
    include: { linea: true, marca: true, tipoProducto: true, especificacionPantalla: true, fichaTecnicaB: true, fichaTecnicaC: true, fichaTecnicaFull: true },
  });
  const registros = datos.map((dato) => {
    const ficha = dato.especificacionPantalla;
    return ({
    id: dato.id, especificacionId: ficha?.id ?? null, clave: dato.clave, descripcion: dato.descripcion, imagenUrl: dato.imagenUrl,
    modelo: dato.modelo, linea: dato.linea.nombre, marca: dato.marca.nombre,
    tipoProducto: dato.tipoProducto.nombre, existencia: dato.existencia, color: dato.color,
    tecnologia: ficha?.tecnologia ?? null, tipoFormaPantalla: ficha?.tipoFormaPantalla ?? null, tipoFormaOtro: ficha?.tipoFormaOtro ?? null,
    diagonalMm: ficha?.diagonalMm.toString() ?? null, diagonalPulgadas: ficha?.diagonalPulgadas.toString() ?? null,
    anchoDisplayMm: ficha?.anchoDisplayMm.toString() ?? null, altoDisplayMm: ficha?.altoDisplayMm.toString() ?? null, aspectRatio: ficha?.aspectRatio ?? null,
    resolucionAnchoPx: ficha?.resolucionAnchoPx ?? null, resolucionAltoPx: ficha?.resolucionAltoPx ?? null, densidadPpi: ficha?.densidadPpi ?? null,
    profundidadColor: ficha?.profundidadColor ?? null, areaDisplayPorcentaje: ficha?.areaDisplayPorcentaje?.toString() ?? null,
    cristalFrontal: ficha?.cristalFrontal ?? null, refrescoHz: ficha?.refrescoHz ?? null,
    fichaB: dato.fichaTecnicaB ? Object.fromEntries(Object.entries(dato.fichaTecnicaB).filter(([clave]) => !["id", "productoId", "fuenteDf", "fuenteSes", "modeloOpenAI", "analizadoEn", "creadoEn", "actualizadoEn"].includes(clave)).map(([clave, valor]) => [clave, typeof valor === "object" && valor !== null && "toString" in valor && !Array.isArray(valor) ? valor.toString() : valor])) as unknown as RegistroTecnico["fichaB"] : null,
    fichaC: dato.fichaTecnicaC ? Object.fromEntries(Object.entries(dato.fichaTecnicaC).filter(([clave]) => !["id", "productoId", "fuente", "creadoEn", "actualizadoEn"].includes(clave)).map(([clave, valor]) => [clave, typeof valor === "object" && valor !== null && "toString" in valor ? valor.toString() : valor])) as RegistroTecnico["fichaC"] : null,
    ftf: dato.fichaTecnicaFull ? {
      proveedor: dato.fichaTecnicaFull.proveedor,
      url: dato.fichaTecnicaFull.urlFuente,
      validacion: dato.fichaTecnicaFull.validacion,
      secciones: dato.fichaTecnicaFull.secciones as RegistroTecnico["ftf"] extends { secciones: infer S } ? S : never,
    } : null,
  }); });
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
      <section className="mb-6 flex flex-wrap gap-3" aria-label="Resumen de cristales templados">
        <p className="rounded-full bg-white/60 px-5 py-2.5 text-sm"><strong className="font-mono text-[var(--primary)]">{totalCristales}</strong> cristales templados registrados</p>
        <p className="rounded-full bg-white/60 px-5 py-2.5 text-sm"><strong>{totalConFicha}</strong> con parámetros de pantalla</p>
        <p className="rounded-full bg-white/60 px-5 py-2.5 text-sm"><strong>{totalConFtf}</strong> con FTF asociada</p>
      </section>
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
        <span>Mostrando {registros.length} de {total} cristales templados</span>
        <nav aria-label="Paginación de registros" className="flex flex-wrap justify-center gap-2">
          {pagina > 1 && <Link href={hrefPagina(pagina - 1)} aria-label="Página anterior" className="grid size-10 place-items-center rounded-full bg-white/60"><i className="bx bx-chevron-left" /></Link>}
          {Array.from({ length: paginas }, (_, indice) => indice + 1).map((numero) => <Link key={numero} href={hrefPagina(numero)} aria-current={numero === pagina ? "page" : undefined} className={`grid size-10 place-items-center rounded-full font-semibold ${numero === pagina ? "bg-[var(--primary)] text-white" : "bg-white/60"}`}>{numero}</Link>)}
          {pagina < paginas && <Link href={hrefPagina(pagina + 1)} aria-label="Página siguiente" className="grid size-10 place-items-center rounded-full bg-white/60"><i className="bx bx-chevron-right" /></Link>}
        </nav>
      </footer>
    </main>
  );
}
