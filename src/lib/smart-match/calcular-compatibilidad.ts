export interface PantallaComparable {
  anchoDisplayMm: number;
  altoDisplayMm: number;
  diagonalMm: number;
  tipoFormaPantalla: string;
  tipoFormaOtro?: string | null;
  aspectRatio: string;
  areaDisplayPorcentaje: number;
  cristalFrontal?: string | null;
  tecnologia?: string | null;
  anchoCuerpoMm?: number | null;
  altoCuerpoMm?: number | null;
  biselLateralMm?: number | null;
  biselVerticalTotalMm?: number | null;
  huellaBajoPantalla?: boolean | null;
}

export interface ResultadoCompatibilidad {
  porcentaje: number;
  diferenciaAnchoMm: number;
  diferenciaAltoMm: number;
  estado: "Compatible" | "Compatible con observaciones" | "No recomendado";
  nivel: "Alta compatibilidad" | "Compatibilidad probable" | "Requiere revisión" | "Baja compatibilidad";
  formaCoincide: boolean;
  coincidencias: string[];
  advertencias: string[];
}

export const CONFIGURACION_SMART_MATCH = {
  pesos: { ancho: 25, alto: 25, diagonal: 15, forma: 15, proporcion: 10, area: 5, cristalOTecnologia: 5, cuerpoAncho: 6, cuerpoAlto: 6, biseles: 3 },
  tolerancias: { anchoMm: 5, altoMm: 8, diagonalMm: 10, proporcion: 0.12, areaPorcentaje: 10, cuerpoAnchoMm: 3, cuerpoAltoMm: 5, biselMm: 2 },
  cercania: { anchoMm: 1, altoMm: 1.5, diagonalMm: 2, areaPorcentaje: 2 },
} as const;
const proximidad = (diferencia: number, tolerancia: number) => Math.max(0, 1 - diferencia / tolerancia);
const normalizar = (valor: string) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-MX").trim();
const proporcion = (valor: string) => {
  const partes = valor.split(":").map(Number);
  return partes.length === 2 && partes.every(Number.isFinite) && partes[1] > 0 ? partes[0] / partes[1] : null;
};

