import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { procesarSiguienteImportacionFtf } from "@/lib/ftf/procesar-cola";
import { actualizarEsperadoRegistroFtf, importarFtfPorUrl, type FilaUrlFtf } from "@/actions/importacion-ftf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function autorizado(request: NextRequest) {
  const esperado = process.env.FTF_WORKER_TOKEN?.trim(), recibido = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!esperado) return false;
  const a = Buffer.from(esperado), b = Buffer.from(recibido);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!autorizado(request)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const cuerpo = await request.json().catch(() => ({})) as { operacion?: string; fila?: FilaUrlFtf; registroId?: string; modelo?: string; diagonal?: number };
    if (cuerpo.operacion === "COMPLEMENTAR_URL") {
      if (!cuerpo.fila) return NextResponse.json({ error: "Faltan los datos del producto." }, { status: 400 });
      return NextResponse.json({ ok: true, resultado: await importarFtfPorUrl(cuerpo.fila) });
    }
    if (cuerpo.operacion === "CORREGIR_ESPERADO") {
      if (!cuerpo.registroId || !cuerpo.modelo || !cuerpo.diagonal) return NextResponse.json({ error: "Faltan los datos corregidos." }, { status: 400 });
      return NextResponse.json({ ok: true, resultado: await actualizarEsperadoRegistroFtf(cuerpo.registroId, cuerpo.modelo, cuerpo.diagonal) });
    }
    return NextResponse.json({ ok: true, resultado: await procesarSiguienteImportacionFtf() });
  }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Falló el trabajador FTF." }, { status: 500 }); }
}
