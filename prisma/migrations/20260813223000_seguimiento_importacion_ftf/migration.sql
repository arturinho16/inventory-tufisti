CREATE TYPE "EstadoImportacionFtf" AS ENUM ('VALIDANDO', 'VALIDADA', 'BUSCANDO', 'NO_ENCONTRADA', 'REVISION', 'IMPORTANDO', 'COMPLETADA', 'ERROR');

CREATE TABLE "ImportacionFtfLote" (
  "id" TEXT NOT NULL,
  "nombreArchivo" TEXT NOT NULL,
  "total" INTEGER NOT NULL,
  "estado" "EstadoImportacionFtf" NOT NULL DEFAULT 'VALIDANDO',
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ImportacionFtfLote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportacionFtfRegistro" (
  "id" TEXT NOT NULL,
  "loteId" TEXT NOT NULL,
  "fila" INTEGER NOT NULL,
  "clave" TEXT NOT NULL,
  "marca" TEXT NOT NULL,
  "modelo" TEXT NOT NULL,
  "diagonalEsperada" DECIMAL(6,3) NOT NULL,
  "estado" "EstadoImportacionFtf" NOT NULL DEFAULT 'VALIDANDO',
  "mensaje" TEXT,
  "urlFuente" TEXT,
  "marcaEncontrada" TEXT,
  "modeloEncontrado" TEXT,
  "diagonalEncontrada" DECIMAL(6,3),
  "datosProducto" JSONB NOT NULL,
  "intentos" INTEGER NOT NULL DEFAULT 0,
  "procesadoEn" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ImportacionFtfRegistro_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ImportacionFtfRegistro_loteId_fila_key" ON "ImportacionFtfRegistro"("loteId", "fila");
CREATE INDEX "ImportacionFtfLote_estado_creadoEn_idx" ON "ImportacionFtfLote"("estado", "creadoEn");
CREATE INDEX "ImportacionFtfRegistro_estado_marca_diagonalEsperada_idx" ON "ImportacionFtfRegistro"("estado", "marca", "diagonalEsperada");
CREATE INDEX "ImportacionFtfRegistro_clave_idx" ON "ImportacionFtfRegistro"("clave");
ALTER TABLE "ImportacionFtfRegistro" ADD CONSTRAINT "ImportacionFtfRegistro_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "ImportacionFtfLote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
