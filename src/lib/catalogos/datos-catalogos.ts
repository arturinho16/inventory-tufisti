export type TipoCatalogo = "linea" | "marca" | "tipoProducto";

export interface RegistroCatalogo {
  id: string;
  clave: string;
  nombre: string;
}

export const rutasCatalogo: Record<TipoCatalogo, string> = {
  linea: "lineas",
  marca: "marcas",
  tipoProducto: "tipos-producto",
};

export const tiposPorRuta: Record<string, TipoCatalogo> = {
  lineas: "linea",
  marcas: "marca",
  "tipos-producto": "tipoProducto",
};

export const etiquetasCatalogo: Record<TipoCatalogo, string> = {
  linea: "Línea",
  marca: "Marca",
  tipoProducto: "Tipo de producto",
};
