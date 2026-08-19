import { createHash } from "node:crypto";
import { sincronizarPublicacionMercadoLibre } from "@/actions/mercadolibre";
import type { OrdenMercadoLibre } from "@/lib/mercadolibre/datos";
import { consultarMercadoLibre } from "@/lib/mercadolibre/consultas";
import { prisma } from "@/lib/prisma";

export type NotificacionEntranteMercadoLibre = { _id?: string; resource: string; user_id: string | number; topic: string; application_id: string | number; attempts?: number; sent?: string; received?: string };
const fechaValida = (valor?: string | null) => { if (!valor) return null; const fecha = new Date(valor); return Number.isNaN(fecha.getTime()) ? null : fecha; };
const identificador = (n: NotificacionEntranteMercadoLibre) => n._id?.trim() || createHash("sha256").update(`${n.application_id}|${n.user_id}|${n.topic}|${n.resource}|${n.sent ?? ""}`).digest("hex");

async function guardarOrden(cuentaId: string, orden: OrdenMercadoLibre) {
  const partidas = (orden.order_items ?? []).map(partida => ({ publicacionId: partida.item.id, variacionId: partida.item.variation_id ? String(partida.item.variation_id) : "", titulo: partida.item.title, cantidad: partida.quantity, precioUnitario: partida.unit_price }));
  const datos = { estado: orden.status, fechaCreacion: new Date(orden.date_created), fechaCierre: fechaValida(orden.date_closed), importeTotal: orden.total_amount, moneda: orden.currency_id, sincronizadaEn: new Date() };
  await prisma.ventaMercadoLibre.upsert({
    where: { cuentaId_ordenId: { cuentaId, ordenId: String(orden.id) } },
    create: { cuentaId, ordenId: String(orden.id), ...datos, partidas: { create: partidas } },
    update: { ...datos, partidas: { deleteMany: {}, create: partidas } },
  });
}

export async function sincronizarOrdenMercadoLibre(cuenta: { id: string; usuarioMercadoLibreId: string; apodo: string | null; sitioId: string | null }, recurso: string) {
  if (!/^\/orders\/\d+$/.test(recurso)) throw new Error("El recurso de venta no es válido.");
  const orden = await consultarMercadoLibre<OrdenMercadoLibre>(cuenta.id, recurso);
  await guardarOrden(cuenta.id, orden);
  const publicaciones = [...new Set((orden.order_items ?? []).map(partida => partida.item.id))];
  await Promise.all(publicaciones.map(publicacionId => sincronizarPublicacionMercadoLibre(cuenta, publicacionId)));
  return { ordenId: String(orden.id), publicaciones: publicaciones.length };
}

export async function procesarNotificacionMercadoLibre(notificacion: NotificacionEntranteMercadoLibre) {
  const usuarioId = String(notificacion.user_id);
  const cuenta = await prisma.cuentaMercadoLibre.findUnique({ where: { usuarioMercadoLibreId: usuarioId }, select: { id: true, usuarioMercadoLibreId: true, apodo: true, sitioId: true } });
  const evento = await prisma.notificacionMercadoLibre.upsert({
    where: { identificador: identificador(notificacion) },
    create: { identificador: identificador(notificacion), cuentaId: cuenta?.id, tema: notificacion.topic, recurso: notificacion.resource, aplicacionId: String(notificacion.application_id), usuarioId, intentos: notificacion.attempts ?? 1, payload: notificacion, enviadaEn: fechaValida(notificacion.sent), recibidaEn: fechaValida(notificacion.received) },
    update: { intentos: Math.max(1, notificacion.attempts ?? 1) },
  });
  if (evento.estado === "PROCESADA" || evento.estado === "IGNORADA") return;
  if (!cuenta) { await prisma.notificacionMercadoLibre.update({ where: { id: evento.id }, data: { estado: "IGNORADA", error: "La notificación no pertenece a una cuenta conectada.", procesadaEn: new Date() } }); return; }
  try {
    if (notificacion.topic === "items") {
      const publicacionId = notificacion.resource.match(/^\/items\/([A-Z0-9]+)$/)?.[1];
      if (!publicacionId) throw new Error("El recurso de publicación no es válido.");
      await sincronizarPublicacionMercadoLibre(cuenta, publicacionId);
    } else if (notificacion.topic === "orders_v2") {
      await sincronizarOrdenMercadoLibre(cuenta, notificacion.resource);
    } else { await prisma.notificacionMercadoLibre.update({ where: { id: evento.id }, data: { estado: "IGNORADA", procesadaEn: new Date() } }); return; }
    await prisma.notificacionMercadoLibre.update({ where: { id: evento.id }, data: { estado: "PROCESADA", error: null, procesadaEn: new Date() } });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message.slice(0, 500) : "Error inesperado al procesar la notificación.";
    await prisma.notificacionMercadoLibre.update({ where: { id: evento.id }, data: { estado: "ERROR", error: mensaje, procesadaEn: new Date() } });
  }
}
