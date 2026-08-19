import { ImagenProducto } from "@/components/productos/imagen-producto";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { generarCodigoInterno, guardarGtinOficial } from "@/actions/codigos-universales";
import { esCodigoUniversalInterno } from "@/lib/codigos-universales";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CodigosUniversales({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const valor = (clave: string) => typeof params[clave] === "string" ? params[clave] : "";
  const buscar = valor("buscar").trim();
  const paginaSolicitada = Math.max(Number.parseInt(valor("pagina"), 10) || 1, 1);
  const porPagina = 10;
  const where: Prisma.ProductoWhereInput = buscar ? { OR: [
    { clave: { contains: buscar, mode: "insensitive" } }, { descripcion: { contains: buscar, mode: "insensitive" } },
    { modelo: { contains: buscar, mode: "insensitive" } }, { codigoUniversal: { contains: buscar, mode: "insensitive" } },
  ] } : {};
  const total = await prisma.producto.count({ where });
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const pagina = Math.min(paginaSolicitada, paginas);
  const productos = await prisma.producto.findMany({
    where, orderBy: { creadoEn: "desc" }, skip: (pagina - 1) * porPagina, take: porPagina,
    select: { id: true, clave: true, descripcion: true, modelo: true, imagenUrl: true, codigoUniversal: true, linea: { select: { clave: true, nombre: true } }, marca: { select: { clave: true, nombre: true } } },
  });
  const hrefPagina = (numero: number) => `/codigos-universales?${new URLSearchParams({ ...(buscar ? { buscar } : {}), pagina: String(numero) }).toString()}`;
  const exito = valor("exito"), error = valor("error");

  return <main className="px-4 pb-28 pt-8 sm:px-8 xl:px-12">
    <header className="mb-8"><p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-[var(--primary)]">Inventarios y catálogos</p><h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Creación código universal</h1><p className="mt-2 max-w-3xl text-[var(--on-surface-variant)]">Genera identificadores internos a partir de Clave, Línea y Marca, o registra un GTIN oficial asignado por GS1.</p></header>
    <section className="mb-6 grid gap-4 lg:grid-cols-2">
      <article className="rounded-[2rem] border border-white/60 bg-white/40 p-5 backdrop-blur-xl"><h2 className="flex items-center gap-2 text-lg font-semibold"><i className="bx bx-barcode text-2xl text-[var(--primary)]" />Código universal interno</h2><p className="mt-2 text-sm text-[var(--on-surface-variant)]">Es numérico, incluye dígito verificador y se deriva de las tres claves. Sirve para operación interna; no es un GTIN registrado globalmente.</p></article>
      <article className="rounded-[2rem] border border-white/60 bg-white/40 p-5 backdrop-blur-xl"><h2 className="flex items-center gap-2 text-lg font-semibold"><i className="bx bx-world text-2xl text-[var(--primary)]" />GTIN oficial</h2><p className="mt-2 text-sm text-[var(--on-surface-variant)]">Captura aquí el número asignado por GS1. TUFIS valida longitud y dígito verificador, pero no sustituye el registro ante GS1.</p></article>
    </section>
    {exito && <p role="status" className="mb-5 rounded-2xl bg-emerald-100 p-4 font-semibold text-emerald-800"><i className="bx bx-check-circle mr-2" />{exito}</p>}
    {error && <p role="alert" className="mb-5 rounded-2xl bg-red-100 p-4 text-[var(--error)]"><i className="bx bx-error-circle mr-2" />{error}</p>}
    <form className="mb-5 flex gap-3 rounded-[2rem] border border-white/60 bg-white/40 p-4"><label className="relative min-w-0 flex-1"><span className="sr-only">Buscar producto</span><i className="bx bx-search absolute left-4 top-1/2 -translate-y-1/2 text-xl text-[var(--outline)]" /><input name="buscar" defaultValue={buscar} placeholder="Buscar por clave, modelo, descripción o código..." className="w-full rounded-full bg-white/60 py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-purple-400/50" /></label><button className="rounded-full bg-[var(--primary)] px-6 py-3 font-semibold text-white">Buscar</button></form>
    <section className="overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/40 backdrop-blur-xl">
      <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left"><thead className="bg-[var(--surface-container-high)]/90 font-mono text-xs uppercase tracking-wider text-[var(--on-surface-variant)]"><tr>{["Producto", "Origen", "Código actual", "Generar interno", "Registrar GTIN oficial"].map((titulo) => <th key={titulo} className="px-5 py-4 font-medium">{titulo}</th>)}</tr></thead><tbody>{productos.map((producto) => <tr key={producto.id} className="border-t border-white/50 align-top"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-purple-100 text-2xl text-[var(--primary)]"><ImagenProducto url={producto.imagenUrl} descripcion={producto.descripcion} sizes="56px" /></div><div><strong className="font-mono text-sm text-[var(--primary)]">{producto.clave}</strong><p className="max-w-64 font-semibold">{producto.descripcion}</p><small className="text-[var(--on-surface-variant)]">{producto.modelo}</small></div></div></td><td className="px-5 py-4 text-sm"><p><strong>Línea:</strong> {producto.linea.clave}</p><p><strong>Marca:</strong> {producto.marca.clave}</p></td><td className="px-5 py-4">{producto.codigoUniversal ? <><code className="font-mono font-semibold">{producto.codigoUniversal}</code><span className="mt-1 block text-xs text-[var(--on-surface-variant)]">{esCodigoUniversalInterno(producto.codigoUniversal) ? "Interno" : "GTIN/código capturado"}</span></> : <span className="text-[var(--on-surface-variant)]">Sin código</span>}</td><td className="px-5 py-4"><form action={generarCodigoInterno}><input type="hidden" name="productoId" value={producto.id} /><button disabled={Boolean(producto.codigoUniversal)} className="rounded-full bg-purple-100 px-4 py-2 text-sm font-semibold text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-45">Generar</button></form></td><td className="px-5 py-4"><form action={guardarGtinOficial} className="flex gap-2"><input type="hidden" name="productoId" value={producto.id} /><input name="gtin" inputMode="numeric" pattern="[0-9]*" required placeholder="8, 12, 13 o 14 dígitos" className="min-w-52 rounded-full bg-white/70 px-4 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-purple-400/50" /><button aria-label={`Guardar GTIN de ${producto.clave}`} className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-white"><i className="bx bx-save" /></button></form></td></tr>)}</tbody></table></div>
      {!productos.length && <div className="p-10 text-center"><i className="bx bx-search-alt text-5xl text-[var(--outline)]" /><h2 className="mt-3 text-xl font-semibold">No encontramos productos</h2></div>}
      <footer className="flex flex-col items-center justify-between gap-4 border-t border-white/60 p-5 text-sm text-[var(--on-surface-variant)] sm:flex-row"><span>Mostrando {productos.length} de {total} productos</span><nav aria-label="Paginación de códigos" className="flex gap-2">{pagina > 1 && <Link href={hrefPagina(pagina - 1)} className="grid size-10 place-items-center rounded-full bg-white/60" aria-label="Página anterior"><i className="bx bx-chevron-left" /></Link>}{Array.from({ length: paginas }, (_, indice) => indice + 1).map((numero) => <Link key={numero} href={hrefPagina(numero)} aria-current={numero === pagina ? "page" : undefined} className={`grid size-10 place-items-center rounded-full ${numero === pagina ? "bg-[var(--primary)] text-white" : "bg-white/60"}`}>{numero}</Link>)}{pagina < paginas && <Link href={hrefPagina(pagina + 1)} className="grid size-10 place-items-center rounded-full bg-white/60" aria-label="Página siguiente"><i className="bx bx-chevron-right" /></Link>}</nav></footer>
    </section>
  </main>;
}
