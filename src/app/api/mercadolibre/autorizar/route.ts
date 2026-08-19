import { NextResponse } from "next/server";
import { crearAutorizacion } from "@/lib/mercadolibre/oauth";
import { validarClaveRespaldos } from "@/lib/respaldos/inventario";

export async function POST(request: Request) {
  try {
    validarClaveRespaldos(request.headers.get("x-clave-administrativa") ?? "");
    return NextResponse.json({ url: await crearAutorizacion() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible iniciar la conexión." }, { status: 400 });
  }
}
