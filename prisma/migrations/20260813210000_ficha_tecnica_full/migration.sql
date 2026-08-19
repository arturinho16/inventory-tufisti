CREATE TABLE "FichaTecnicaFull" (
  "id" TEXT NOT NULL,
  "productoId" TEXT NOT NULL,
  "urlFuente" TEXT NOT NULL,
  "proveedor" TEXT NOT NULL,
  "marcaFuente" TEXT NOT NULL,
  "modeloFuente" TEXT NOT NULL,
  "diagonalFuente" DECIMAL(6,3),
  "diferenciaDiagonal" DECIMAL(6,3),
  "validacion" TEXT NOT NULL,
  "secciones" JSONB NOT NULL,
  "cantidadSecciones" INTEGER NOT NULL,
  "extraidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FichaTecnicaFull_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FichaTecnicaFull_productoId_key" ON "FichaTecnicaFull"("productoId");
CREATE INDEX "FichaTecnicaFull_proveedor_idx" ON "FichaTecnicaFull"("proveedor");
CREATE INDEX "FichaTecnicaFull_marcaFuente_modeloFuente_idx" ON "FichaTecnicaFull"("marcaFuente", "modeloFuente");
ALTER TABLE "FichaTecnicaFull" ADD CONSTRAINT "FichaTecnicaFull_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
