import { prisma } from "@/lib/prisma";
import { obtenerAccessToken } from "./oauth";

const API_URL = "https://api.mercadolibre.com";

export type CuentaActivaMercadoLibre = {
  id: string;
  usuarioMercadoLibreId: string;
  apodo: string | null;
  sitioId: string | null;
};

export async function obtenerCuentaMercadoLibre(): Promise<CuentaActivaMercadoLibre | null> {
  return prisma.cuentaMercadoLibre.findFirst({
    orderBy: { actualizadoEn: "desc" },
    select: { id: true, usuarioMercadoLibreId: true, apodo: true, sitioId: true },
  });
}

export async function consultarMercadoLibre<T>(cuentaId: string, recurso: string): Promise<T> {
  if (!recurso.startsWith("/")) throw new Error("El recurso de Mercado Libre no es válido.");
  const token = await obtenerAccessToken(cuentaId);
  const respuesta = await fetch(`${API_URL}${recurso}`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
    cache: "no-store",
  });
  if (!respuesta.ok) {
    throw new Error(`Mercado Libre no pudo completar la consulta (${respuesta.status}).`);
  }
  return respuesta.json() as Promise<T>;
}

export function paginaSegura(valor: string | undefined) {
  const pagina = Number.parseInt(valor ?? "1", 10);
  return Number.isFinite(pagina) && pagina > 0 ? pagina : 1;
}

export const LIMITE_MERCADOLIBRE = 20;

export function formarFechaMercadoLibre(valor?: string | null) {
  if (!valor) return "No informada";
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime())
    ? "No informada"
    : fecha.toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
}

