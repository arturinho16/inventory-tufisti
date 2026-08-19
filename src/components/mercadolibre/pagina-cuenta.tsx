import Link from "next/link";
import type { CuentaActivaMercadoLibre } from "@/lib/mercadolibre/consultas";

export function PaginaCuenta({ cuenta, titulo, descripcion, children, mostrarCuenta = true }: { cuenta: CuentaActivaMercadoLibre | null; titulo: string; descripcion: string; children: React.ReactNode; mostrarCuenta?: boolean }) {
  return <main data-pagina={titulo} className="min-h-[calc(100vh-5rem)] w-full px-4 pb-28 pt-8 sm:px-8 lg:pb-10 xl:px-12">
    <header className="mb-6">
      {mostrarCuenta && <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--primary)]">{cuenta?.apodo ?? "Cuenta de Mercado Libre"}</p>}
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">{titulo}</h1>
      <p className="mt-2 max-w-3xl text-[var(--on-surface-variant)]">{descripcion}</p>
    </header>
    {!cuenta ? <EstadoCuenta /> : children}
  </main>;
}

export function EstadoCuenta() {
  return <section className="rounded-[2.5rem] border border-white/60 bg-white/40 p-8 text-center backdrop-blur-xl"><i className="bx bx-unlink text-4xl text-[var(--primary)]" /><h2 className="mt-3 text-xl font-semibold">No hay una cuenta conectada</h2><p className="mt-2 text-[var(--on-surface-variant)]">Conecta Mercado Libre desde Configuración para consultar esta sección.</p><Link href="/configuracion/mercadolibre" className="mt-5 inline-flex rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] px-6 py-3 font-bold text-white">Ir a configuración</Link></section>;
}

export function ErrorConsulta({ mensaje }: { mensaje: string }) {
  return <section role="alert" className="rounded-[2rem] border border-red-200 bg-red-50/80 p-6 text-[var(--error)]"><h2 className="font-semibold">No fue posible consultar Mercado Libre</h2><p className="mt-2 text-sm">{mensaje}</p></section>;
}

export function PaginacionCuenta({ pagina, total, ruta, limite = 20, query = {} }: { pagina: number; total: number; ruta: string; limite?: number; query?: Record<string, string> }) {
  const paginas = Math.max(1, Math.ceil(total / limite));
  const paginasPorBloque = ruta === "/cuenta/productos" ? 10 : 20;
  const inicioBloque = Math.floor((pagina - 1) / paginasPorBloque) * paginasPorBloque + 1;
  const finBloque = Math.min(inicioBloque + paginasPorBloque - 1, paginas);
  const numeros = Array.from({ length: finBloque - inicioBloque + 1 }, (_, indice) => inicioBloque + indice);
  const href = (destino: number) => { const parametros = new URLSearchParams(query); parametros.set("pagina", String(destino)); return `${ruta}?${parametros}`; };
  return <div className="mt-6 flex w-full flex-col items-center gap-3">
    <p className="text-xs text-[var(--on-surface-variant)]">Página {pagina} de {paginas} · {total} registros</p>
    <nav aria-label="Paginación" className="flex max-w-full flex-wrap items-center justify-center gap-1.5">
      {ruta === "/cuenta/productos" && pagina > 1 && <Link aria-label="Ir al inicio" className="inline-flex h-8 items-center rounded-full bg-white/60 px-3 text-xs font-semibold" href={href(1)}>Inicio</Link>}
      {inicioBloque > 1 && <Link aria-label="Mostrar las páginas anteriores" title="Páginas anteriores" className="grid size-8 place-items-center rounded-full bg-white/60 text-sm" href={href(inicioBloque - 1)}><i className="bx bx-chevron-left" /></Link>}
      {numeros.map(numero => <Link key={numero} href={href(numero)} aria-current={numero === pagina ? "page" : undefined} className={`grid size-8 place-items-center rounded-full text-xs font-semibold ${numero === pagina ? "bg-[var(--primary)] text-white" : "bg-white/60"}`}>{numero}</Link>)}
      {finBloque < paginas && <Link aria-label="Mostrar las páginas siguientes" title="Páginas siguientes" className="grid size-8 place-items-center rounded-full bg-[var(--primary)] text-sm text-white" href={href(finBloque + 1)}><i className="bx bx-chevron-right" /></Link>}
      {ruta === "/cuenta/productos" && pagina < paginas && <Link aria-label="Ir a la última página" className="inline-flex h-8 items-center rounded-full bg-white/60 px-3 text-xs font-semibold" href={href(paginas)}>Última</Link>}
    </nav>
  </div>;
}
