"use client";

import { useEffect } from "react";

export const CLAVE_RETORNO_EDICION = "tufis-retorno-edicion";

export function PersistenciaNavegacion() {
  useEffect(() => {
    const recordar = (evento: MouseEvent) => {
      const enlace = (evento.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!enlace) return;
      const destino = new URL(enlace.href, window.location.href);
      if (destino.origin !== window.location.origin || !destino.pathname.endsWith("/editar")) return;
      window.sessionStorage.setItem(CLAVE_RETORNO_EDICION, JSON.stringify({ destino: destino.pathname, regreso: `${window.location.pathname}${window.location.search}` }));
    };
    document.addEventListener("click", recordar, true);
    return () => document.removeEventListener("click", recordar, true);
  }, []);
  return null;
}

export function obtenerRutaRetornoEdicion(predeterminada: string) {
  try {
    const guardado = JSON.parse(window.sessionStorage.getItem(CLAVE_RETORNO_EDICION) ?? "null") as { destino?: string; regreso?: string } | null;
    if (guardado?.destino === window.location.pathname && guardado.regreso?.startsWith("/") && !guardado.regreso.startsWith("//")) return guardado.regreso;
  } catch { /* Un valor inválido no debe impedir abrir el formulario. */ }
  if (document.referrer) { const anterior = new URL(document.referrer); if (anterior.origin === window.location.origin) return `${anterior.pathname}${anterior.search}`; }
  return predeterminada;
}
