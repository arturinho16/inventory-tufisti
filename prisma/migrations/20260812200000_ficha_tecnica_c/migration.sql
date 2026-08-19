CREATE TABLE "FichaTecnicaC" (
  "id" TEXT NOT NULL,
  "productoId" TEXT NOT NULL,
  "geometriaPrevista" TEXT,
  "anchoExteriorMm" DECIMAL(8,3),
  "altoExteriorMm" DECIMAL(8,3),
  "grosorMm" DECIMAL(8,3),
  "radiosEsquina" TEXT,
  "aberturas" TEXT,
  "marcoBorde" TEXT,
  "curvatura" TEXT,
  "adhesivo" TEXT,
  "huellaComprobada" TEXT,
  "fuente" TEXT,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FichaTecnicaC_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FichaTecnicaC_productoId_key" ON "FichaTecnicaC"("productoId");
CREATE INDEX "FichaTecnicaC_anchoExteriorMm_altoExteriorMm_idx" ON "FichaTecnicaC"("anchoExteriorMm", "altoExteriorMm");
ALTER TABLE "FichaTecnicaC" ADD CONSTRAINT "FichaTecnicaC_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EspecificacionPantalla" ADD COLUMN "fuenteImagen" TEXT;
