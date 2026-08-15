"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { CuentaActivaMercadoLibre } from "@/lib/mercadolibre/consultas";

type Enlace = readonly [href: string, icono: string, texto: string];

const grupos: Array<{ titulo: string; icono: string; rutas: Enlace[] }> = [
  {
    titulo: "Inventario", icono: "bx-package", rutas: [
      ["/inventario", "bx-package", "Productos"], ["/productos/nuevo", "bx-plus-circle", "Nuevo producto"],
      ["/catalogos#lineas", "bx-category", "Líneas"], ["/catalogos#marcas", "bx-purchase-tag", "Marcas"],
      ["/catalogos#tipos-producto", "bx-cube", "Tipos de producto"], ["/ubicaciones", "bx-map-pin", "Ubicaciones"], ["/ubicaciones/registradas", "bx-list-ul", "Ubicaciones registradas"], ["/codigos-universales", "bx-barcode", "Código universal"],
      ["/etiquetas", "bx-printer", "Diseño e impresión de etiquetas"],
    ]
  },
  {
    titulo: "Importación de productos", icono: "bx-import", rutas: [
      ["/automatizacion/importar", "bx-images", "Importación por lotes"], ["/automatizacion/importar-url", "bx-link", "Importación por lote y URL"], ["/automatizacion/fichas-b", "bx-layer-plus", "Migración de fichas B"], ["/automatizacion/fichas-abc", "bx-layer", "Fichas técnicas A, B y C"],
    ]
  },
  {
    titulo: "Registros técnicos", icono: "bx-layer", rutas: [
      ["/paralelo/registros", "bx-layer", "Paralelo Visual"], ["/paralelo/nuevo", "bx-slider-alt", "Nuevo Paralelo Visual"], ["/paralelo/buscar", "bx-search-alt", "Smart Match"],
    ]
  },
];

function rutaActiva(pathname: string, href: string, hash = "") {
  const ruta = href.split("#")[0];
  if (href.includes("#")) return pathname === ruta && hash === `#${href.split("#")[1]}`;
  if (ruta === "/inventario" || ruta === "/catalogos" || ruta === "/etiquetas" || ruta === "/codigos-universales" || ruta === "/ubicaciones") return pathname === ruta;
  return pathname === ruta || pathname.startsWith(`${ruta}/`);
}

function EnlaceSidebar({ enlace, pathname, hash, contraido }: { enlace: Enlace; pathname: string; hash: string; contraido: boolean }) {
  const [href, icono, texto] = enlace; const activo = rutaActiva(pathname, href, hash);
  return <Link href={href} title={contraido ? texto : undefined} aria-label={contraido ? texto : undefined} aria-current={activo ? "page" : undefined} className={`flex items-center gap-3 rounded-full py-3 text-sm font-semibold transition ${contraido ? "justify-center px-3" : "px-4"} ${activo ? "bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] text-white shadow-lg" : "text-[var(--on-surface-variant)] hover:bg-white/70"}`}><i className={`bx ${icono} text-lg`} />{!contraido && <span className="min-w-0">{texto}</span>}</Link>;
}

function Grupo({ titulo, icono, rutas, pathname, hash, contraido }: { titulo: string; icono: string; rutas: Enlace[]; pathname: string; hash: string; contraido: boolean }) {
  const contieneActiva = rutas.some(([href]) => rutaActiva(pathname, href, hash));
  if (contraido) return <div className="space-y-1">{rutas.map(enlace => <EnlaceSidebar key={enlace[0]} enlace={enlace} pathname={pathname} hash={hash} contraido />)}</div>;
  return <details className="group rounded-[1.75rem] open:bg-white/35" open={contieneActiva || undefined}>
    <summary className={`flex cursor-pointer list-none items-center gap-3 rounded-full px-5 py-3 font-semibold outline-none focus-visible:ring-2 focus-visible:ring-purple-400/50 ${contieneActiva ? "text-[var(--primary)]" : "text-[var(--on-surface-variant)] hover:bg-white/50"}`}><i className={`bx ${icono} text-xl`} /><span className="min-w-0 flex-1">{titulo}</span><i className="bx bx-chevron-down text-xl transition-transform group-open:rotate-180" /></summary>
    <div className="space-y-1 px-3 pb-3">{rutas.map(enlace => <EnlaceSidebar key={enlace[0]} enlace={enlace} pathname={pathname} hash={hash} contraido={false} />)}</div>
  </details>;
}

