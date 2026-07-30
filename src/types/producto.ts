export type TipoProductoVista = "Teléfono" | "Cristal templado" | "Otro";
export interface ProductoInventario {
  id: string; clave: string; descripcion: string; imagenUrl?: string;
  existencia: number; modelo: string; color: string; claveMLFull: string;
  codigoUniversal: string; tipoProducto: TipoProductoVista; linea: string; marca: string;
}
