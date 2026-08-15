"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { copiarImagenMercadoLibre } from "@/lib/imagenes/almacen-local";
import { consultarMercadoLibre, obtenerCuentaMercadoLibre, type CuentaActivaMercadoLibre } from "@/lib/mercadolibre/consultas";
import type { AtributoMercadoLibre, PublicacionMercadoLibre, VariacionMercadoLibre } from "@/lib/mercadolibre/datos";

const GTIN_IDS = new Set(["GTIN", "EAN", "UPC"]);

function atributo(atributos: AtributoMercadoLibre[] | undefined, ids: Set<string> | string) {
  const permitidos = typeof ids === "string" ? new Set([ids]) : ids;
  return atributos?.find(item => permitidos.has(item.id))?.value_name?.trim() || null;
}

function codigoVendedor(item: PublicacionMercadoLibre, variacion?: VariacionMercadoLibre) {
  return atributo(variacion?.attributes, "SELLER_SKU") ?? atributo(item.attributes, "SELLER_SKU") ?? variacion?.seller_custom_field?.trim() ?? item.seller_custom_field?.trim() ?? null;
}

function imagenPrincipal(item: PublicacionMercadoLibre) {
  return item.pictures?.[0]?.secure_url ?? item.pictures?.[0]?.url ?? item.thumbnail ?? null;
}

async function detallePublicaciones(cuentaId: string, ids: string[]) {
  if (!ids.length) return [];
  const respuesta = await consultarMercadoLibre<Array<{ code: number; body: PublicacionMercadoLibre }>>(cuentaId, `/items?ids=${encodeURIComponent(ids.join(","))}&include_attributes=all`);
  return respuesta.filter(item => item.code === 200).map(item => item.body);
}

async function guardarPublicacion(cuenta: CuentaActivaMercadoLibre, item: PublicacionMercadoLibre) {
  const origenImagen = imagenPrincipal(item);
  const anteriorImagen = await prisma.productoMercadoLibre.findFirst({
    where: { cuentaId: cuenta.id, publicacionId: item.id, imagenUrl: { not: null } },
    select: { imagenOrigenUrl: true, imagenUrl: true, imagenNombre: true, imagenMimeType: true, imagenTamano: true },
  });
  let imagen = anteriorImagen?.imagenUrl ? { imagenUrl: anteriorImagen.imagenUrl, imagenNombre: anteriorImagen.imagenNombre, imagenMimeType: anteriorImagen.imagenMimeType, imagenTamano: anteriorImagen.imagenTamano } : {};
  let errorImagen: string | null = null;
  if (origenImagen && (!anteriorImagen?.imagenUrl || anteriorImagen.imagenOrigenUrl !== origenImagen)) {
    try { imagen = await copiarImagenMercadoLibre(origenImagen, item.id); }
    catch (error) { imagen = {}; errorImagen = error instanceof Error ? error.message : "No fue posible guardar la imagen."; }
  }
  const variantes: Array<VariacionMercadoLibre | undefined> = item.variations?.length ? item.variations : [undefined];
  for (const variacion of variantes) {
    const variacionId = variacion ? String(variacion.id) : "";
    const atributos = [...(item.attributes ?? []), ...(variacion?.attributes ?? []), ...(variacion?.attribute_combinations ?? [])];
    const inventoryId = variacion?.inventory_id ?? item.inventory_id ?? null;
    let stockFull: { existenciaFullTotal?: number; existenciaFullDisponible?: number; existenciaFullNoDisponible?: number; detalleFullNoDisponible?: object; stockFullConsultadoEn?: Date } = {};
    if (item.shipping?.logistic_type === "fulfillment" && inventoryId) {
      try {
        const stock = await consultarMercadoLibre<{ total: number; available_quantity: number; not_available_quantity: number; not_available_detail?: Array<{ status: string; quantity: number }> }>(cuenta.id, `/inventories/${encodeURIComponent(inventoryId)}/stock/fulfillment`);
        stockFull = { existenciaFullTotal: stock.total, existenciaFullDisponible: stock.available_quantity, existenciaFullNoDisponible: stock.not_available_quantity, detalleFullNoDisponible: stock.not_available_detail ?? [], stockFullConsultadoEn: new Date() };
      } catch { /* El resto de la publicación se conserva aunque Full falle temporalmente. */ }
    }
    const datos = {
      userProductId: variacion?.user_product_id ?? item.user_product_id ?? null,
      inventoryId,
      codigoVendedor: codigoVendedor(item, variacion),
      titulo: item.title,
      estado: item.status,
      condicion: item.condition ?? null,
      logistica: item.shipping?.logistic_type === "fulfillment" ? "FULL" : "LOCAL",
      existencia: variacion?.available_quantity ?? item.available_quantity,
      vendidos: variacion?.sold_quantity ?? item.sold_quantity,
      gtin: atributo(atributos, GTIN_IDS),
      marca: atributo(atributos, "BRAND"),
      modelo: atributo(atributos, "MODEL"),
      imagenOrigenUrl: origenImagen,
      errorImagen,
      enlacePublicacion: item.permalink ?? null,
      actualizadoMercadoLibreEn: item.last_updated ? new Date(item.last_updated) : null,
      sincronizadoEn: new Date(),
      ...imagen,
      ...stockFull,
    };
    await prisma.productoMercadoLibre.upsert({
      where: { cuentaId_publicacionId_variacionId: { cuentaId: cuenta.id, publicacionId: item.id, variacionId } },
      create: { cuentaId: cuenta.id, publicacionId: item.id, variacionId, ...datos },
      update: datos,
    });
  }
  return variantes.length;
}

export async function sincronizarPublicacionMercadoLibre(cuenta: CuentaActivaMercadoLibre, publicacionId: string) {
  const item = await consultarMercadoLibre<PublicacionMercadoLibre>(cuenta.id, `/items/${encodeURIComponent(publicacionId)}?include_attributes=all`);
  const procesados = await guardarPublicacion(cuenta, item);
  revalidatePath("/cuenta/productos");
  revalidatePath("/cuenta/publicaciones");
  return { procesados };
}

export async function sincronizarProductosMercadoLibre() {
  const cuenta = await obtenerCuentaMercadoLibre();
  if (!cuenta) throw new Error("Conecta una cuenta de Mercado Libre antes de sincronizar.");
  const limite = 20;
  let offset = 0;
  let total = 0;
  let procesados = 0;
  do {
    const busqueda = await consultarMercadoLibre<{ results: string[]; paging: { total: number } }>(cuenta.id, `/users/${encodeURIComponent(cuenta.usuarioMercadoLibreId)}/items/search?offset=${offset}&limit=${limite}`);
    total = busqueda.paging.total;
    const publicaciones = await detallePublicaciones(cuenta.id, busqueda.results);
    for (const item of publicaciones) procesados += await guardarPublicacion(cuenta, item);
    offset += limite;
  } while (offset < total && offset < 1000);
  revalidatePath("/cuenta/productos");
  revalidatePath("/cuenta/publicaciones");
  return { procesados, totalPublicaciones: total };
}
