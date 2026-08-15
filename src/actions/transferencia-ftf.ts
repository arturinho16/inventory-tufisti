"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { extraerPantallaFtf, faltantesPantallaFtf, type DatosPantallaFtf } from "@/lib/ftf/normalizar-pantalla";
import { validarIdentidadFtf } from "@/lib/ftf/validar";
import type { SeccionFtf } from "@/lib/ftf/extraer-url";

const nombresCampos: Record<keyof DatosPantallaFtf, string> = {
  tecnologia: "tecnología", tipoFormaPantalla: "forma de pantalla", tipoFormaOtro: "descripción de forma",
  diagonalMm: "diagonal en milímetros", diagonalPulgadas: "diagonal en pulgadas", anchoDisplayMm: "ancho del display",
  altoDisplayMm: "alto del display", aspectRatio: "proporción", resolucionAnchoPx: "resolución horizontal",
  resolucionAltoPx: "resolución vertical", densidadPpi: "densidad", profundidadColor: "profundidad de color",
  areaDisplayPorcentaje: "área del display", cristalFrontal: "cristal frontal", refrescoHz: "frecuencia de refresco",
};

async function esperadoPorClave(clave: string, diagonalFuente: number | null) {
  const registro = await prisma.importacionFtfRegistro.findFirst({
    where: { clave, estado: "COMPLETADA" }, orderBy: { actualizadoEn: "desc" },
    select: { diagonalEsperada: true },
  });
  return registro ? Number(registro.diagonalEsperada) : diagonalFuente;
}

export async function listarTransferenciasFtf(marca?: string) {
  const fichas = await prisma.fichaTecnicaFull.findMany({
    where: marca ? { producto: { marca: { nombre: { equals: marca, mode: "insensitive" } } } } : undefined,
    orderBy: { producto: { clave: "asc" } },
    include: { producto: { include: { marca: { select: { nombre: true } }, linea: { select: { nombre: true } }, especificacionPantalla: { select: { id: true } } } } },
  });
  const esperadas = fichas.length ? await prisma.importacionFtfRegistro.findMany({
    where: { clave: { in: fichas.map((ficha) => ficha.producto.clave) }, estado: "COMPLETADA" },
    orderBy: { actualizadoEn: "desc" }, select: { id: true, clave: true, diagonalEsperada: true },
  }) : [];
  const diagonalPorClave = new Map<string, number>();
  for (const registro of esperadas) if (!diagonalPorClave.has(registro.clave)) diagonalPorClave.set(registro.clave, Number(registro.diagonalEsperada));
  const resultados = await Promise.all(fichas.map(async (ficha) => {
    const datos = extraerPantallaFtf(ficha.secciones as unknown as SeccionFtf[]);
    const diagonalEsperada = diagonalPorClave.get(ficha.producto.clave) ?? datos.diagonalPulgadas;
    const identidad = diagonalEsperada === null ? null : validarIdentidadFtf(
      { marca: ficha.producto.marca.nombre, modelo: ficha.producto.modelo, diagonal: diagonalEsperada },
      { marca: ficha.marcaFuente, modelo: ficha.modeloFuente, diagonal: datos.diagonalPulgadas },
    );
    const faltantes = faltantesPantallaFtf(datos);
    const problemas = [
      ...(!identidad?.marcaCoincide ? ["La marca no coincide."] : []),
      ...(!identidad?.modeloCoincide ? [`El modelo coincide sólo ${identidad?.puntuacionModelo.toFixed(1) ?? "0.0"}%.`] : []),
      ...(!identidad?.variantesCoinciden ? ["La variante del modelo no coincide."] : []),
      ...(!identidad?.diagonalCoincide ? [`La diagonal no coincide dentro de 0.08 pulgadas (esperada ${diagonalEsperada ?? "desconocida"}, fuente ${datos.diagonalPulgadas ?? "no encontrada"}).`] : []),
      ...(faltantes.length ? [`Faltan: ${faltantes.map((campo) => nombresCampos[campo]).join(", ")}.`] : []),
    ];
    return {
      productoId: ficha.productoId, clave: ficha.producto.clave, modelo: ficha.producto.modelo,
      marca: ficha.producto.marca.nombre, proveedor: ficha.proveedor, modeloFuente: ficha.modeloFuente,
      diagonalEsperada, diagonalFuente: datos.diagonalPulgadas, datos, problemas,
      estado: ficha.producto.especificacionPantalla ? "EXISTENTE" as const : problemas.length ? "REVISION" as const : "LISTA" as const,
    };
  }));
  return resultados.filter((registro) => registro.estado !== "REVISION");
}

