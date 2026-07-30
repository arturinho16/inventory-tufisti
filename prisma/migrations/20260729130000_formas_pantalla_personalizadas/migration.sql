CREATE TABLE "FormaPantallaPersonalizada" (
  "id" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FormaPantallaPersonalizada_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FormaPantallaPersonalizada_nombre_key" ON "FormaPantallaPersonalizada"("nombre");
CREATE INDEX "FormaPantallaPersonalizada_nombre_idx" ON "FormaPantallaPersonalizada"("nombre");
