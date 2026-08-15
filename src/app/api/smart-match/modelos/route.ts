import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const consulta = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (!consulta) return NextResponse.json({ sugerencias: [] });
  const productos = await prisma.producto.findMany({
    where: {
      tipoProducto: { categoria: "CRISTAL_TEMPLADO" },
      especificacionPantalla: { isNot: null },
      OR: [
        { modelo: { contains: consulta, mode: "insensitive" } },
        { marca: { nombre: { contains: consulta, mode: "insensitive" } } },
      ],
    },
    distinct: ["modelo"],
    orderBy: { modelo: "asc" },
    take: 8,
    select: { modelo: true, marca: { select: { nombre: true } } },
  });
  return NextResponse.json({ sugerencias: productos.map((producto) => ({ modelo: producto.modelo, marca: producto.marca.nombre })) }, { headers: { "Cache-Control": "private, max-age=15" } });
}
