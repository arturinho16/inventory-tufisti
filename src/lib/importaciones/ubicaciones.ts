export type MarketplaceImportacion = "MERCADO_LIBRE" | "AMAZON" | "WALMART" | "TIENDANUBE" | "CLAROSHOP";

export type UbicacionImportacion = {
  almacen: string;
  cuentaAsociada: string;
  marketplace: MarketplaceImportacion;
};

const marketplaces = new Map<string, MarketplaceImportacion>([
  ["mercado libre", "MERCADO_LIBRE"],
  ["mercadolibre", "MERCADO_LIBRE"],
  ["ml", "MERCADO_LIBRE"],
  ["amazon", "AMAZON"],
  ["walmart", "WALMART"],
  ["tienda nube", "TIENDANUBE"],
  ["tiendanube", "TIENDANUBE"],
  ["claroshop", "CLAROSHOP"],
  ["claro shop", "CLAROSHOP"],
]);

function normalizar(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es-MX");
}

function separar(valor: string) {
  return valor.split("|").map((parte) => parte.trim());
}

export function interpretarUbicacionesImportacion(entrada: {
  almacenubicacion: string;
  cuentaasociada: string;
  marketplace: string;
}): UbicacionImportacion[] {
  const almacenes = separar(entrada.almacenubicacion);
  const cuentas = separar(entrada.cuentaasociada);
  const mercados = separar(entrada.marketplace);
  if (almacenes.some((valor) => !valor) || cuentas.some((valor) => !valor) || mercados.some((valor) => !valor)) {
    throw new Error("Las ubicaciones no pueden contener valores vacíos.");
  }
  if (almacenes.length !== cuentas.length || almacenes.length !== mercados.length) {
    throw new Error("Almacén, cuenta asociada y marketplace deben contener la misma cantidad de valores separados por |.");
  }
  const ubicaciones = almacenes.map((almacen, indice) => {
    const marketplace = marketplaces.get(normalizar(mercados[indice]));
    if (!marketplace) throw new Error(`Marketplace no válido: ${mercados[indice]}.`);
    return { almacen, cuentaAsociada: cuentas[indice], marketplace };
  });
  const unicas = new Set(ubicaciones.map((ubicacion) => `${normalizar(ubicacion.almacen)}\0${normalizar(ubicacion.cuentaAsociada)}\0${ubicacion.marketplace}`));
  if (unicas.size !== ubicaciones.length) throw new Error("La fila contiene ubicaciones duplicadas.");
  return ubicaciones;
}

export function etiquetaUbicacionesImportacion(ubicaciones: UbicacionImportacion[]) {
  return ubicaciones.map(({ almacen, cuentaAsociada, marketplace }) => `${almacen} · ${cuentaAsociada} · ${marketplace}`).join(" | ");
}
