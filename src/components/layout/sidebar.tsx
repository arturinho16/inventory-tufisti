import Link from "next/link";

const enlaces = [
  ["/inventario", "bx-package", "Inventario"], ["/productos/nuevo", "bx-plus-circle", "Nuevo producto"],
  ["/catalogos#lineas", "bx-category", "Líneas"], ["/catalogos#marcas", "bx-purchase-tag", "Marcas"],
  ["/catalogos#tipos-producto", "bx-cube", "Tipos de producto"],
  ["/paralelo/nuevo", "bx-slider-alt", "Nuevo registro técnico"],
  ["/paralelo/registros", "bx-layer", "Registros técnicos"], ["/paralelo/buscar", "bx-search-alt", "Buscar cristal"],
] as const;

export function Sidebar() {
  return <aside className="hidden min-h-screen w-72 shrink-0 flex-col border-r border-white/60 bg-white/40 px-6 py-8 backdrop-blur-xl lg:flex"><Link href="/inventario" className="mb-12 flex items-center gap-3 rounded-2xl"><span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-container)] text-2xl text-white shadow-lg"><i className="bx bx-cube-alt" /></span><span><strong className="block text-2xl text-[var(--primary)]">TUFIS</strong><small className="font-mono uppercase tracking-widest text-[var(--on-surface-variant)]">Gestión tecnológica</small></span></Link><nav aria-label="Navegación principal" className="space-y-2">{enlaces.map(([href, icono, texto], indice) => <Link key={href} href={href} className={`flex items-center gap-3 rounded-full px-5 py-3 font-semibold ${indice === 0 ? "bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] text-white shadow-lg" : "text-[var(--on-surface-variant)] hover:bg-white/50"}`}><i className={`bx ${icono} text-xl`} />{texto}</Link>)}</nav><div className="mt-auto space-y-2"><button className="flex w-full items-center gap-3 rounded-full px-5 py-3 text-[var(--on-surface-variant)] hover:bg-white/50"><i className="bx bx-cog text-xl" />Configuración</button><button className="flex w-full items-center gap-3 rounded-full px-5 py-3 text-[var(--on-surface-variant)] hover:bg-white/50"><i className="bx bx-help-circle text-xl" />Ayuda</button></div></aside>;
}
