ALTER TABLE "EspecificacionPantalla"
  ALTER COLUMN "tecnologia" DROP NOT NULL,
  ALTER COLUMN "resolucionAnchoPx" DROP NOT NULL,
  ALTER COLUMN "resolucionAltoPx" DROP NOT NULL,
  ALTER COLUMN "densidadPpi" DROP NOT NULL,
  ALTER COLUMN "profundidadColor" DROP NOT NULL,
  ALTER COLUMN "areaDisplayPorcentaje" DROP NOT NULL,
  ADD COLUMN "esParcial" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "camposOmitidos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "metadatosCampos" JSONB;
