import { esGtinValido } from "../codigos-universales";
import type { ElementoEtiqueta, ProductoEtiqueta, TipoElementoEtiqueta } from "../../types/etiqueta";

export type LenguajeImpresora = "ZPL" | "EPL" | "TSPL";
export interface TrabajoTermico { anchoMm: number; altoMm: number; cantidad: number; dpi: number; elementos: ElementoEtiqueta[]; producto: ProductoEtiqueta; }

const limpiar = (valor: string) => valor.replace(/[\r\n]+/g, " ").trim();
const ascii = (valor: string) => limpiar(valor).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "?");
const puntos = (unidades: number, dpi: number) => Math.max(0, Math.round((unidades / 6 / 25.4) * dpi));
const mmPuntos = (mm: number, dpi: number) => Math.round((mm / 25.4) * dpi);
const escaparComillas = (valor: string) => valor.replace(/"/g, "'");
const capacidadTexto = (elemento: ElementoEtiqueta) => {
  const porLinea = Math.max(1, Math.floor(elemento.ancho / Math.max(1, elemento.tamanoFuente * 0.6)));
  const lineas = Math.max(1, Math.min(3, Math.floor(elemento.alto / Math.max(1, elemento.tamanoFuente))));
  return { porLinea, lineas, total: porLinea * lineas };
};

export function valorElemento(tipo: TipoElementoEtiqueta, producto: ProductoEtiqueta) {
  const valores: Record<Exclude<TipoElementoEtiqueta, "barras" | "qr">, string> = { modelo: producto.modelo, clave: `Clave: ${producto.clave}`, descripcion: producto.descripcion, codigo: producto.codigoUniversal ? `Código: ${producto.codigoUniversal}` : "Código: sin asignar", linea: `Línea: ${producto.linea}`, marca: `Marca: ${producto.marca}` };
  return tipo === "barras" || tipo === "qr" ? producto.codigoUniversal || producto.clave : valores[tipo];
}

function zpl(trabajo: TrabajoTermico) {
  const lineas = ["^XA", "^CI28", `^PW${mmPuntos(trabajo.anchoMm, trabajo.dpi)}`, `^LL${mmPuntos(trabajo.altoMm, trabajo.dpi)}`];
  for (const elemento of trabajo.elementos) {
    const x = puntos(elemento.x, trabajo.dpi), y = puntos(elemento.y, trabajo.dpi), ancho = puntos(elemento.ancho, trabajo.dpi), alto = puntos(elemento.alto, trabajo.dpi), valor = limpiar(valorElemento(elemento.tipo, trabajo.producto)).replace(/[\^~]/g, " ");
    if (elemento.tipo === "qr") lineas.push(`^FO${x},${y}^BQN,2,${Math.max(2, Math.min(10, Math.round(alto / 30)))}^FDLA,${valor}^FS`);
    else if (elemento.tipo === "barras") { const esEan = valor.length === 13 && esGtinValido(valor), modulos = esEan ? 95 : valor.length * 11 + 35, modulo = Math.max(1, Math.min(3, Math.floor(ancho / modulos))); lineas.push(`^FO${x},${y}^BY${modulo}^${esEan ? "BEN" : "BCN"},${Math.max(20, alto)},Y,N,N^FD${valor}^FS`); }
    else { const fuenteAlto = Math.max(10, puntos(elemento.tamanoFuente, trabajo.dpi)), fuenteAncho = Math.max(8, puntos(elemento.tamanoFuente * 0.75, trabajo.dpi)), capacidad = capacidadTexto(elemento), texto = valor.slice(0, capacidad.total); lineas.push(`^FO${x},${y}^A0N,${fuenteAlto},${fuenteAncho}^FB${Math.max(20, ancho)},${capacidad.lineas},0,L,0^FD${texto}^FS`); }
  }
  lineas.push(`^PQ${trabajo.cantidad}`, "^XZ"); return lineas.join("\n");
}

function epl(trabajo: TrabajoTermico) {
  const lineas = ["N", `q${mmPuntos(trabajo.anchoMm, trabajo.dpi)}`, `Q${mmPuntos(trabajo.altoMm, trabajo.dpi)},24`];
  for (const elemento of trabajo.elementos) {
    const x = puntos(elemento.x, trabajo.dpi), y = puntos(elemento.y, trabajo.dpi), alto = puntos(elemento.alto, trabajo.dpi), valor = escaparComillas(ascii(valorElemento(elemento.tipo, trabajo.producto)));
    if (elemento.tipo === "qr") lineas.push(`b${x},${y},Q,2,5,0,"${valor}"`);
    else if (elemento.tipo === "barras") lineas.push(`B${x},${y},0,1,2,4,${Math.max(20, alto)},B,"${valor}"`);
    else { const escala = Math.max(1, Math.min(5, Math.round(elemento.tamanoFuente / 10))); lineas.push(`A${x},${y},0,3,${escala},${escala},N,"${valor}"`); }
  }
  lineas.push(`P${trabajo.cantidad}`); return lineas.join("\n");
}

function tspl(trabajo: TrabajoTermico) {
  const lineas = [`SIZE ${trabajo.anchoMm} mm,${trabajo.altoMm} mm`, "GAP 2 mm,0", "DIRECTION 1", "CODEPAGE UTF-8", "CLS"];
  for (const elemento of trabajo.elementos) {
    const x = puntos(elemento.x, trabajo.dpi), y = puntos(elemento.y, trabajo.dpi), alto = puntos(elemento.alto, trabajo.dpi), valor = escaparComillas(limpiar(valorElemento(elemento.tipo, trabajo.producto)));
    if (elemento.tipo === "qr") lineas.push(`QRCODE ${x},${y},H,${Math.max(2, Math.min(10, Math.round(alto / 30)))},A,0,"${valor}"`);
    else if (elemento.tipo === "barras") lineas.push(`BARCODE ${x},${y},"${valor.length === 13 && esGtinValido(valor) ? "EAN13" : "128"}",${Math.max(20, alto)},1,0,2,2,"${valor}"`);
    else { const escala = Math.max(1, Math.min(10, Math.round(elemento.tamanoFuente / 8))); lineas.push(`TEXT ${x},${y},"0",0,${escala},${escala},"${valor}"`); }
  }
  lineas.push(`PRINT 1,${trabajo.cantidad}`); return lineas.join("\n");
}

export function crearComandosTermicos(lenguaje: LenguajeImpresora, trabajo: TrabajoTermico) {
  if (!trabajo.elementos.length) throw new Error("Agrega al menos un elemento a la etiqueta.");
  if (trabajo.cantidad < 1 || trabajo.cantidad > 100) throw new Error("La cantidad debe estar entre 1 y 100.");
  return lenguaje === "ZPL" ? zpl(trabajo) : lenguaje === "EPL" ? epl(trabajo) : tspl(trabajo);
}

export function lenguajeSugerido(nombreImpresora: string): LenguajeImpresora {
  const nombre = nombreImpresora.toLocaleLowerCase();
  if (nombre.includes("zpl")) return "ZPL";
  if (nombre.includes("eltron") || nombre.includes("lp 28") || nombre.includes("lp284")) return "EPL";
  if (nombre.includes("tsc") || nombre.includes("xprinter") || nombre.includes("tspl")) return "TSPL";
  return "ZPL";
}
