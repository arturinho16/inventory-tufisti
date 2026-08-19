import type { SeccionFtf } from "./extraer-url";

export type DatosPantallaFtf = {
  tecnologia: string | null;
  tipoFormaPantalla: "PLANA" | "CURVA" | "DOS_PUNTO_CINCO_D" | "TRES_D" | "FLEXIBLE" | "PLEGABLE" | "OTRO";
  tipoFormaOtro: string | null;
  diagonalMm: number | null;
  diagonalPulgadas: number | null;
  anchoDisplayMm: number | null;
  altoDisplayMm: number | null;
  aspectRatio: string | null;
  resolucionAnchoPx: number | null;
  resolucionAltoPx: number | null;
  densidadPpi: number | null;
  profundidadColor: string | null;
  areaDisplayPorcentaje: number | null;
  cristalFrontal: string | null;
  refrescoHz: number | null;
};

const limpiar = (valor: string) => valor.replace(/\s+/g, " ").trim();
const numero = (valor: string | null, patron = /\d+(?:[.,]\d+)?/) => {
  const coincidencia = valor?.match(patron)?.[0];
  const parteNumerica = coincidencia?.match(/\d+(?:[.,]\d+)?/)?.[0];
  return parteNumerica ? Number(parteNumerica.replace(",", ".")) : null;
};
const etiquetaBase = (valor: string) => limpiar(valor).toLocaleLowerCase("es-MX");

function seccionDisplay(secciones: SeccionFtf[]) {
  return secciones.find((seccion) => {
    const clave = etiquetaBase(seccion.clave);
    const titulo = etiquetaBase(seccion.titulo);
    return clave === "display" || clave.startsWith("display_the_display") || titulo === "display" || titulo.startsWith("display the display");
  });
}

function valorCampo(seccion: SeccionFtf | undefined, ...inicios: string[]) {
  const campo = seccion?.campos.find((item) => inicios.some((inicio) => etiquetaBase(item.etiqueta).startsWith(inicio)));
  return campo?.valores.map(limpiar).filter(Boolean).join(" · ") || null;
}

function dimensionesDesdeDiagonal(diagonalMm: number | null, proporcion: string | null) {
  if (!diagonalMm || !proporcion) return { ancho: null, alto: null };
  const partes = proporcion.match(/(\d+(?:[.,]\d+)?)\s*:\s*(\d+(?:[.,]\d+)?)/);
  if (!partes) return { ancho: null, alto: null };
  const largo = Number(partes[1].replace(",", "."));
  const corto = Number(partes[2].replace(",", "."));
  if (!(largo > 0 && corto > 0)) return { ancho: null, alto: null };
  const factor = diagonalMm / Math.hypot(largo, corto);
  return { ancho: Number((corto * factor).toFixed(3)), alto: Number((largo * factor).toFixed(3)) };
}

export function extraerPantallaFtf(secciones: SeccionFtf[]): DatosPantallaFtf {
  const display = seccionDisplay(secciones);
  const tecnologia = valorCampo(display, "type/technology", "tipo");
  const diagonalTexto = valorCampo(display, "diagonal size", "tamaño");
  const diagonalPulgadas = numero(diagonalTexto);
  const diagonalMmFuente = numero(diagonalTexto, /\d+(?:[.,]\d+)?\s*mm/i);
  const diagonalMm = diagonalMmFuente ?? (diagonalPulgadas ? Number((diagonalPulgadas * 25.4).toFixed(3)) : null);
  const aspectRatio = valorCampo(display, "aspect ratio") ?? diagonalTexto?.match(/\d+(?:[.,]\d+)?\s*:\s*\d+(?:[.,]\d+)?/)?.[0].replace(/\s/g, "") ?? null;
  const anchoFuente = numero(valorCampo(display, "width"), /\d+(?:[.,]\d+)?\s*mm/i);
  const altoFuente = numero(valorCampo(display, "height"), /\d+(?:[.,]\d+)?\s*mm/i);
  const calculadas = dimensionesDesdeDiagonal(diagonalMm, aspectRatio);
  const resolucion = valorCampo(display, "resolution", "resolución")?.match(/(\d+)\s*[x×]\s*(\d+)/i);
  const tipo = etiquetaBase(tecnologia ?? "").includes("foldable") ? "PLEGABLE" as const : "OTRO" as const;
  const profundidad = valorCampo(display, "color depth") ?? tecnologia?.match(/\b(?:\d+(?:[.,]\d+)?[mb](?:\s*colores?)?|\d+\s*colores?)\b/i)?.[0] ?? null;
  const proteccion = valorCampo(display, "protección");
  const extra = valorCampo(display, "other features", "extra");
  return {
    tecnologia,
    tipoFormaPantalla: tipo,
    tipoFormaOtro: tipo === "OTRO" ? "No especificada por la FTF" : null,
    diagonalMm,
    diagonalPulgadas,
    anchoDisplayMm: anchoFuente ?? calculadas.ancho,
    altoDisplayMm: altoFuente ?? calculadas.alto,
    aspectRatio,
    resolucionAnchoPx: resolucion ? Number(resolucion[1]) : null,
    resolucionAltoPx: resolucion ? Number(resolucion[2]) : null,
    densidadPpi: numero(valorCampo(display, "pixel density", "densidad"), /\d+(?=\s*ppi)/i),
    profundidadColor: profundidad,
    areaDisplayPorcentaje: numero(valorCampo(display, "display area")),
    cristalFrontal: proteccion && etiquetaBase(proteccion) !== "no" ? proteccion : null,
    refrescoHz: numero(extra, /\d+(?=\s*hz)/i),
  };
}

export const CAMPOS_PANTALLA_OBLIGATORIOS: Array<keyof DatosPantallaFtf> = [
  "tecnologia", "diagonalMm", "diagonalPulgadas", "anchoDisplayMm", "altoDisplayMm", "aspectRatio",
  "resolucionAnchoPx", "resolucionAltoPx", "densidadPpi", "profundidadColor", "areaDisplayPorcentaje",
];

export function faltantesPantallaFtf(datos: DatosPantallaFtf) {
  return CAMPOS_PANTALLA_OBLIGATORIOS.filter((campo) => datos[campo] === null || datos[campo] === "");
}
