import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { FiltrosInventario } from "@/components/inventario/filtros-inventario";
import { TablaInventario } from "@/components/inventario/tabla-inventario";
import { GestorRespaldos } from "@/components/inventario/gestor-respaldos";
import { EdicionMasiva } from "@/components/inventario/edicion-masiva";
import { prisma } from "@/lib/prisma";
import { fechaDesdeHaceDosDias } from "@/lib/fechas";
import { datosMarketplace } from "@/lib/marketplaces";

export const dynamic = "force-dynamic";

function PaginacionInventario({ pagina, totalPaginas, hrefPagina }: { pagina: number; totalPaginas: number; hrefPagina: (pagina: number) => string }) {
  const inicio = Math.floor((pagina - 1) / 10) * 10 + 1; const fin = Math.min(inicio + 9, totalPaginas); const numeros = Array.from({ length: fin - inicio + 1 }, (_, indice) => inicio + indice);
  return <div className="flex flex-col items-center gap-2"><span className="text-xs">Página {pagina} de {totalPaginas}</span><nav aria-label="Paginación del inventario" className="flex max-w-full flex-wrap items-center justify-center gap-1.5">{pagina > 1 && <Link href={hrefPagina(1)} className="inline-flex h-8 items-center rounded-full bg-white/60 px-3 text-xs font-semibold">Inicio</Link>}{inicio > 1 && <Link href={hrefPagina(inicio - 1)} aria-label="Mostrar páginas anteriores" className="grid size-8 place-items-center rounded-full bg-white/60"><i className="bx bx-chevron-left" /></Link>}{numeros.map(numero => <Link key={numero} href={hrefPagina(numero)} aria-current={numero === pagina ? "page" : undefined} className={`grid size-8 place-items-center rounded-full text-xs font-semibold ${numero === pagina ? "bg-[var(--primary)] text-white" : "bg-white/60"}`}>{numero}</Link>)}{fin < totalPaginas && <Link href={hrefPagina(fin + 1)} aria-label="Mostrar páginas siguientes" className="grid size-8 place-items-center rounded-full bg-[var(--primary)] text-white"><i className="bx bx-chevron-right" /></Link>}{pagina < totalPaginas && <Link href={hrefPagina(totalPaginas)} className="inline-flex h-8 items-center rounded-full bg-white/60 px-3 text-xs font-semibold">Última</Link>}</nav></div>;
}

