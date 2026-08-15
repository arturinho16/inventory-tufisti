export type TipoElementoEtiqueta = "modelo" | "clave" | "descripcion" | "codigo" | "linea" | "marca" | "barras" | "qr";

export interface ElementoEtiqueta {
  id: string;
  tipo: TipoElementoEtiqueta;
  x: number;
  y: number;
  ancho: number;
  alto: number;
  tamanoFuente: number;
}

export interface ProductoEtiqueta {
  id: string;
  clave: string;
  descripcion: string;
  modelo: string;
  codigoUniversal: string | null;
  linea: string;
  marca: string;
}
