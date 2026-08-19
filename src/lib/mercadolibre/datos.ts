import { consultarMercadoLibre, LIMITE_MERCADOLIBRE, type CuentaActivaMercadoLibre } from "./consultas";

type Paginado<T> = { results: T[]; paging: { total: number; offset: number; limit: number } };

export type PublicacionMercadoLibre = {
  id: string; title: string; status: string; price: number; currency_id: string;
  available_quantity: number; sold_quantity: number; permalink?: string;
  catalog_product_id?: string | null; thumbnail?: string;
  seller_custom_field?: string | null; user_product_id?: string | null; inventory_id?: string | null;
  condition?: string; last_updated?: string; shipping?: { logistic_type?: string | null };
  attributes?: AtributoMercadoLibre[]; pictures?: Array<{ url?: string; secure_url?: string }>;
  variations?: VariacionMercadoLibre[];
};

export type AtributoMercadoLibre = { id: string; value_name?: string | null };
export type VariacionMercadoLibre = {
  id: number; available_quantity: number; sold_quantity?: number; seller_custom_field?: string | null;
  inventory_id?: string | null; user_product_id?: string | null; attributes?: AtributoMercadoLibre[];
  attribute_combinations?: AtributoMercadoLibre[]; picture_ids?: string[];
};

export type OrdenMercadoLibre = {
  id: number; status: string; date_created: string; date_closed?: string | null;
  total_amount: number; currency_id: string; pack_id?: number | null;
  buyer?: { id?: number; nickname?: string }; shipping?: { id?: number | null };
  order_items?: Array<{ quantity: number; unit_price: number; item: { id: string; title: string; variation_id?: number | null } }>;
};

export type EnvioMercadoLibre = {
  id: number; status: string; substatus?: string; date_created?: string; last_updated?: string;
  tracking_number?: string | null; tracking_method?: string | null;
  logistic?: { type?: string; direction?: string }; receiver_address?: { city?: { name?: string }; state?: { name?: string } };
};

export type ProductoCatalogoMercadoLibre = {
  id: string; name: string; status?: string; domain_id?: string;
  pictures?: Array<{ id?: string; url?: string }>;
  attributes?: Array<{ id: string; name: string; value_name?: string | null }>;
};

async function detallePublicaciones(cuentaId: string, ids: string[]) {
  if (!ids.length) return [];
  const respuestas = await consultarMercadoLibre<Array<{ code: number; body: PublicacionMercadoLibre }>>(cuentaId, `/items?ids=${encodeURIComponent(ids.join(","))}`);
  return respuestas.filter(({ code }) => code === 200).map(({ body }) => body);
}

export async function obtenerPublicaciones(cuenta: CuentaActivaMercadoLibre, pagina: number, limite = LIMITE_MERCADOLIBRE) {
  const offset = (pagina - 1) * limite;
  const busqueda = await consultarMercadoLibre<Paginado<string>>(cuenta.id, `/users/${encodeURIComponent(cuenta.usuarioMercadoLibreId)}/items/search?offset=${offset}&limit=${limite}`);
  return { datos: await detallePublicaciones(cuenta.id, busqueda.results), total: busqueda.paging.total };
}

export async function obtenerOrdenes(cuenta: CuentaActivaMercadoLibre, pagina: number) {
  const offset = (pagina - 1) * LIMITE_MERCADOLIBRE;
  return consultarMercadoLibre<Paginado<OrdenMercadoLibre>>(cuenta.id, `/orders/search?seller=${encodeURIComponent(cuenta.usuarioMercadoLibreId)}&sort=date_desc&offset=${offset}&limit=${LIMITE_MERCADOLIBRE}`);
}

export async function obtenerEnvios(cuenta: CuentaActivaMercadoLibre, pagina: number) {
  const ordenes = await obtenerOrdenes(cuenta, pagina);
  const ids = [...new Set(ordenes.results.map(orden => orden.shipping?.id).filter((id): id is number => Boolean(id)))];
  const resultados = await Promise.allSettled(ids.map(id => consultarMercadoLibre<EnvioMercadoLibre>(cuenta.id, `/shipments/${id}`)));
  return { datos: resultados.filter((r): r is PromiseFulfilledResult<EnvioMercadoLibre> => r.status === "fulfilled").map(r => r.value), totalOrdenes: ordenes.paging.total };
}

export async function obtenerProductosCatalogo(cuenta: CuentaActivaMercadoLibre, pagina: number) {
  return obtenerPublicaciones(cuenta, pagina, 15);
}

const traduccionesEstado: Record<string, string> = {
  active: "Activa", paused: "Pausada", closed: "Finalizada", under_review: "En revisión",
  confirmed: "Confirmada", payment_required: "Pago requerido", payment_in_process: "Pago en proceso",
  partially_paid: "Pago parcial", paid: "Pagada", partially_refunded: "Reembolso parcial",
  pending_cancel: "Cancelación pendiente", cancelled: "Cancelada", invalid: "Inválida",
  pending: "Pendiente", handling: "En preparación", ready_to_ship: "Lista para enviar",
  shipped: "Enviada", delivered: "Entregada", not_delivered: "No entregada",
};

const traduccionesLogistica: Record<string, string> = {
  fulfillment: "Full", cross_docking: "Colecta", drop_off: "Entrega en agencia",
  xd_drop_off: "Entrega en agencia", self_service: "Envíos Flex", custom: "Logística personalizada",
  forward: "Envío al comprador", return: "Devolución",
};

export function traducirEstadoMercadoLibre(valor?: string | null) {
  if (!valor) return "No informado";
  return traduccionesEstado[valor] ?? valor.replaceAll("_", " ").replace(/^./, letra => letra.toUpperCase());
}

export function traducirLogisticaMercadoLibre(valor?: string | null) {
  if (!valor) return "No informada";
  return traduccionesLogistica[valor] ?? valor.replaceAll("_", " ").replace(/^./, letra => letra.toUpperCase());
}
