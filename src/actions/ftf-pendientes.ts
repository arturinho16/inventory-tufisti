"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { validarIdentidadFtf } from "@/lib/ftf/validar";

export async function listarFtfPendientes(buscar = "") {
  const texto = buscar.trim();
  const fichas = await prisma.fichaFtfPendiente.findMany({
    where: { estado: "PENDIENTE", ...(texto ? { OR: [
      { claveOrigen: { contains: texto, mode: "insensitive" } }, { marcaFuente: { contains: texto, mode: "insensitive" } },
      { modeloFuente: { contains: texto, mode: "insensitive" } },
    ] } : {}) },
    orderBy: [{ marcaFuente: "asc" }, { modeloFuente: "asc" }], take: 200,
    select: { id: true, claveOrigen: true, marcaFuente: true, modeloFuente: true, diagonalFuente: true, urlFuente: true, proveedor: true, cantidadSecciones: true },
  });
  return fichas.map((ficha) => ({ ...ficha, diagonalFuente: ficha.diagonalFuente === null ? null : Number(ficha.diagonalFuente) }));
}

export async function buscarProductosParaFtf(consulta: string) {
  const buscar = consulta.trim();
  if (buscar.length < 2) return [];
  return prisma.producto.findMany({
    where: { fichaTecnicaFull: null, OR: [
      { clave: { contains: buscar, mode: "insensitive" } }, { modelo: { contains: buscar, mode: "insensitive" } },
      { marca: { nombre: { contains: buscar, mode: "insensitive" } } },
    ] },
    orderBy: [{ marca: { nombre: "asc" } }, { modelo: "asc" }], take: 20,
    select: { id: true, clave: true, modelo: true, marca: { select: { nombre: true } }, especificacionPantalla: { select: { diagonalPulgadas: true } } },
  }).then((productos) => productos.map((producto) => ({ id: producto.id, clave: producto.clave, modelo: producto.modelo, marca: producto.marca.nombre, diagonal: producto.especificacionPantalla ? Number(producto.especificacionPantalla.diagonalPulgadas) : null })));
}

export async function evaluarAsociacionFtf(pendienteId: string, productoId: string) {
  const [pendiente, producto] = await Promise.all([
    prisma.fichaFtfPendiente.findUnique({ where: { id: pendienteId } }),
    prisma.producto.findUnique({ where: { id: productoId }, include: { marca: { select: { nombre: true } }, especificacionPantalla: { select: { diagonalPulgadas: true } }, fichaTecnicaFull: { select: { id: true } } } }),
  ]);
  if (!pendiente || pendiente.estado !== "PENDIENTE") throw new Error("La FTF ya no está pendiente.");
  if (!producto) throw new Error("El producto ya no existe.");
  if (producto.fichaTecnicaFull) throw new Error("El producto ya tiene una FTF asociada.");
  const diagonalEsperada = producto.especificacionPantalla ? Number(producto.especificacionPantalla.diagonalPulgadas) : null;
  const diagonalFuente = pendiente.diagonalFuente === null ? null : Number(pendiente.diagonalFuente);
  const validacion = diagonalEsperada === null ? null : validarIdentidadFtf(
    { marca: producto.marca.nombre, modelo: producto.modelo, diagonal: diagonalEsperada },
    { marca: pendiente.marcaFuente, modelo: pendiente.modeloFuente, diagonal: diagonalFuente },
  );
  const problemas = [
    ...(!validacion?.marcaCoincide ? ["La marca no coincide."] : []),
    ...(!validacion?.modeloCoincide ? [`El modelo coincide ${validacion?.puntuacionModelo.toFixed(1) ?? "0.0"}%.`] : []),
    ...(!validacion?.variantesCoinciden ? ["Los tokens críticos de variante no coinciden."] : []),
    ...(!validacion?.diagonalCoincide ? [`La diagonal esperada es ${diagonalEsperada ?? "desconocida"} in y la fuente indica ${diagonalFuente ?? "desconocida"} in.`] : []),
  ];
  return { valida: Boolean(validacion?.valida), problemas, producto: { id: producto.id, clave: producto.clave, marca: producto.marca.nombre, modelo: producto.modelo, diagonal: diagonalEsperada }, fuente: { marca: pendiente.marcaFuente, modelo: pendiente.modeloFuente, diagonal: diagonalFuente, secciones: pendiente.cantidadSecciones } };
}

