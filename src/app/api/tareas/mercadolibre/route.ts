import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ejecutarReconciliacionMercadoLibre } from "@/lib/mercadolibre/reconciliacion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function autorizado(request: NextRequest) {
  const esperado = process.env.RESPALDOS_CRON_TOKEN?.trim();
  const recibido = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!esperado) return false;
  const a = Buffer.from(esperado), b = Buffer.from(recibido);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!autorizado(request)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const modo = request.nextUrl.searchParams.get("modo") === "completa" ? "completa" : "incremental";
  try { return NextResponse.json({ ok: true, resultado: await ejecutarReconciliacionMercadoLibre(modo) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Falló la sincronización de Mercado Libre." }, { status: 500 }); }
}
