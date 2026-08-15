CREATE TYPE "EstadoNotificacionMercadoLibre" AS ENUM ('PENDIENTE', 'PROCESADA', 'IGNORADA', 'ERROR');

CREATE TABLE "NotificacionMercadoLibre" (
  "id" TEXT NOT NULL,
  "identificador" TEXT NOT NULL,
  "cuentaId" TEXT,
  "tema" TEXT NOT NULL,
  "recurso" TEXT NOT NULL,
  "aplicacionId" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "intentos" INTEGER NOT NULL DEFAULT 1,
  "estado" "EstadoNotificacionMercadoLibre" NOT NULL DEFAULT 'PENDIENTE',
  "payload" JSONB NOT NULL,
  "error" TEXT,
  "enviadaEn" TIMESTAMP(3),
  "recibidaEn" TIMESTAMP(3),
  "procesadaEn" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificacionMercadoLibre_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VentaMercadoLibre" (
  "id" TEXT NOT NULL,
  "cuentaId" TEXT NOT NULL,
  "ordenId" TEXT NOT NULL,
  "estado" TEXT NOT NULL,
  "fechaCreacion" TIMESTAMP(3) NOT NULL,
  "fechaCierre" TIMESTAMP(3),
  "importeTotal" DECIMAL(14,2) NOT NULL,
  "moneda" TEXT NOT NULL,
  "sincronizadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VentaMercadoLibre_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartidaVentaMercadoLibre" (
  "id" TEXT NOT NULL,
  "ventaId" TEXT NOT NULL,
  "publicacionId" TEXT NOT NULL,
  "variacionId" TEXT NOT NULL DEFAULT '',
  "titulo" TEXT NOT NULL,
  "cantidad" INTEGER NOT NULL,
  "precioUnitario" DECIMAL(14,2) NOT NULL,
  CONSTRAINT "PartidaVentaMercadoLibre_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificacionMercadoLibre_identificador_key" ON "NotificacionMercadoLibre"("identificador");
CREATE INDEX "NotificacionMercadoLibre_estado_creadoEn_idx" ON "NotificacionMercadoLibre"("estado", "creadoEn");
CREATE INDEX "NotificacionMercadoLibre_cuentaId_tema_creadoEn_idx" ON "NotificacionMercadoLibre"("cuentaId", "tema", "creadoEn");
CREATE UNIQUE INDEX "VentaMercadoLibre_cuentaId_ordenId_key" ON "VentaMercadoLibre"("cuentaId", "ordenId");
CREATE INDEX "VentaMercadoLibre_cuentaId_fechaCreacion_estado_idx" ON "VentaMercadoLibre"("cuentaId", "fechaCreacion", "estado");
CREATE UNIQUE INDEX "PartidaVentaMercadoLibre_ventaId_publicacionId_variacionId_key" ON "PartidaVentaMercadoLibre"("ventaId", "publicacionId", "variacionId");
CREATE INDEX "PartidaVentaMercadoLibre_publicacionId_variacionId_idx" ON "PartidaVentaMercadoLibre"("publicacionId", "variacionId");
ALTER TABLE "NotificacionMercadoLibre" ADD CONSTRAINT "NotificacionMercadoLibre_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "CuentaMercadoLibre"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VentaMercadoLibre" ADD CONSTRAINT "VentaMercadoLibre_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "CuentaMercadoLibre"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartidaVentaMercadoLibre" ADD CONSTRAINT "PartidaVentaMercadoLibre_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "VentaMercadoLibre"("id") ON DELETE CASCADE ON UPDATE CASCADE;
