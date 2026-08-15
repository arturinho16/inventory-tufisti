CREATE TYPE "FrecuenciaRespaldo" AS ENUM ('DIARIO', 'SEMANAL');
CREATE TYPE "EstadoEjecucionRespaldo" AS ENUM ('EN_PROCESO', 'COMPLETADO', 'ERROR');

CREATE TABLE "ProgramacionRespaldo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "frecuencia" "FrecuenciaRespaldo" NOT NULL,
    "diaSemana" INTEGER,
    "hora" INTEGER NOT NULL,
    "minuto" INTEGER NOT NULL DEFAULT 0,
    "zonaHoraria" TEXT NOT NULL DEFAULT 'America/Mexico_City',
    "marcas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lineas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fichas" TEXT NOT NULL DEFAULT 'todos',
    "incluirImagenes" BOOLEAN NOT NULL DEFAULT true,
    "retencionCantidad" INTEGER NOT NULL DEFAULT 7,
    "ultimaEjecucion" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProgramacionRespaldo_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProgramacionRespaldo_hora_check" CHECK ("hora" BETWEEN 0 AND 23),
    CONSTRAINT "ProgramacionRespaldo_minuto_check" CHECK ("minuto" BETWEEN 0 AND 59),
    CONSTRAINT "ProgramacionRespaldo_diaSemana_check" CHECK ("diaSemana" IS NULL OR "diaSemana" BETWEEN 0 AND 6),
    CONSTRAINT "ProgramacionRespaldo_retencion_check" CHECK ("retencionCantidad" BETWEEN 1 AND 365)
);

CREATE TABLE "EjecucionRespaldo" (
    "id" TEXT NOT NULL,
    "programacionId" TEXT NOT NULL,
    "clavePeriodo" TEXT NOT NULL,
    "estado" "EstadoEjecucionRespaldo" NOT NULL DEFAULT 'EN_PROCESO',
    "archivoNombre" TEXT,
    "archivoRuta" TEXT,
    "tamanoBytes" INTEGER,
    "cantidades" JSONB,
    "error" TEXT,
    "iniciadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizadaEn" TIMESTAMP(3),
    CONSTRAINT "EjecucionRespaldo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProgramacionRespaldo_activa_idx" ON "ProgramacionRespaldo"("activa");
CREATE UNIQUE INDEX "EjecucionRespaldo_programacionId_clavePeriodo_key" ON "EjecucionRespaldo"("programacionId", "clavePeriodo");
CREATE INDEX "EjecucionRespaldo_estado_iniciadaEn_idx" ON "EjecucionRespaldo"("estado", "iniciadaEn");
CREATE INDEX "EjecucionRespaldo_programacionId_iniciadaEn_idx" ON "EjecucionRespaldo"("programacionId", "iniciadaEn");
ALTER TABLE "EjecucionRespaldo" ADD CONSTRAINT "EjecucionRespaldo_programacionId_fkey" FOREIGN KEY ("programacionId") REFERENCES "ProgramacionRespaldo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
