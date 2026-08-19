import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { EstadoEjecucionRespaldo, Prisma, type ProgramacionRespaldo } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { crearRespaldoInventario } from "./inventario";
import { correspondeEjecutar, partesLocales } from "./calendario";

export { correspondeEjecutar } from "./calendario";

const DIRECTORIO = process.env.RESPALDOS_PROGRAMADOS_DIR || path.join(process.cwd(), ".datos", "respaldos-programados");
function claveYFecha(programacion: Pick<ProgramacionRespaldo, "zonaHoraria">, ahora: Date) {
  const local = partesLocales(ahora, programacion.zonaHoraria), milisegundos = String(ahora.getMilliseconds()).padStart(3, "0");
  const fecha = `${local.ano}-${local.mes}-${local.dia}_${String(local.hora).padStart(2, "0")}-${String(local.minuto).padStart(2, "0")}-${local.segundo}-${milisegundos}`;
  return { clavePeriodo: `${local.ano}-${local.mes}-${local.dia}_${String(local.hora).padStart(2, "0")}-${String(local.minuto).padStart(2, "0")}`, fecha };
}

export async function ejecutarProgramacion(programacion: ProgramacionRespaldo, ahora = new Date(), manual = false) {
  const marcaTiempo = claveYFecha(programacion, ahora), clavePeriodo = manual ? `manual-${ahora.toISOString()}` : marcaTiempo.clavePeriodo;
  let ejecucion;
  try {
    ejecucion = await prisma.ejecucionRespaldo.create({ data: { programacionId: programacion.id, clavePeriodo } });
  } catch (causa) {
    if (causa instanceof Prisma.PrismaClientKnownRequestError && causa.code === "P2002") return { omitida: true as const };
    throw causa;
  }
  try {
    const { archivo, manifiesto } = await crearRespaldoInventario({ marcas: programacion.marcas, lineas: programacion.lineas, fichas: programacion.fichas as "todos" | "con" | "sin", incluirImagenes: programacion.incluirImagenes });
    await mkdir(DIRECTORIO, { recursive: true });
    const identificador = programacion.id.slice(-8).replace(/[^a-zA-Z0-9]/g, ""), nombre = `tufis-programado-${marcaTiempo.fecha}-${identificador}.tufis.zip`, ruta = path.join(DIRECTORIO, nombre);
    await writeFile(ruta, archivo, { flag: "wx" });
    await prisma.$transaction([
      prisma.ejecucionRespaldo.update({ where: { id: ejecucion.id }, data: { estado: EstadoEjecucionRespaldo.COMPLETADO, archivoNombre: nombre, archivoRuta: ruta, tamanoBytes: archivo.byteLength, cantidades: manifiesto.cantidades, finalizadaEn: new Date() } }),
      prisma.programacionRespaldo.update({ where: { id: programacion.id }, data: { ultimaEjecucion: new Date() } }),
    ]);
    const antiguos = await prisma.ejecucionRespaldo.findMany({ where: { programacionId: programacion.id, estado: EstadoEjecucionRespaldo.COMPLETADO }, orderBy: { iniciadaEn: "desc" }, skip: programacion.retencionCantidad, select: { id: true, archivoRuta: true } });
    for (const antiguo of antiguos) {
      if (antiguo.archivoRuta) try { await unlink(antiguo.archivoRuta); } catch { /* El historial puede limpiarse aunque el archivo ya no exista. */ }
      await prisma.ejecucionRespaldo.delete({ where: { id: antiguo.id } });
    }
    return { omitida: false as const, nombre, bytes: archivo.byteLength };
  } catch (causa) {
    await prisma.ejecucionRespaldo.update({ where: { id: ejecucion.id }, data: { estado: EstadoEjecucionRespaldo.ERROR, error: causa instanceof Error ? causa.message.slice(0, 2000) : "Error desconocido", finalizadaEn: new Date() } });
    throw causa;
  }
}

export async function ejecutarProgramacionesPendientes(ahora = new Date()) {
  const programaciones = await prisma.programacionRespaldo.findMany({ where: { activa: true } });
  const resultados = [];
  for (const programacion of programaciones) if (correspondeEjecutar(programacion, ahora)) resultados.push(await ejecutarProgramacion(programacion, ahora));
  return resultados;
}
