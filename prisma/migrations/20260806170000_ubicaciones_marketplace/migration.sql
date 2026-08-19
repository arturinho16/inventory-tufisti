CREATE TYPE "Marketplace" AS ENUM ('MERCADO_LIBRE', 'AMAZON', 'WALMART', 'TIENDANUBE', 'CLAROSHOP');
CREATE TABLE "Ubicacion" ("id" TEXT NOT NULL, "almacen" TEXT NOT NULL, "cuentaAsociada" TEXT NOT NULL, "marketplace" "Marketplace" NOT NULL, "imagenUrl" TEXT, "imagenNombre" TEXT, "imagenMimeType" TEXT, "imagenTamano" INTEGER, "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "actualizadoEn" TIMESTAMP(3) NOT NULL, CONSTRAINT "Ubicacion_pkey" PRIMARY KEY ("id"));
CREATE TABLE "_ProductoToUbicacion" ("A" TEXT NOT NULL, "B" TEXT NOT NULL, CONSTRAINT "_ProductoToUbicacion_AB_pkey" PRIMARY KEY ("A", "B"));
CREATE UNIQUE INDEX "Ubicacion_almacen_cuentaAsociada_marketplace_key" ON "Ubicacion"("almacen", "cuentaAsociada", "marketplace");
CREATE INDEX "Ubicacion_marketplace_almacen_idx" ON "Ubicacion"("marketplace", "almacen");
CREATE INDEX "Ubicacion_cuentaAsociada_idx" ON "Ubicacion"("cuentaAsociada");
CREATE INDEX "_ProductoToUbicacion_B_index" ON "_ProductoToUbicacion"("B");
ALTER TABLE "_ProductoToUbicacion" ADD CONSTRAINT "_ProductoToUbicacion_A_fkey" FOREIGN KEY ("A") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ProductoToUbicacion" ADD CONSTRAINT "_ProductoToUbicacion_B_fkey" FOREIGN KEY ("B") REFERENCES "Ubicacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
