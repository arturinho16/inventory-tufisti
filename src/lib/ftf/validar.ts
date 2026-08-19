export const TOLERANCIA_DIAGONAL_FTF = 0.08;
export const PUNTUACION_MINIMA_MODELO_FTF = 95;

const TOKENS_CRITICOS = new Set(["pro", "pro+", "plus", "max", "mini", "lite", "ultra", "neo", "fe", "se", "xl", "5g", "4g", "ce", "gt"]);
const ALIAS_MARCA: Record<string, string> = { iphone: "apple", mi: "xiaomi" };

const texto = (valor: string) => valor
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/(?<=\w)-(?=\w)/g, " ")
  .replace(/[^a-z0-9+]+/g, " ")
  .trim()
  .replace(/\s+/g, " ");

export function normalizarMarca(valor: string) {
  const marca = texto(valor);
  return ALIAS_MARCA[marca] ?? marca;
}

export function normalizarModelo(valor: string, marca = "") {
  let modelo = texto(valor);
  const prefijo = `${normalizarMarca(marca)} `;
  if (marca && modelo.startsWith(prefijo)) modelo = modelo.slice(prefijo.length);
  return modelo.replace(/\b(\d+)\s*(pro|plus|max|mini|lite|ultra|neo|fe|se|xl|5g|4g|ce|gt)\b/g, "$1 $2").replace(/\s+/g, " ").trim();
}

export function crearUrlSmartGsm(marca: string, modelo: string) {
  const slug = `${normalizarMarca(marca)} ${normalizarModelo(modelo, marca)}`.replace(/\+/g, " plus ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `https://www.smart-gsm.com/moviles/${slug}`;
}

export function tokensCriticosModelo(valor: string) {
  return new Set(normalizarModelo(valor).split(" ").filter((token) => TOKENS_CRITICOS.has(token)));
}

function distanciaLevenshtein(a: string, b: string) {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let anterior = Array.from({ length: b.length + 1 }, (_, indice) => indice);
  for (let i = 1; i <= a.length; i += 1) {
    const actual = [i];
    for (let j = 1; j <= b.length; j += 1) actual[j] = Math.min(actual[j - 1] + 1, anterior[j] + 1, anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    anterior = actual;
  }
  return anterior[b.length];
}

export function puntuacionModeloFtf(esperado: string, fuente: string) {
  if (!esperado && !fuente) return 100;
  const longitud = Math.max(esperado.length, fuente.length);
  return longitud ? Math.max(0, (1 - distanciaLevenshtein(esperado, fuente) / longitud) * 100) : 0;
}

const mismosTokens = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((token) => b.has(token));

export function validarIdentidadFtf(esperado: { marca: string; modelo: string; diagonal: number }, fuente: { marca: string; modelo: string; diagonal: number | null }) {
  const marcaCoincide = normalizarMarca(esperado.marca) === normalizarMarca(fuente.marca);
  const esperadoModelo = normalizarModelo(esperado.modelo, esperado.marca);
  const fuenteModelo = normalizarModelo(fuente.modelo, fuente.marca);
  const puntuacionModelo = puntuacionModeloFtf(esperadoModelo, fuenteModelo);
  const tokensEsperados = tokensCriticosModelo(esperadoModelo);
  const tokensFuente = tokensCriticosModelo(fuenteModelo);
  const variantesCoinciden = mismosTokens(tokensEsperados, tokensFuente);
  const modeloCoincide = puntuacionModelo >= PUNTUACION_MINIMA_MODELO_FTF;
  const diferencia = fuente.diagonal === null ? null : Math.abs(esperado.diagonal - fuente.diagonal);
  const diagonalCoincide = diferencia !== null && diferencia <= TOLERANCIA_DIAGONAL_FTF + Number.EPSILON * 10;
  return {
    marcaCoincide, modeloCoincide, variantesCoinciden, diagonalCoincide, diferencia, puntuacionModelo,
    tokensEsperados: [...tokensEsperados].sort(), tokensFuente: [...tokensFuente].sort(),
    valida: marcaCoincide && modeloCoincide && variantesCoinciden && diagonalCoincide,
  };
}