export async function transferirFtfAParalelo(productoId: string, confirmarActualizacion = false) {
  const ficha = await prisma.fichaTecnicaFull.findUnique({
    where: { productoId },
    include: { producto: { include: { marca: { select: { nombre: true } }, linea: { select: { nombre: true } }, especificacionPantalla: { select: { id: true } } } } },
  });
  if (!ficha) throw new Error("La FTF o el producto ya no existen.");
  if (ficha.producto.especificacionPantalla && !confirmarActualizacion) throw new Error("Ya existe un registro técnico. Confirma expresamente la actualización.");
  const datos = extraerPantallaFtf(ficha.secciones as unknown as SeccionFtf[]);
  const diagonalEsperada = await esperadoPorClave(ficha.producto.clave, datos.diagonalPulgadas);
  if (diagonalEsperada === null) throw new Error("No existe una diagonal esperada para validar.");
  const identidad = validarIdentidadFtf(
    { marca: ficha.producto.marca.nombre, modelo: ficha.producto.modelo, diagonal: diagonalEsperada },
    { marca: ficha.marcaFuente, modelo: ficha.modeloFuente, diagonal: datos.diagonalPulgadas },
  );
  if (!identidad.valida) throw new Error("La FTF no supera la validación de Clave, modelo, variante y diagonal.");
  const faltantes = faltantesPantallaFtf(datos);
  if (faltantes.length) throw new Error(`La ficha está incompleta: ${faltantes.map((campo) => nombresCampos[campo]).join(", ")}.`);
  const valores = {
    clave: ficha.producto.clave, modelo: ficha.producto.modelo, lineaId: ficha.producto.lineaId, marcaId: ficha.producto.marcaId,
    tecnologia: datos.tecnologia!, tipoFormaPantalla: datos.tipoFormaPantalla, tipoFormaOtro: datos.tipoFormaOtro,
    diagonalMm: datos.diagonalMm!, diagonalPulgadas: datos.diagonalPulgadas!, anchoDisplayMm: datos.anchoDisplayMm!,
    altoDisplayMm: datos.altoDisplayMm!, aspectRatio: datos.aspectRatio!, resolucionAnchoPx: datos.resolucionAnchoPx!,
    resolucionAltoPx: datos.resolucionAltoPx!, densidadPpi: datos.densidadPpi!, profundidadColor: datos.profundidadColor!,
    areaDisplayPorcentaje: datos.areaDisplayPorcentaje!, cristalFrontal: datos.cristalFrontal, refrescoHz: datos.refrescoHz,
  };
  await prisma.especificacionPantalla.upsert({
    where: { productoId }, create: { productoId, ...valores }, update: confirmarActualizacion ? valores : {} as Prisma.EspecificacionPantallaUncheckedUpdateInput,
  });
  try {
    revalidatePath("/paralelo/registros");
    revalidatePath("/paralelo/nuevo");
    revalidatePath("/paralelo/buscar");
  } catch { /* PostgreSQL ya confirmó la transferencia. */ }
  return { correcto: true, mensaje: `La Clave ${ficha.producto.clave} ya está disponible en Paralelo Visual.` };
}
