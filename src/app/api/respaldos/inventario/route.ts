import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { crearRespaldoInventario, restaurarInventario, validarClaveRespaldos, type OpcionesRestauracion } from "@/lib/respaldos/inventario";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const error = (causa: unknown, estado = 400) => NextResponse.json({ error: causa instanceof Error ? causa.message : "No fue posible procesar el respaldo." }, { status: estado });
const opcionesSchema = z.object({
  recursos: z.array(z.enum(["lineas", "marcas", "tipos-producto", "formas-pantalla", "productos", "especificaciones-pantalla", "imagenes"])).min(1),
  marcas: z.array(z.string()).optional(), lineas: z.array(z.string()).optional(), fichas: z.enum(["todos", "con", "sin"]).optional(),
  modo: z.enum(["fusionar", "reemplazar-todo"]), conflicto: z.enum(["conservar", "actualizar"]), existencia: z.enum(["conservar", "restaurar"]),
  imagenes: z.enum(["conservar", "restaurar", "solo-faltantes"]), confirmacion: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    validarClaveRespaldos(request.headers.get("x-tufis-backup-key"));
    const query = request.nextUrl.searchParams, fichas = z.enum(["todos", "con", "sin"]).parse(query.get("fichas") || "todos");
    const { archivo } = await crearRespaldoInventario({
      marcas: query.getAll("marca"), lineas: query.getAll("linea"),
      fichas,
      incluirImagenes: query.get("imagenes") !== "0",
    });
    const fecha = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(archivo), { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="tufis-inventario-${fecha}.tufis.zip"`, "Cache-Control": "no-store" } });
  } catch (causa) { return error(causa, causa instanceof Error && causa.message.includes("clave administrativa") ? 401 : 400); }
}

export async function POST(request: NextRequest) {
  try {
    validarClaveRespaldos(request.headers.get("x-tufis-backup-key"));
    const form = await request.formData(), archivo = form.get("archivo"), opcionesEntrada = form.get("opciones");
    if (!(archivo instanceof File)) throw new Error("Selecciona un archivo de respaldo TUFIS.");
    if (archivo.size > 250 * 1024 * 1024) throw new Error("El respaldo no debe superar 250 MB.");
    if (typeof opcionesEntrada !== "string") throw new Error("No se recibieron las opciones de restauración.");
    const opciones = opcionesSchema.parse(JSON.parse(opcionesEntrada)) as OpcionesRestauracion;
    const resultado = await restaurarInventario(Buffer.from(await archivo.arrayBuffer()), opciones);
    return NextResponse.json({ ok: true, resultado });
  } catch (causa) { return error(causa, causa instanceof Error && causa.message.includes("clave administrativa") ? 401 : 400); }
}
