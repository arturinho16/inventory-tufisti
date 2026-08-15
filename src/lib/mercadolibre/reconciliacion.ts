import { sincronizarProductosMercadoLibre } from "@/actions/mercadolibre";
import { consultarMercadoLibre, obtenerCuentaMercadoLibre } from "@/lib/mercadolibre/consultas";
import type { OrdenMercadoLibre } from "@/lib/mercadolibre/datos";
import { sincronizarOrdenMercadoLibre } from "@/lib/mercadolibre/notificaciones";

let ejecucionActiva: Promise<unknown> | null = null;

async function incremental() {
  const cuenta = await obtenerCuentaMercadoLibre();
  if (!cuenta) return { modo: "incremental", omitida: true, motivo: "Sin cuenta conectada." };
  const desde = new Date(Date.now() - 30 * 60_000).toISOString();
  const recurso = `/orders/search?seller=${encodeURIComponent(cuenta.usuarioMercadoLibreId)}&order.date_last_updated.from=${encodeURIComponent(desde)}&sort=date_desc&offset=0&limit=50`;
  const resultado = await consultarMercadoLibre<{ results: OrdenMercadoLibre[] }>(cuenta.id, recurso);
  const ventas = await Promise.all(resultado.results.map(orden => sincronizarOrdenMercadoLibre(cuenta, `/orders/${orden.id}`)));
  return { modo: "incremental", ventas: ventas.length, publicaciones: ventas.reduce((total, venta) => total + venta.publicaciones, 0) };
}

async function completa() {
  const resultado = await sincronizarProductosMercadoLibre();
  return { modo: "completa", ...resultado };
}

export async function ejecutarReconciliacionMercadoLibre(modo: "incremental" | "completa") {
  if (ejecucionActiva) return { modo, omitida: true, motivo: "Ya existe una sincronización en curso." };
  ejecucionActiva = modo === "completa" ? completa() : incremental();
  try { return await ejecucionActiva; }
  finally { ejecucionActiva = null; }
}
