import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validarClaveRespaldos } from "@/lib/respaldos/inventario";

export async function POST(request: Request) {
  try {
    validarClaveRespaldos(request.headers.get("x-clave-administrativa") ?? "");
    const { id } = await request.json() as { id?: string }; if (!id) throw new Error("Cuenta no válida.");
    await prisma.cuentaMercadoLibre.delete({ where: { id } });
    return NextResponse.json({ correcto: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible desconectar la cuenta." }, { status: 400 }); }
}
