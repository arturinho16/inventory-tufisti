import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const tipos: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

export async function GET(_: Request, { params }: { params: Promise<{ nombre: string }> }) {
  const { nombre } = await params;
  if (nombre !== path.basename(nombre) || !/^[a-z0-9._-]+$/i.test(nombre)) return new NextResponse("Imagen no válida.", { status: 400 });
  const tipo = tipos[path.extname(nombre).toLowerCase()];
  if (!tipo) return new NextResponse("Formato no permitido.", { status: 400 });
  try {
    const contenido = await readFile(path.join(process.cwd(), "public", "imagenes", "productos", nombre));
    return new NextResponse(contenido, { headers: { "content-type": tipo, "cache-control": "public, max-age=3600, stale-while-revalidate=86400" } });
  } catch { return new NextResponse("Imagen no encontrada.", { status: 404 }); }
}

