"use server";

import { revalidatePath } from "next/cache";
import { unlink } from "node:fs/promises";
import { z } from "zod";
import { FrecuenciaRespaldo } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { validarClaveRespaldos } from "@/lib/respaldos/inventario";
import { ejecutarProgramacion } from "@/lib/respaldos/programados";

const esquema = z.object({
  nombre: z.string().trim().min(3).max(80), activa: z.boolean(), frecuencia: z.enum([FrecuenciaRespaldo.DIARIO, FrecuenciaRespaldo.SEMANAL]),
  diaSemana: z.number().int().min(0).max(6).nullable(), hora: z.number().int().min(0).max(23), minuto: z.number().int().min(0).max(59),
  zonaHoraria: z.literal("America/Mexico_City"), marcas: z.array(z.string()).max(100), lineas: z.array(z.string()).max(100), fichas: z.enum(["todos", "con", "sin"]),
  incluirImagenes: z.boolean(), retencionCantidad: z.number().int().min(1).max(365),
}).superRefine((v, ctx) => { if (v.frecuencia === FrecuenciaRespaldo.SEMANAL && v.diaSemana === null) ctx.addIssue({ code: "custom", path: ["diaSemana"], message: "Selecciona un día de la semana." }); });

export type DatosProgramacion = z.infer<typeof esquema>;
const autorizar = (clave: string) => validarClaveRespaldos(clave);

export async function guardarProgramacion(clave: string, entrada: DatosProgramacion, id?: string) {
  autorizar(clave); const datos = esquema.parse(entrada);
  if (id) await prisma.programacionRespaldo.update({ where: { id }, data: datos }); else await prisma.programacionRespaldo.create({ data: datos });
  revalidatePath("/configuracion/respaldos");
}

export async function cambiarEstadoProgramacion(clave: string, id: string, activa: boolean) {
  autorizar(clave); await prisma.programacionRespaldo.update({ where: { id }, data: { activa } }); revalidatePath("/configuracion/respaldos");
}

export async function eliminarProgramacion(clave: string, id: string) {
  autorizar(clave);
  const archivos = await prisma.ejecucionRespaldo.findMany({ where: { programacionId: id, archivoRuta: { not: null } }, select: { archivoRuta: true } });
  for (const item of archivos) if (item.archivoRuta) try { await unlink(item.archivoRuta); } catch { /* Puede haber sido eliminado por retención o administración externa. */ }
  await prisma.programacionRespaldo.delete({ where: { id } }); revalidatePath("/configuracion/respaldos");
}

export async function ejecutarProgramacionAhora(clave: string, id: string) {
  autorizar(clave); const programacion = await prisma.programacionRespaldo.findUniqueOrThrow({ where: { id } }); const resultado = await ejecutarProgramacion(programacion, new Date(), true); revalidatePath("/configuracion/respaldos"); return resultado;
}
