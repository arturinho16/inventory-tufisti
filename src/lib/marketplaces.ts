export const MARKETPLACES = {
  MERCADO_LIBRE: { nombre: "Mercado Libre", abreviatura: "ML" },
  AMAZON: { nombre: "Amazon", abreviatura: "AMZ" },
  WALMART: { nombre: "Walmart", abreviatura: "WMT" },
  TIENDANUBE: { nombre: "Tienda Nube", abreviatura: "TNBE" },
  CLAROSHOP: { nombre: "ClaroShop", abreviatura: "CLSP" },
} as const;

export function datosMarketplace(valor: string) {
  return MARKETPLACES[valor as keyof typeof MARKETPLACES] ?? { nombre: valor, abreviatura: valor };
}
