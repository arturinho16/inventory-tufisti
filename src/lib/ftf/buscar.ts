import { extraerFichaFtf, type FichaFtfExtraida } from "./extraer-url";
import { crearUrlSmartGsm, normalizarMarca, normalizarModelo, validarIdentidadFtf } from "./validar";

const paginasMarca: Record<string, string> = {
  google: "e7aa12e", honor: "03cd1cd", motorola: "7a815", oneplus: "e7f78a",
  oppo: "46076a", realme: "83401ab", vivo: "b9e76e", xiaomi: "1e7667",
};

const limpiarHtml = (valor: string) => valor.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const tokens = (valor: string) => new Set(valor.split(/\s+/).filter((token) => token.length > 1));

function puntuacion(nombre: string, esperado: string, marca: string) {
  const a = normalizarModelo(nombre, marca), b = normalizarModelo(esperado, marca);
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 80;
  const ta = tokens(a), tb = tokens(b);
  const comunes = [...tb].filter((token) => ta.has(token)).length;
  return tb.size ? comunes / tb.size * 60 : 0;
}

export type CoincidenciaFtf = { url: string; ficha: FichaFtfExtraida; diferenciaDiagonal: number; puntuacionModelo: number };

export async function extraerDeviceSpecificationsGuardado(url: string) {
  const proveedorInterno = process.env.FTF_PROVIDER_URL;
  if (!proveedorInterno) throw new Error("El servicio Scrapling de DeviceSpecifications no está configurado.");
  const endpoint = new URL("/extraer", proveedorInterno); endpoint.searchParams.set("url", url);
  const respuesta = await fetch(endpoint, { cache: "no-store", signal: AbortSignal.timeout(180_000) });
  const datos = await respuesta.json() as { ficha?: FichaFtfExtraida; error?: string };
  if (!respuesta.ok || !datos.ficha) throw new Error(datos.error ?? `DeviceSpecifications respondió HTTP ${respuesta.status}.`);
  return datos.ficha;
}

export async function buscarFichaSmartGsm(marca: string, modelo: string, diagonal: number): Promise<CoincidenciaFtf> {
  const url = crearUrlSmartGsm(marca, modelo);
  const ficha = await extraerFichaFtf(url);
  const validacion = validarIdentidadFtf({ marca, modelo, diagonal }, ficha);
  if (!validacion.valida || validacion.diferencia === null) throw new Error(`SmartGSM respondió, pero la ficha ${ficha.marca} ${ficha.modelo} no coincidió de forma segura con ${marca} ${modelo} (${diagonal} in).`);
  return { url, ficha, diferenciaDiagonal: validacion.diferencia, puntuacionModelo: validacion.puntuacionModelo };
}

export async function buscarFichaDeviceSpecifications(marca: string, modelo: string, diagonal: number): Promise<CoincidenciaFtf> {
  const proveedorInterno = process.env.FTF_PROVIDER_URL;
  if (proveedorInterno) {
    const endpoint = new URL("/buscar", proveedorInterno); endpoint.searchParams.set("marca", marca); endpoint.searchParams.set("modelo", modelo);
    const respuesta = await fetch(endpoint, { cache: "no-store", signal: AbortSignal.timeout(180_000) });
    const datos = await respuesta.json() as { candidatos?: Array<{ url: string; ficha: FichaFtfExtraida }>; error?: string };
    if (!respuesta.ok) throw new Error(datos.error ?? `DeviceSpecifications respondió HTTP ${respuesta.status}`);
    const evaluadas = (datos.candidatos ?? []).flatMap((candidato) => { const validacion = validarIdentidadFtf({ marca, modelo, diagonal }, candidato.ficha); return validacion.valida && validacion.diferencia !== null ? [{ url: candidato.url, ficha: candidato.ficha, diferenciaDiagonal: validacion.diferencia, puntuacionModelo: validacion.puntuacionModelo }] : []; });
    const mejor = evaluadas.sort((a, b) => b.puntuacionModelo - a.puntuacionModelo || a.diferenciaDiagonal - b.diferenciaDiagonal)[0];
    if (!mejor) throw new Error(`DeviceSpecifications no produjo una coincidencia segura para ${marca} ${modelo}, ${diagonal} in.`);
    return mejor;
  }
  const idMarca = paginasMarca[normalizarMarca(marca).replace(/\s+/g, "")];
  if (!idMarca) throw new Error(`La búsqueda automática todavía no está configurada para la marca ${marca}.`);
  const respuesta = await fetch(`https://www.devicespecifications.com/en/brand/${idMarca}`, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; TUFIS-FTF/1.0)" }, cache: "no-store", signal: AbortSignal.timeout(30_000),
  });
  if (!respuesta.ok) throw new Error(`No fue posible consultar el catálogo de ${marca} (HTTP ${respuesta.status}).`);
  const html = await respuesta.text();
  const candidatos = [...html.matchAll(/href=["'](\/en\/model\/[a-z0-9]+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((item) => ({ url: `https://www.devicespecifications.com${item[1]}`, nombre: limpiarHtml(item[2]) }))
    .filter((item, indice, todos) => item.nombre && todos.findIndex((otro) => otro.url === item.url) === indice)
    .map((item) => ({ ...item, puntos: puntuacion(item.nombre, modelo, marca) }))
    .filter((item) => item.puntos >= 30).sort((a, b) => b.puntos - a.puntos).slice(0, 8);
  if (!candidatos.length) throw new Error(`DeviceSpecifications no devolvió modelos para ${marca} ${modelo}; posible verificación del proveedor.`);
  const evaluadas: CoincidenciaFtf[] = [];
  for (const candidato of candidatos) {
    try {
      const ficha = await extraerFichaFtf(candidato.url);
      const validacion = validarIdentidadFtf({ marca, modelo, diagonal }, ficha);
      if (validacion.valida && validacion.diferencia !== null) evaluadas.push({ url: candidato.url, ficha, diferenciaDiagonal: validacion.diferencia, puntuacionModelo: validacion.puntuacionModelo });
    } catch { /* Una variante inválida no cancela la búsqueda de las demás. */ }
  }
  const mejor = evaluadas.sort((a, b) => b.puntuacionModelo - a.puntuacionModelo || a.diferenciaDiagonal - b.diferenciaDiagonal)[0];
  if (!mejor) throw new Error(`Se encontraron nombres parecidos, pero ninguno coincidió en marca, modelo y diagonal (${diagonal} in).`);
  return mejor;
}

export async function buscarFichaFtf(marca: string, modelo: string, diagonal: number): Promise<CoincidenciaFtf> {
  try { return await buscarFichaDeviceSpecifications(marca, modelo, diagonal); }
  catch (deviceError) {
    try { return await buscarFichaSmartGsm(marca, modelo, diagonal); }
    catch (smartError) { throw new Error(`No hubo coincidencia automática. DeviceSpecifications: ${deviceError instanceof Error ? deviceError.message : "error desconocido"}. SmartGSM: ${smartError instanceof Error ? smartError.message : "error desconocido"}.`); }
  }
}
