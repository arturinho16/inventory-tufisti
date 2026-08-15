import { NextResponse } from "next/server";
import { completarAutorizacion } from "@/lib/mercadolibre/oauth";

export async function GET(request: Request) {
  const entrada = new URL(request.url);
  const origenPublico = process.env.MERCADOLIBRE_REDIRECT_URI?.trim() || entrada.origin;
  const destino = new URL("/configuracion/mercadolibre", origenPublico);
  const codigo = entrada.searchParams.get("code"); const estado = entrada.searchParams.get("state");
  if (entrada.searchParams.get("error") || !codigo || !estado) { destino.searchParams.set("conexion", "cancelada"); return NextResponse.redirect(destino); }
  try { await completarAutorizacion(codigo, estado); destino.searchParams.set("conexion", "correcta"); }
  catch { destino.searchParams.set("conexion", "error"); }
  return NextResponse.redirect(destino);
}
