CREATE TABLE "FichaTecnicaB" (
  "id" TEXT NOT NULL,
  "productoId" TEXT NOT NULL,
  "anchoCuerpoMm" DECIMAL(8,3),
  "altoCuerpoMm" DECIMAL(8,3),
  "grosorCuerpoMm" DECIMAL(8,3),
  "anchoDisplayMm" DECIMAL(8,3),
  "altoDisplayMm" DECIMAL(8,3),
  "diagonalDisplayMm" DECIMAL(8,3),
  "aspectRatio" TEXT,
  "areaDisplayPorcentaje" DECIMAL(5,2),
  "biselLateralMm" DECIMAL(8,3),
  "biselVerticalTotalMm" DECIMAL(8,3),
  "curvatura" TEXT,
  "pesoGramos" DECIMAL(8,3),
  "volumenCm3" DECIMAL(10,3),
  "materiales" TEXT,
  "colores" TEXT,
  "certificaciones" TEXT,
  "tipoHuella" TEXT,
  "huellaBajoPantalla" BOOLEAN,
  "sensores" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "advertencias" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "fuenteDf" TEXT,
  "fuenteSes" TEXT,
  "modeloOpenAI" TEXT,
  "analizadoEn" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FichaTecnicaB_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FichaTecnicaB_productoId_key" ON "FichaTecnicaB"("productoId");
CREATE INDEX "FichaTecnicaB_anchoCuerpoMm_altoCuerpoMm_idx" ON "FichaTecnicaB"("anchoCuerpoMm", "altoCuerpoMm");
CREATE INDEX "FichaTecnicaB_anchoDisplayMm_altoDisplayMm_idx" ON "FichaTecnicaB"("anchoDisplayMm", "altoDisplayMm");
CREATE INDEX "FichaTecnicaB_huellaBajoPantalla_idx" ON "FichaTecnicaB"("huellaBajoPantalla");
ALTER TABLE "FichaTecnicaB" ADD CONSTRAINT "FichaTecnicaB_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
