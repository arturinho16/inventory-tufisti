import { describe, expect, it } from "vitest";
import { correspondeEjecutar } from "../../src/lib/respaldos/calendario";

const base = { activa: true, frecuencia: "SEMANAL" as const, diaSemana: 0, hora: 2, minuto: 0, zonaHoraria: "America/Mexico_City" };

describe("respaldos programados", () => {
  it("ejecuta el día y minuto configurados en la zona horaria del sistema", () => {
    expect(correspondeEjecutar(base, new Date("2026-08-09T08:00:00.000Z"))).toBe(true);
    expect(correspondeEjecutar(base, new Date("2026-08-09T08:01:00.000Z"))).toBe(false);
  });

  it("permite frecuencia diaria e ignora programaciones pausadas", () => {
    expect(correspondeEjecutar({ ...base, frecuencia: "DIARIO", diaSemana: null }, new Date("2026-08-10T08:00:00.000Z"))).toBe(true);
    expect(correspondeEjecutar({ ...base, activa: false }, new Date("2026-08-09T08:00:00.000Z"))).toBe(false);
  });
});
