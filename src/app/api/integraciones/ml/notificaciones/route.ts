import { after, NextResponse } from "next/server";
import { procesarNotificacionMercadoLibre, type NotificacionEntranteMercadoLibre } from "@/lib/mercadolibre/notificaciones";

export const runtime = "nodejs";

function esValida(valor: unknown): valor is NotificacionEntranteMercadoLibre {
  if (!valor || typeof valor !== "object") return false;
  const dato = valor as Record<string, unknown>;
  return typeof dato.resource === "string" && dato.resource.startsWith("/") && dato.resource.length <= 180 && (typeof dato.user_id === "string" || typeof dato.user_id === "number") && (dato.topic === "items" || dato.topic === "orders_v2") && (typeof dato.application_id === "string" || typeof dato.application_id === "number");
}

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? "0") > 16_384) return NextResponse.json({ recibido: true });
  let entrada: unknown;
  try { entrada = await request.json(); } catch { return NextResponse.json({ recibido: true }); }
  if (!esValida(entrada)) return NextResponse.json({ recibido: true });
  const clientId = process.env.MERCADOLIBRE_CLIENT_ID?.trim();
  if (!clientId || String(entrada.application_id) !== clientId) return NextResponse.json({ recibido: true });
  after(async () => { await procesarNotificacionMercadoLibre(entrada); });
  return NextResponse.json({ recibido: true });
}

export function GET() { return NextResponse.json({ estado: "disponible", escrituraEnMercadoLibre: false }); }
