import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { FichaFtfExtraida } from "./extraer-url";

export async function guardarFichaFtf(productoId: string, urlFuente: string, ficha: FichaFtfExtraida, diferencia: number | null, validacion = "VALIDADA") {
  return prisma.fichaTecnicaFull.upsert({
    where: { productoId },
    create: { productoId, urlFuente, proveedor: ficha.proveedor, marcaFuente: ficha.marca, modeloFuente: ficha.modelo, diagonalFuente: ficha.diagonal, diferenciaDiagonal: diferencia, validacion, secciones: ficha.secciones as unknown as Prisma.InputJsonValue, cantidadSecciones: ficha.secciones.length },
    update: { urlFuente, proveedor: ficha.proveedor, marcaFuente: ficha.marca, modeloFuente: ficha.modelo, diagonalFuente: ficha.diagonal, diferenciaDiagonal: diferencia, validacion, secciones: ficha.secciones as unknown as Prisma.InputJsonValue, cantidadSecciones: ficha.secciones.length, extraidoEn: new Date() },
  });
}