export function calcularCompatibilidad(objetivo: PantallaComparable, candidato: PantallaComparable): ResultadoCompatibilidad {
  const diferenciaAnchoMm = Math.abs(objetivo.anchoDisplayMm - candidato.anchoDisplayMm);
  const diferenciaAltoMm = Math.abs(objetivo.altoDisplayMm - candidato.altoDisplayMm);
  const diferenciaDiagonal = Math.abs(objetivo.diagonalMm - candidato.diagonalMm);
  const formaObjetivo = objetivo.tipoFormaPantalla === "OTRO" ? objetivo.tipoFormaOtro ?? "OTRO" : objetivo.tipoFormaPantalla;
  const formaCandidato = candidato.tipoFormaPantalla === "OTRO" ? candidato.tipoFormaOtro ?? "OTRO" : candidato.tipoFormaPantalla;
  const mismaForma = normalizar(formaObjetivo) === normalizar(formaCandidato);
  const ratioObjetivo = proporcion(objetivo.aspectRatio);
  const ratioCandidato = proporcion(candidato.aspectRatio);
  const { pesos, tolerancias, cercania } = CONFIGURACION_SMART_MATCH;
  const similitudRatio = ratioObjetivo && ratioCandidato ? proximidad(Math.abs(ratioObjetivo - ratioCandidato), tolerancias.proporcion) : normalizar(objetivo.aspectRatio) === normalizar(candidato.aspectRatio) ? 1 : 0;
  const cristalCoincide = Boolean(objetivo.cristalFrontal && candidato.cristalFrontal && normalizar(objetivo.cristalFrontal) === normalizar(candidato.cristalFrontal));
  const tecnologiaCoincide = Boolean(objetivo.tecnologia && candidato.tecnologia && normalizar(objetivo.tecnologia) === normalizar(candidato.tecnologia));
  const criterios: Array<[number, number]> = [
    [pesos.ancho, proximidad(diferenciaAnchoMm, tolerancias.anchoMm)],
    [pesos.alto, proximidad(diferenciaAltoMm, tolerancias.altoMm)],
    [pesos.diagonal, proximidad(diferenciaDiagonal, tolerancias.diagonalMm)],
    [pesos.forma, mismaForma ? 1 : 0.35],
    [pesos.proporcion, similitudRatio],
    [pesos.area, proximidad(Math.abs(objetivo.areaDisplayPorcentaje - candidato.areaDisplayPorcentaje), tolerancias.areaPorcentaje)],
  ];
  if (objetivo.cristalFrontal || candidato.cristalFrontal || objetivo.tecnologia || candidato.tecnologia) criterios.push([pesos.cristalOTecnologia, cristalCoincide || tecnologiaCoincide ? 1 : 0.4]);
  if (objetivo.anchoCuerpoMm != null && candidato.anchoCuerpoMm != null) criterios.push([pesos.cuerpoAncho, proximidad(Math.abs(objetivo.anchoCuerpoMm - candidato.anchoCuerpoMm), tolerancias.cuerpoAnchoMm)]);
  if (objetivo.altoCuerpoMm != null && candidato.altoCuerpoMm != null) criterios.push([pesos.cuerpoAlto, proximidad(Math.abs(objetivo.altoCuerpoMm - candidato.altoCuerpoMm), tolerancias.cuerpoAltoMm)]);
  if (objetivo.biselLateralMm != null && candidato.biselLateralMm != null) criterios.push([pesos.biseles, proximidad(Math.abs(objetivo.biselLateralMm - candidato.biselLateralMm), tolerancias.biselMm)]);
  const pesoDisponible = criterios.reduce((total, [peso]) => total + peso, 0);
  const porcentaje = Math.round(criterios.reduce((total, [peso, similitud]) => total + peso * similitud, 0) / pesoDisponible * 100);
  const coincidencias: string[] = [];
  const advertencias: string[] = [];
  if (diferenciaAnchoMm <= cercania.anchoMm) coincidencias.push(`Ancho muy cercano: diferencia de ${diferenciaAnchoMm.toFixed(2)} mm.`); else advertencias.push(`Diferencia de ancho: ${diferenciaAnchoMm.toFixed(2)} mm.`);
  if (diferenciaAltoMm <= cercania.altoMm) coincidencias.push(`Alto muy cercano: diferencia de ${diferenciaAltoMm.toFixed(2)} mm.`); else advertencias.push(`Diferencia de alto: ${diferenciaAltoMm.toFixed(2)} mm.`);
  if (diferenciaDiagonal <= cercania.diagonalMm) coincidencias.push(`Diagonal cercana: diferencia de ${diferenciaDiagonal.toFixed(2)} mm.`); else advertencias.push(`Diferencia de diagonal: ${diferenciaDiagonal.toFixed(2)} mm.`);
  if (mismaForma) coincidencias.push(`La forma de pantalla coincide: ${formaObjetivo}.`); else advertencias.push(`La forma no coincide: ${formaObjetivo} frente a ${formaCandidato}.`);
  if (similitudRatio >= 0.9) coincidencias.push(`La proporción ${candidato.aspectRatio} es compatible.`); else advertencias.push(`La proporción difiere: ${objetivo.aspectRatio} frente a ${candidato.aspectRatio}.`);
  const diferenciaArea = Math.abs(objetivo.areaDisplayPorcentaje - candidato.areaDisplayPorcentaje);
  if (diferenciaArea <= cercania.areaPorcentaje) coincidencias.push(`Área de pantalla cercana: diferencia de ${diferenciaArea.toFixed(2)} puntos.`); else advertencias.push(`Diferencia de área: ${diferenciaArea.toFixed(2)} puntos porcentuales.`);
  if (cristalCoincide) coincidencias.push("El cristal frontal coincide."); else if (tecnologiaCoincide) coincidencias.push("La tecnología de pantalla coincide."); else if (objetivo.cristalFrontal || candidato.cristalFrontal || objetivo.tecnologia || candidato.tecnologia) advertencias.push("El cristal frontal o la tecnología de pantalla no coinciden.");
  if (objetivo.anchoCuerpoMm != null && candidato.anchoCuerpoMm != null) coincidencias.push(`Smart Match comparó el ancho físico del cuerpo: diferencia de ${Math.abs(objetivo.anchoCuerpoMm - candidato.anchoCuerpoMm).toFixed(2)} mm.`);
  if (objetivo.altoCuerpoMm != null && candidato.altoCuerpoMm != null) coincidencias.push(`Smart Match comparó el alto físico del cuerpo: diferencia de ${Math.abs(objetivo.altoCuerpoMm - candidato.altoCuerpoMm).toFixed(2)} mm.`);
  if (objetivo.huellaBajoPantalla === true || candidato.huellaBajoPantalla === true) advertencias.push("Hay huella bajo pantalla; confirma compatibilidad del cristal con el sensor.");
  const nivel = porcentaje >= 90 ? "Alta compatibilidad" : porcentaje >= 75 ? "Compatibilidad probable" : porcentaje >= 50 ? "Requiere revisión" : "Baja compatibilidad";
  const estado = porcentaje >= 90 ? "Compatible" : porcentaje >= 50 ? "Compatible con observaciones" : "No recomendado";
  return { porcentaje, diferenciaAnchoMm, diferenciaAltoMm, estado, nivel, formaCoincide: mismaForma, coincidencias, advertencias };
}
