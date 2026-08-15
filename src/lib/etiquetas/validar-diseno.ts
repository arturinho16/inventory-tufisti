import type { ElementoEtiqueta, ProductoEtiqueta } from "../../types/etiqueta";
import { valorElemento } from "./adaptadores-termicos";

export interface ProblemaDiseno {
  tipo: "margen" | "superposicion" | "tamano-codigo" | "texto-recortado";
  nivel: "error" | "advertencia";
  mensaje: string;
  elementos: string[];
}

const TOLERANCIA_CRUCE = 3; // 0.5 mm: evita falsos positivos por redondeo durante el arrastre.
const nombres: Record<ElementoEtiqueta["tipo"], string> = { modelo: "Nombre/modelo", clave: "Clave", descripcion: "Descripción", codigo: "GTIN/código", linea: "Línea", marca: "Marca", barras: "Código de barras", qr: "Código QR" };
const seSuperponen = (a: ElementoEtiqueta, b: ElementoEtiqueta) => {
  const cruceHorizontal = Math.min(a.x + a.ancho, b.x + b.ancho) - Math.max(a.x, b.x);
  const cruceVertical = Math.min(a.y + a.alto, b.y + b.alto) - Math.max(a.y, b.y);
  return cruceHorizontal > TOLERANCIA_CRUCE && cruceVertical > TOLERANCIA_CRUCE;
};

export function validarDisenoEtiqueta({ elementos, anchoMm, altoMm, margenMm, producto }: { elementos: ElementoEtiqueta[]; anchoMm: number; altoMm: number; margenMm: number; producto: ProductoEtiqueta }) {
  const problemas: ProblemaDiseno[] = [];
  const margen = margenMm * 6, ancho = anchoMm * 6, alto = altoMm * 6;
  for (const elemento of elementos) {
    if (elemento.x < margen - TOLERANCIA_CRUCE || elemento.y < margen - TOLERANCIA_CRUCE || elemento.x + elemento.ancho > ancho - margen + TOLERANCIA_CRUCE || elemento.y + elemento.alto > alto - margen + TOLERANCIA_CRUCE) problemas.push({ tipo: "margen", nivel: "error", mensaje: `${nombres[elemento.tipo]} se sale del margen seguro de la etiqueta.`, elementos: [elemento.id] });
    if (elemento.tipo === "barras" && (elemento.ancho < 150 || elemento.alto < 48)) problemas.push({ tipo: "tamano-codigo", nivel: "error", mensaje: "El código de barras necesita al menos 25 × 8 mm para conservar legibilidad.", elementos: [elemento.id] });
    if (elemento.tipo === "qr" && (elemento.ancho < 90 || elemento.alto < 90 || Math.abs(elemento.ancho - elemento.alto) > 6)) problemas.push({ tipo: "tamano-codigo", nivel: "error", mensaje: "El código QR debe ser cuadrado y medir al menos 15 × 15 mm.", elementos: [elemento.id] });
    if (elemento.tipo !== "barras" && elemento.tipo !== "qr") {
      const caracteresPorLinea = Math.max(1, Math.floor(elemento.ancho / Math.max(1, elemento.tamanoFuente * 0.6)));
      const lineas = Math.max(1, Math.floor(elemento.alto / Math.max(1, elemento.tamanoFuente)));
      if (valorElemento(elemento.tipo, producto).length > caracteresPorLinea * lineas) problemas.push({ tipo: "texto-recortado", nivel: "advertencia", mensaje: "Un texto es más largo que su caja y se recortará al imprimir.", elementos: [elemento.id] });
    }
  }
  for (let indice = 0; indice < elementos.length; indice++) for (let otro = indice + 1; otro < elementos.length; otro++) if (seSuperponen(elementos[indice], elementos[otro])) problemas.push({ tipo: "superposicion", nivel: "error", mensaje: `${nombres[elementos[indice].tipo]} y ${nombres[elementos[otro].tipo]} están encimados.`, elementos: [elementos[indice].id, elementos[otro].id] });
  return problemas;
}
