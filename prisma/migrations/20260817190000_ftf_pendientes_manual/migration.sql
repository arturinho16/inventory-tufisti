CREATE TYPE "EstadoFichaFtfPendiente" AS ENUM ('PENDIENTE', 'ASOCIADA', 'DESCARTADA');

CREATE TABLE "FichaFtfPendiente" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "claveOrigen" TEXT,
    "marcaFuente" TEXT NOT NULL,
    "modeloFuente" TEXT NOT NULL,
    "diagonalFuente" DECIMAL(6,3),
    "urlFuente" TEXT NOT NULL,
    "proveedor" TEXT NOT NULL,
    "secciones" JSONB NOT NULL,
    "cantidadSecciones" INTEGER NOT NULL,
    "estado" "EstadoFichaFtfPendiente" NOT NULL DEFAULT 'PENDIENTE',
    "productoId" TEXT,
    "diagnostico" JSONB,
    "asociadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FichaFtfPendiente_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FichaFtfPendiente_sourceId_key" ON "FichaFtfPendiente"("sourceId");
CREATE INDEX "FichaFtfPendiente_estado_marcaFuente_modeloFuente_idx" ON "FichaFtfPendiente"("estado", "marcaFuente", "modeloFuente");
CREATE INDEX "FichaFtfPendiente_claveOrigen_idx" ON "FichaFtfPendiente"("claveOrigen");
CREATE INDEX "FichaFtfPendiente_productoId_idx" ON "FichaFtfPendiente"("productoId");
ALTER TABLE "FichaFtfPendiente" ADD CONSTRAINT "FichaFtfPendiente_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
