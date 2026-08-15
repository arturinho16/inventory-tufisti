import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ejecutarProgramacionesPendientes } from "@/lib/respaldos/programados";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function autorizado(request: NextRequest) {
  const esperado = process.env.RESPALDOS_CRON_TOKEN?.trim(), recibido = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!esperado) return false;
  const a = Buffer.from(esperado), b = Buffer.from(recibido);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!autorizado(request)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try { return NextResponse.json({ ok: true, resultados: await ejecutarProgramacionesPendientes() }); }
  catch (causa) { return NextResponse.json({ error: causa instanceof Error ? causa.message : "Falló el programador." }, { status: 500 }); }
}
