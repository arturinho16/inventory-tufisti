"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const enlaces = [
  ["/inventario", "Inventario", "bx-package"], ["/productos/nuevo", "Nuevo producto", "bx-plus-circle"],
  ["/ubicaciones", "Ubicaciones", "bx-map-pin"], ["/ubicaciones/registradas", "Ubicaciones registradas", "bx-list-ul"],
  ["/codigos-universales", "Códigos universales", "bx-barcode"], ["/etiquetas", "Etiquetas", "bx-printer"],
  ["/automatizacion", "Importación de productos", "bx-import"], ["/paralelo/nuevo", "Nuevo Paralelo Visual", "bx-slider-alt"],
  ["/paralelo/registros", "Paralelo Visual", "bx-layer"], ["/paralelo/buscar", "Smart Match", "bx-search-alt"],
  ["/cuenta/publicaciones", "Cuenta de Mercado Libre", "bx-user-circle"], ["/configuracion", "Configuración", "bx-cog"],
] as const;

export function NavegacionMovil() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  return <div className="fixed inset-x-4 bottom-4 z-40 lg:hidden">
    {visible && <nav aria-label="Navegación móvil" className="mb-2 grid max-h-[55vh] grid-cols-4 gap-2 overflow-y-auto rounded-[2rem] border border-white/60 bg-white/85 p-3 shadow-2xl backdrop-blur-xl">{enlaces.map(([href, etiqueta, icono]) => { const activo = pathname === href || (href !== "/inventario" && pathname.startsWith(`${href}/`)); return <Link key={href} aria-label={etiqueta} title={etiqueta} href={href} className={`grid min-h-14 place-items-center rounded-2xl ${activo ? "bg-[var(--primary)] text-white" : "bg-white/45 text-[var(--on-surface-variant)]"}`}><i className={`bx ${icono} text-xl`} /><span className="sr-only">{etiqueta}</span></Link>; })}</nav>}
    <button type="button" onClick={() => setVisible(actual => !actual)} aria-expanded={visible} aria-label={visible ? "Ocultar menú móvil" : "Mostrar menú móvil"} className="ml-auto grid size-12 place-items-center rounded-full bg-[var(--primary)] text-2xl text-white shadow-xl"><i className={`bx ${visible ? "bx-x" : "bx-menu"}`} /></button>
  </div>;
}
