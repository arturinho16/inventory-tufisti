CREATE TABLE "CuentaMercadoLibre" (
  "id" TEXT NOT NULL,
  "usuarioMercadoLibreId" TEXT NOT NULL,
  "apodo" TEXT,
  "sitioId" TEXT,
  "accessTokenCifrado" TEXT NOT NULL,
  "refreshTokenCifrado" TEXT NOT NULL,
  "tokenExpiraEn" TIMESTAMP(3) NOT NULL,
  "alcance" TEXT,
  "versionToken" INTEGER NOT NULL DEFAULT 1,
  "ultimoError" TEXT,
  "conectadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CuentaMercadoLibre_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CuentaMercadoLibre_usuarioMercadoLibreId_key" ON "CuentaMercadoLibre"("usuarioMercadoLibreId");
CREATE INDEX "CuentaMercadoLibre_tokenExpiraEn_idx" ON "CuentaMercadoLibre"("tokenExpiraEn");

CREATE TABLE "IntentoOAuthMercadoLibre" (
  "id" TEXT NOT NULL,
  "estadoHash" TEXT NOT NULL,
  "verificadorCifrado" TEXT NOT NULL,
  "expiraEn" TIMESTAMP(3) NOT NULL,
  "usadoEn" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntentoOAuthMercadoLibre_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IntentoOAuthMercadoLibre_estadoHash_key" ON "IntentoOAuthMercadoLibre"("estadoHash");
CREATE INDEX "IntentoOAuthMercadoLibre_expiraEn_idx" ON "IntentoOAuthMercadoLibre"("expiraEn");
