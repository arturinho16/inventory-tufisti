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

const CAMPOS_MINIMOS_PARALELO: Array<keyof DatosPantallaFtf> = [
  "diagonalMm", "diagonalPulgadas", "anchoDisplayMm", "altoDisplayMm", "aspectRatio",
];

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
  // Esta vista es una bandeja de trabajo, no un historial. Una ficha que ya
  // existe en Paralelo deja de ser accionable y no debe mezclarse con el
  // siguiente lote que importe el operador.
  return resultados.filter((registro) => registro.estado === "LISTA");
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

export async function liberarFtfParcial(registroId: string, motivo: string) {
  const justificacion = motivo.trim();
  if (justificacion.length < 10) throw new Error("Explica en al menos 10 caracteres por qué se liberará la ficha sin esos campos.");
  const registro = await prisma.importacionFtfRegistro.findUnique({ where: { id: registroId } });
  if (!registro) throw new Error("El registro ya no existe.");
  const ficha = await prisma.fichaTecnicaFull.findFirst({
    where: { producto: { clave: registro.clave } },
    include: { producto: { include: { marca: { select: { nombre: true } }, especificacionPantalla: { select: { id: true } } } } },
  });
  if (!ficha) throw new Error("La FTF todavía no está asociada al producto.");
  if (ficha.producto.especificacionPantalla) throw new Error("El producto ya está en Paralelo.");
  const datos = extraerPantallaFtf(ficha.secciones as unknown as SeccionFtf[]);
  const diagonalEsperada = Number(registro.diagonalEsperada);
  const identidad = validarIdentidadFtf(
    { marca: ficha.producto.marca.nombre, modelo: ficha.producto.modelo, diagonal: diagonalEsperada },
    { marca: ficha.marcaFuente, modelo: ficha.modeloFuente, diagonal: datos.diagonalPulgadas },
  );
  if (!identidad.valida) throw new Error("Primero corrige la identidad de marca, modelo, variante o diagonal.");
  const faltantesMinimos = CAMPOS_MINIMOS_PARALELO.filter((campo) => datos[campo] === null || datos[campo] === "");
  if (faltantesMinimos.length) throw new Error(`No puede liberarse: faltan datos mínimos de comparación (${faltantesMinimos.map((campo) => nombresCampos[campo]).join(", ")}).`);
  const omitidos = faltantesPantallaFtf(datos).map((campo) => String(campo));
  if (!omitidos.length) throw new Error("La ficha ya está completa; usa la transferencia normal.");
  const valores = {
    clave: ficha.producto.clave, modelo: ficha.producto.modelo, lineaId: ficha.producto.lineaId, marcaId: ficha.producto.marcaId,
    tecnologia: datos.tecnologia, tipoFormaPantalla: datos.tipoFormaPantalla, tipoFormaOtro: datos.tipoFormaOtro,
    diagonalMm: datos.diagonalMm!, diagonalPulgadas: datos.diagonalPulgadas!, anchoDisplayMm: datos.anchoDisplayMm!,
    altoDisplayMm: datos.altoDisplayMm!, aspectRatio: datos.aspectRatio!, resolucionAnchoPx: datos.resolucionAnchoPx,
    resolucionAltoPx: datos.resolucionAltoPx, densidadPpi: datos.densidadPpi, profundidadColor: datos.profundidadColor,
    areaDisplayPorcentaje: datos.areaDisplayPorcentaje, cristalFrontal: datos.cristalFrontal, refrescoHz: datos.refrescoHz,
    esParcial: true, camposOmitidos: omitidos,
    metadatosCampos: { liberacion: { motivo: justificacion, omitidos, fecha: new Date().toISOString(), origen: "USUARIO_FRONTEND" } } as Prisma.InputJsonValue,
  };
  await prisma.$transaction([
    prisma.especificacionPantalla.create({ data: { productoId: ficha.productoId, ...valores } }),
    prisma.importacionFtfRegistro.update({ where: { id: registroId }, data: { estado: "COMPLETADA", mensaje: `Liberada como ficha parcial. Campos omitidos: ${omitidos.map((campo) => nombresCampos[campo as keyof DatosPantallaFtf]).join(", ")}. Motivo: ${justificacion}`, procesadoEn: new Date() } }),
    prisma.importacionFtfIntento.create({ data: { registroId, accion: "LIBERACION_FTF_PARCIAL", estado: "COMPLETADA", proveedor: ficha.proveedor, url: ficha.urlFuente, mensaje: `El usuario liberó la ficha como parcial: ${justificacion}`, marcaEncontrada: ficha.marcaFuente, modeloEncontrado: ficha.modeloFuente, diagonalEncontrada: datos.diagonalPulgadas, metadatos: { omitidos, motivo: justificacion, coberturaReducida: true } as Prisma.InputJsonValue } }),
  ]);
  revalidatePath("/automatizacion/importar-url"); revalidatePath("/paralelo/registros"); revalidatePath("/paralelo/buscar");
  return { correcto: true, mensaje: `La Clave ${ficha.producto.clave} fue liberada como ficha parcial y salió de Seguimiento.` };
}
