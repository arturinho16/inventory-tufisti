export interface PantallaComparable {
  anchoDisplayMm: number;
  altoDisplayMm: number;
  diagonalMm: number;
  tipoFormaPantalla: string;
  tipoFormaOtro?: string | null;
  aspectRatio: string;
  areaDisplayPorcentaje: number;
  cristalFrontal?: string | null;
}

export interface ResultadoCompatibilidad {
  porcentaje: number;
  diferenciaAnchoMm: number;
  diferenciaAltoMm: number;
  estado: "Compatible" | "Compatible con observaciones" | "No recomendado";
  coincidencias: string[];
  advertencias: string[];
}

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
  const similitudRatio = ratioObjetivo && ratioCandidato ? proximidad(Math.abs(ratioObjetivo - ratioCandidato), 0.12) : normalizar(objetivo.aspectRatio) === normalizar(candidato.aspectRatio) ? 1 : 0;
  const criterios: Array<[number, number]> = [
    [25, proximidad(diferenciaAnchoMm, 5)],
    [25, proximidad(diferenciaAltoMm, 8)],
    [15, proximidad(diferenciaDiagonal, 10)],
    [15, mismaForma ? 1 : 0.35],
    [10, similitudRatio],
    [5, proximidad(Math.abs(objetivo.areaDisplayPorcentaje - candidato.areaDisplayPorcentaje), 10)],
  ];
  if (objetivo.cristalFrontal && candidato.cristalFrontal) criterios.push([5, normalizar(objetivo.cristalFrontal) === normalizar(candidato.cristalFrontal) ? 1 : 0.4]);
  const pesoDisponible = criterios.reduce((total, [peso]) => total + peso, 0);
  const porcentaje = Math.round(criterios.reduce((total, [peso, similitud]) => total + peso * similitud, 0) / pesoDisponible * 100);
  const coincidencias: string[] = [];
  const advertencias: string[] = [];
  if (diferenciaAnchoMm <= 1) coincidencias.push(`Ancho muy cercano: diferencia de ${diferenciaAnchoMm.toFixed(2)} mm.`); else advertencias.push(`Diferencia de ancho: ${diferenciaAnchoMm.toFixed(2)} mm.`);
  if (diferenciaAltoMm <= 1.5) coincidencias.push(`Alto muy cercano: diferencia de ${diferenciaAltoMm.toFixed(2)} mm.`); else advertencias.push(`Diferencia de alto: ${diferenciaAltoMm.toFixed(2)} mm.`);
  if (mismaForma) coincidencias.push(`La forma de pantalla coincide: ${formaObjetivo}.`); else advertencias.push(`La forma no coincide: ${formaObjetivo} frente a ${formaCandidato}.`);
  if (similitudRatio >= 0.9) coincidencias.push(`La proporción ${candidato.aspectRatio} es compatible.`); else advertencias.push(`La proporción difiere: ${objetivo.aspectRatio} frente a ${candidato.aspectRatio}.`);
  const estado = porcentaje >= 90 ? "Compatible" : porcentaje >= 75 ? "Compatible con observaciones" : "No recomendado";
  return { porcentaje, diferenciaAnchoMm, diferenciaAltoMm, estado, coincidencias, advertencias };
}
