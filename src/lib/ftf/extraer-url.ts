export type CampoFtf = { etiqueta: string; valores: string[] };
export type SeccionFtf = { clave: string; titulo: string; campos: CampoFtf[] };
export type FichaFtfExtraida = { proveedor: string; marca: string; modelo: string; diagonal: number | null; secciones: SeccionFtf[] };

const entidades = (valor: string) => valor
  .replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&times;/g, "×")
  .replace(/&#176;|&deg;/g, "°").replace(/&#181;|&micro;/g, "µ")
  .replace(/&#(\d+);/g, (_, numero) => String.fromCharCode(Number(numero))).replace(/\s+/g, " ").trim();
const clave = (valor: string) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const numero = (valor?: string) => { const encontrado = valor?.match(/\d+(?:[.,]\d+)?/); return encontrado ? Number(encontrado[0].replace(",", ".")) : null; };

function parsearDeviceSpecifications(html: string): FichaFtfExtraida {
  const titulo = entidades(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "").replace(/\s*-\s*Specifications.*$/i, "");
  const secciones: SeccionFtf[] = [];
  const patron = /<header[^>]*class="[^"]*section-header[^"]*"[^>]*>([\s\S]*?)<\/header>([\s\S]*?)(?=<header[^>]*class="[^"]*section-header|$)/gi;
  for (const coincidencia of html.matchAll(patron)) {
    const nombre = entidades(coincidencia[1]);
    const tabla = coincidencia[2].match(/<table[\s\S]*?<\/table>/i)?.[0] ?? "";
    const campos: CampoFtf[] = [];
    for (const fila of tabla.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const celdas = [...fila[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((celda) => entidades(celda[1]));
      if (celdas[0] && celdas[1]) campos.push({ etiqueta: celdas[0], valores: [celdas[1]] });
    }
    if (nombre && campos.length) secciones.push({ clave: clave(nombre), titulo: nombre, campos });
  }
  const identidad = secciones.find((seccion) => seccion.clave.includes("brand_and_model"));
  const valor = (etiqueta: string) => identidad?.campos.find((campo) => campo.etiqueta.toLowerCase() === etiqueta)?.valores[0];
  const marca = valor("brand") ?? titulo.split(/\s+/)[0] ?? "";
  const modelo = valor("model") ?? titulo.slice(marca.length).trim();
  const display = secciones.find((seccion) => seccion.clave === "display");
  const diagonal = numero(display?.campos.find((campo) => /diagonal size/i.test(campo.etiqueta))?.valores[0]);
  if (!marca || !modelo || !secciones.length) throw new Error("La página no contiene una FTF reconocible.");
  return { proveedor: "DeviceSpecifications", marca, modelo, diagonal, secciones };
}

function parsearSmartGsm(html: string): FichaFtfExtraida {
  const titulo = entidades(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "").split(":")[0];
  const secciones: SeccionFtf[] = [];
  const patron = /<div[^>]*class="[^"]*capitalize[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<table[^>]*>([\s\S]*?)<\/table>/gi;
  for (const coincidencia of html.matchAll(patron)) {
    const nombre = entidades(coincidencia[1]);
    const campos: CampoFtf[] = [];
    for (const fila of coincidencia[2].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const celdas = [...fila[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((celda) => entidades(celda[1]));
      if (celdas[0] && celdas[1]) campos.push({ etiqueta: celdas[0], valores: celdas[1].split("|").map((v) => v.trim()).filter(Boolean) });
    }
    if (nombre && campos.length) secciones.push({ clave: clave(nombre), titulo: nombre, campos });
  }
  const marca = titulo.split(/\s+/)[0] ?? "";
  const modelo = titulo.slice(marca.length).trim();
  const display = secciones.find((seccion) => seccion.clave === "display");
  const diagonal = numero(display?.campos.find((campo) => campo.etiqueta === "Tamaño")?.valores[0]);
  if (!marca || !modelo || !secciones.length) throw new Error("La página de SmartGSM no contiene una ficha reconocible.");
  return { proveedor: "SmartGSM", marca, modelo, diagonal, secciones };
}

export async function extraerFichaFtf(url: string): Promise<FichaFtfExtraida> {
  const enlace = new URL(url);
  if (enlace.protocol !== "https:") throw new Error("La URL debe usar HTTPS.");
  const host = enlace.hostname.replace(/^www\./, "");
  if (!["devicespecifications.com", "smart-gsm.com"].includes(host)) throw new Error("Sólo se admiten DeviceSpecifications y SmartGSM.");
  const respuesta = await fetch(enlace, { headers: { "user-agent": "Mozilla/5.0 (compatible; TUFIS-FTF/1.0)" }, cache: "no-store", signal: AbortSignal.timeout(30_000) });
  if (!respuesta.ok) throw new Error(`La fuente respondió HTTP ${respuesta.status}.`);
  const html = await respuesta.text();
  return host === "devicespecifications.com" ? parsearDeviceSpecifications(html) : parsearSmartGsm(html);
}