export default async function Inventario({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const valor = (clave: string) => typeof params[clave] === "string" ? params[clave] : "";
  const valores = (clave: string) => Array.isArray(params[clave]) ? params[clave] : typeof params[clave] === "string" && params[clave] ? [params[clave]] : [];
  const busqueda = valor("buscar").trim();
  const recientes = valor("recientes") === "1";
  const desdeHaceDosDias = fechaDesdeHaceDosDias();
  const lineas = valores("linea"), marcas = valores("marca"), modelos = valores("modelo"), tipos = valores("tipo"), tamanos = valores("tamano");
  const porPagina = 10;
  const paginaSolicitada = Number.parseInt(valor("pagina"), 10);
  const paginaBase = Number.isFinite(paginaSolicitada) ? Math.max(paginaSolicitada, 1) : 1;
  const where: Prisma.ProductoWhereInput = {
    ...(busqueda ? { OR: ["clave", "descripcion", "modelo", "codigoUniversal", "claveMLFull"].map((campo) => ({ [campo]: { contains: busqueda, mode: "insensitive" } })) } : {}),
    ...(lineas.length ? { linea: { nombre: { in: lineas } } } : {}),
    ...(marcas.length ? { marca: { nombre: { in: marcas } } } : {}),
    ...(modelos.length ? { modelo: { in: modelos } } : {}),
    ...(tipos.length ? { tipoProducto: { nombre: { in: tipos } } } : {}),
    ...(tamanos.length ? { especificacionPantalla: { diagonalPulgadas: { in: tamanos } } } : {}),
    ...(recientes ? { creadoEn: { gte: desdeHaceDosDias } } : {}),
  };
  const [totalFiltrado, totalProductos, catalogoLineas, catalogoMarcas, catalogoTipos, catalogoModelos, catalogoTamanos, catalogoUbicaciones, productosEdicion] = await Promise.all([
    prisma.producto.count({ where }),
    prisma.producto.count(),
    prisma.linea.findMany({ orderBy: { nombre: "asc" }, select: { id: true, clave: true, nombre: true } }),
    prisma.marca.findMany({ orderBy: { nombre: "asc" }, select: { id: true, clave: true, nombre: true } }),
    prisma.tipoProducto.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    prisma.producto.findMany({ distinct: ["modelo"], orderBy: { modelo: "asc" }, select: { modelo: true } }),
    prisma.especificacionPantalla.findMany({ distinct: ["diagonalPulgadas"], orderBy: { diagonalPulgadas: "asc" }, select: { diagonalPulgadas: true } }),
    prisma.ubicacion.findMany({ orderBy: [{ marketplace: "asc" }, { almacen: "asc" }], select: { id: true, almacen: true, cuentaAsociada: true, marketplace: true } }),
    prisma.producto.findMany({ where, orderBy: [{ creadoEn: "asc" }, { clave: "asc" }], take: 5000, select: { id: true, clave: true, descripcion: true } }),
  ]);
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrado / porPagina));
  const pagina = Math.min(paginaBase, totalPaginas);
  const registros = await prisma.producto.findMany({
    where, orderBy: [{ creadoEn: "asc" }, { clave: "asc" }], skip: (pagina - 1) * porPagina, take: porPagina,
    select: { id: true, clave: true, descripcion: true, imagenUrl: true, existencia: true, modelo: true, color: true, claveMLFull: true, codigoUniversal: true, linea: { select: { nombre: true } }, marca: { select: { nombre: true } }, tipoProducto: { select: { nombre: true } }, ubicaciones: { select: { almacen: true, cuentaAsociada: true, marketplace: true }, orderBy: [{ marketplace: "asc" }, { cuentaAsociada: "asc" }] } },
  });
  const productos = registros.map((producto) => ({ ...producto, imagenUrl: producto.imagenUrl ?? undefined, color: producto.color ?? "—", claveMLFull: producto.claveMLFull ?? "—", codigoUniversal: producto.codigoUniversal ?? "—", linea: producto.linea.nombre, marca: producto.marca.nombre, tipoProducto: producto.tipoProducto.nombre as "Teléfono" | "Cristal templado" | "Otro" }));
  const hrefPagina = (destino: number) => {
    const parametros = new URLSearchParams();
    if (busqueda) parametros.set("buscar", busqueda);
    lineas.forEach((linea) => parametros.append("linea", linea)); marcas.forEach((marca) => parametros.append("marca", marca)); modelos.forEach((modelo) => parametros.append("modelo", modelo)); tipos.forEach((tipo) => parametros.append("tipo", tipo)); tamanos.forEach((tamano) => parametros.append("tamano", tamano));
    if (recientes) parametros.set("recientes", "1");
    parametros.set("pagina", String(destino)); return `/inventario?${parametros.toString()}`;
  };
  const editorMasivo = <EdicionMasiva productos={productosEdicion} lineas={catalogoLineas.map(({ id, nombre }) => ({ id, nombre }))} marcas={catalogoMarcas.map(({ id, nombre }) => ({ id, nombre }))} tipos={catalogoTipos.map(({ id, nombre }) => ({ id, nombre }))} ubicaciones={catalogoUbicaciones.map(ubicacion => ({ id: ubicacion.id, nombre: ubicacion.almacen, detalle: `${ubicacion.cuentaAsociada} · ${datosMarketplace(ubicacion.marketplace).abreviatura}` }))} />;

  return <main className="px-4 pb-28 pt-8 sm:px-8 lg:pb-10 xl:px-12">
    <section className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-[var(--primary)]">Inventarios y catálogos</p><h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Inventario general</h1><p className="mt-2 text-[var(--on-surface-variant)]">Consulta existencias y encuentra cualquier producto rápidamente.</p></div><div className="flex flex-col gap-3 sm:flex-row">{editorMasivo}<GestorRespaldos marcas={catalogoMarcas} lineas={catalogoLineas} /><Link href="/productos/nuevo" className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] px-6 py-3 font-semibold text-white shadow-lg hover:brightness-110"><i className="bx bx-plus text-xl" />Nuevo producto</Link></div></section>
    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/45 px-4 py-2 text-sm text-[var(--on-surface-variant)] backdrop-blur-xl"><i className="bx bx-package text-lg text-[var(--primary)]" /><strong className="text-[var(--on-surface)]">{totalProductos.toLocaleString("es-MX")}</strong> productos registrados</div>
    <section className="overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl"><FiltrosInventario busqueda={busqueda} lineas={lineas} marcas={marcas} modelos={modelos} tipos={tipos} tamanos={tamanos} recientes={recientes} opcionesLineas={catalogoLineas.map(({ nombre }) => nombre)} opcionesMarcas={catalogoMarcas.map(({ nombre }) => nombre)} opcionesModelos={catalogoModelos.map(({ modelo }) => modelo)} opcionesTipos={catalogoTipos.map(({ nombre }) => nombre)} opcionesTamanos={catalogoTamanos.map(({ diagonalPulgadas }) => diagonalPulgadas.toString())} /><TablaInventario productos={productos} /><footer className="flex flex-col items-center justify-between gap-4 border-t border-white/60 p-5 text-sm text-[var(--on-surface-variant)] sm:flex-row"><span>Mostrando {productos.length} de {totalFiltrado} productos</span><PaginacionInventario pagina={pagina} totalPaginas={totalPaginas} hrefPagina={hrefPagina} /></footer></section>
  </main>;
}
