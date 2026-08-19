ALTER TABLE "ImportacionFtfRegistro"
ADD COLUMN "disponibleEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "bloqueadoEn" TIMESTAMP(3);

CREATE TABLE "ImportacionFtfIntento" (
  "id" TEXT NOT NULL,
  "registroId" TEXT NOT NULL,
  "accion" TEXT NOT NULL,
  "proveedor" TEXT,
  "url" TEXT,
  "estado" "EstadoImportacionFtf" NOT NULL,
  "mensaje" TEXT NOT NULL,
  "marcaEncontrada" TEXT,
  "modeloEncontrado" TEXT,
  "diagonalEncontrada" DECIMAL(6,3),
  "metadatos" JSONB,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImportacionFtfIntento_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImportacionFtfRegistro_estado_disponibleEn_idx" ON "ImportacionFtfRegistro"("estado", "disponibleEn");
CREATE INDEX "ImportacionFtfIntento_registroId_creadoEn_idx" ON "ImportacionFtfIntento"("registroId", "creadoEn");
CREATE INDEX "ImportacionFtfIntento_estado_creadoEn_idx" ON "ImportacionFtfIntento"("estado", "creadoEn");
ALTER TABLE "ImportacionFtfIntento" ADD CONSTRAINT "ImportacionFtfIntento_registroId_fkey" FOREIGN KEY ("registroId") REFERENCES "ImportacionFtfRegistro"("id") ON DELETE CASCADE ON UPDATE CASCADE;
