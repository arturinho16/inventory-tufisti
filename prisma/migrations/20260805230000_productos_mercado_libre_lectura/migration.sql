CREATE TABLE "ProductoMercadoLibre" (
  "id" TEXT NOT NULL,
  "cuentaId" TEXT NOT NULL,
  "publicacionId" TEXT NOT NULL,
  "variacionId" TEXT NOT NULL DEFAULT '',
  "userProductId" TEXT,
  "inventoryId" TEXT,
  "codigoVendedor" TEXT,
  "titulo" TEXT NOT NULL,
  "estado" TEXT NOT NULL,
  "condicion" TEXT,
  "logistica" TEXT NOT NULL,
  "existencia" INTEGER NOT NULL DEFAULT 0,
  "vendidos" INTEGER NOT NULL DEFAULT 0,
  "gtin" TEXT,
  "marca" TEXT,
  "modelo" TEXT,
  "imagenOrigenUrl" TEXT,
  "imagenUrl" TEXT,
  "imagenNombre" TEXT,
  "imagenMimeType" TEXT,
  "imagenTamano" INTEGER,
  "enlacePublicacion" TEXT,
  "actualizadoMercadoLibreEn" TIMESTAMP(3),
  "sincronizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductoMercadoLibre_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductoMercadoLibre_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "CuentaMercadoLibre"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ProductoMercadoLibre_cuentaId_publicacionId_variacionId_key" ON "ProductoMercadoLibre"("cuentaId", "publicacionId", "variacionId");
CREATE INDEX "ProductoMercadoLibre_cuentaId_estado_logistica_idx" ON "ProductoMercadoLibre"("cuentaId", "estado", "logistica");
CREATE INDEX "ProductoMercadoLibre_codigoVendedor_idx" ON "ProductoMercadoLibre"("codigoVendedor");
CREATE INDEX "ProductoMercadoLibre_marca_idx" ON "ProductoMercadoLibre"("marca");
CREATE INDEX "ProductoMercadoLibre_titulo_idx" ON "ProductoMercadoLibre"("titulo");
