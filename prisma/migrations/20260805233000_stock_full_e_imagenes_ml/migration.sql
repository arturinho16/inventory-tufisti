ALTER TABLE "ProductoMercadoLibre"
  ADD COLUMN "existenciaFullTotal" INTEGER,
  ADD COLUMN "existenciaFullDisponible" INTEGER,
  ADD COLUMN "existenciaFullNoDisponible" INTEGER,
  ADD COLUMN "detalleFullNoDisponible" JSONB,
  ADD COLUMN "stockFullConsultadoEn" TIMESTAMP(3),
  ADD COLUMN "errorImagen" TEXT;