export function NavegacionSidebar({ cuenta }: { cuenta: CuentaActivaMercadoLibre | null }) {
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  const [contraido, setContraido] = useState(false);
  useEffect(() => {
    const actualizar = () => setHash(window.location.hash);
    actualizar(); window.addEventListener("hashchange", actualizar);
    return () => window.removeEventListener("hashchange", actualizar);
  }, [pathname]);
  useEffect(() => { const tarea = window.setTimeout(() => setContraido(window.localStorage.getItem("tufis-menu-lateral-contraido") === "1"), 0); return () => window.clearTimeout(tarea); }, []);
  const alternarMenu = () => setContraido(actual => {
    const siguiente = !actual;
    window.localStorage.setItem("tufis-menu-lateral-contraido", siguiente ? "1" : "0");
    return siguiente;
  });
  const cuentaRutas: Enlace[] = [["/cuenta/publicaciones", "bx-store-alt", "Publicaciones"], ["/cuenta/orders-v2", "bx-receipt", "Ventas"], ["/cuenta/envios", "bx-package", "Envíos"], ["/cuenta/productos", "bx-cube", "Productos"]];
  const configuracion: Enlace[] = [["/configuracion", "bx-grid-alt", "Panel general"], ["/configuracion/respaldos", "bx-time-five", "Respaldos"], ["/configuracion/mercadolibre", "bx-store", "Mercado Libre"]];
  return <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col overflow-y-auto border-r border-white/60 bg-white/40 py-8 backdrop-blur-xl transition-[width,padding] lg:flex ${contraido ? "w-20 px-3" : "w-72 px-6"}`}>
    <div className={`mb-8 flex items-center ${contraido ? "flex-col gap-3" : "justify-between gap-3"}`}><Link href="/inventario" className="flex items-center gap-3 rounded-2xl"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-container)] text-2xl text-white shadow-lg"><i className="bx bx-cube-alt" /></span>{!contraido && <span><strong className="block text-2xl text-[var(--primary)]">TUFIS</strong><small className="font-mono uppercase tracking-widest text-[var(--on-surface-variant)]">Gestión tecnológica</small></span>}</Link><button type="button" onClick={alternarMenu} aria-expanded={!contraido} aria-label={contraido ? "Mostrar menú lateral" : "Ocultar menú lateral"} title={contraido ? "Mostrar menú" : "Ocultar menú"} className="grid size-9 shrink-0 place-items-center rounded-full bg-white/70 text-xl text-[var(--primary)]"><i className={`bx ${contraido ? "bx-chevron-right" : "bx-chevron-left"}`} /></button></div>
    <nav aria-label="Navegación principal" className="space-y-2">
      {grupos.map(grupo => <Grupo key={grupo.titulo} {...grupo} pathname={pathname} hash={hash} contraido={contraido} />)}
      {cuenta && <Grupo titulo={cuenta.apodo ?? `Usuario ${cuenta.usuarioMercadoLibreId}`} icono="bx-user-circle" rutas={cuentaRutas} pathname={pathname} hash={hash} contraido={contraido} />}
      <Grupo titulo="Configuración" icono="bx-cog" rutas={configuracion} pathname={pathname} hash={hash} contraido={contraido} />
    </nav>
    <button aria-label={contraido ? "Ayuda" : undefined} title={contraido ? "Ayuda" : undefined} className={`mt-4 flex w-full items-center gap-3 rounded-full py-3 text-[var(--on-surface-variant)] hover:bg-white/50 ${contraido ? "justify-center px-3" : "px-5"}`}><i className="bx bx-help-circle text-xl" />{!contraido && "Ayuda"}</button>
  </aside>;
}