export async function asociarFtfPendiente(pendienteId: string, productoId: string, confirmarManualmente = false) {
  const evaluacion = await evaluarAsociacionFtf(pendienteId, productoId);
  if (!evaluacion.valida && !confirmarManualmente) return { correcto: false, requiereConfirmacion: true, mensaje: evaluacion.problemas.join(" "), evaluacion };
  const pendiente = await prisma.fichaFtfPendiente.findUniqueOrThrow({ where: { id: pendienteId } });
  const diferencia = evaluacion.producto.diagonal === null || evaluacion.fuente.diagonal === null ? null : Math.abs(evaluacion.producto.diagonal - evaluacion.fuente.diagonal);
  await prisma.$transaction(async (tx) => {
    const producto = await tx.producto.findUnique({ where: { id: productoId }, select: { fichaTecnicaFull: { select: { id: true } } } });
    if (!producto || producto.fichaTecnicaFull) throw new Error("El producto ya no está disponible para asociar esta FTF.");
    await tx.fichaTecnicaFull.create({ data: {
      productoId, urlFuente: pendiente.urlFuente, proveedor: pendiente.proveedor, marcaFuente: pendiente.marcaFuente,
      modeloFuente: pendiente.modeloFuente, diagonalFuente: pendiente.diagonalFuente, diferenciaDiagonal: diferencia,
      validacion: evaluacion.valida ? "ASOCIADA_DESDE_PENDIENTES_VALIDADA" : "ASOCIADA_MANUAL_DESDE_PENDIENTES",
      secciones: pendiente.secciones as Prisma.InputJsonValue, cantidadSecciones: pendiente.cantidadSecciones,
    } });
    await tx.fichaFtfPendiente.update({ where: { id: pendienteId }, data: { estado: "ASOCIADA", productoId, asociadoEn: new Date(), diagnostico: { ...evaluacion, confirmacionManual: confirmarManualmente } as unknown as Prisma.InputJsonValue } });
  });
  revalidatePath("/automatizacion/importar-url"); revalidatePath("/paralelo/registros"); revalidatePath("/paralelo/buscar");
  return { correcto: true, requiereConfirmacion: false, mensaje: `FTF asociada a la Clave ${evaluacion.producto.clave}.`, evaluacion };
}

export async function descartarFtfPendiente(pendienteId: string, motivo: string) {
  const justificacion = motivo.trim();
  if (justificacion.length < 5) throw new Error("Escribe un motivo de al menos 5 caracteres.");
  const pendiente = await prisma.fichaFtfPendiente.findUnique({
    where: { id: pendienteId },
    select: { id: true, estado: true, marcaFuente: true, modeloFuente: true, urlFuente: true },
  });
  if (!pendiente || pendiente.estado !== "PENDIENTE") throw new Error("La FTF ya no está pendiente.");
  await prisma.fichaFtfPendiente.update({
    where: { id: pendienteId },
    data: {
      estado: "DESCARTADA",
      diagnostico: {
        accion: "DESCARTE_MANUAL",
        motivo: justificacion,
        descartadoEn: new Date().toISOString(),
        origen: "USUARIO_FRONTEND",
        aviso: "Se retiró de FTF no asociadas; no se eliminó ninguna FTF vinculada a un producto.",
      } as Prisma.InputJsonValue,
    },
  });
  revalidatePath("/automatizacion/importar-url");
  return { correcto: true, mensaje: `La FTF de ${pendiente.marcaFuente} ${pendiente.modeloFuente} se retiró de pendientes.` };
}
