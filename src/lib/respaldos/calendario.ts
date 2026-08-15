type ProgramacionCalendario = { activa: boolean; frecuencia: "DIARIO" | "SEMANAL"; diaSemana: number | null; hora: number; minuto: number; zonaHoraria: string };
const dias = new Map([["Sun", 0], ["Mon", 1], ["Tue", 2], ["Wed", 3], ["Thu", 4], ["Fri", 5], ["Sat", 6]]);

export function partesLocales(fecha: Date, zonaHoraria: string) {
  const partes = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: zonaHoraria, weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(fecha).map((p) => [p.type, p.value]));
  return { ano: partes.year, mes: partes.month, dia: partes.day, hora: Number(partes.hour), minuto: Number(partes.minute), segundo: partes.second, diaSemana: dias.get(partes.weekday) ?? -1 };
}

export function correspondeEjecutar(programacion: ProgramacionCalendario, ahora = new Date()) {
  if (!programacion.activa) return false;
  const local = partesLocales(ahora, programacion.zonaHoraria);
  return local.hora === programacion.hora && local.minuto === programacion.minuto && (programacion.frecuencia === "DIARIO" || local.diaSemana === programacion.diaSemana);
}
