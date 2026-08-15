import { lookup } from "node:dns/promises";
import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import path from "node:path";

const TAMANO_MAXIMO = 5 * 1024 * 1024;
const DIRECTORIO_PUBLICO = "/imagenes/productos/";
type FormatoImagen = { extension: "jpg" | "png" | "webp"; mimeType: "image/jpeg" | "image/png" | "image/webp" };

export function limpiarSegmentoImagen(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-MX").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "producto";
}

export function crearNombreImagen(clave: string, modelo: string, extension: FormatoImagen["extension"]) {
  return `${limpiarSegmentoImagen(clave)}-${limpiarSegmentoImagen(modelo)}.${extension}`;
}

export function detectarFormatoImagen(buffer: Uint8Array): FormatoImagen | undefined {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { extension: "jpg", mimeType: "image/jpeg" };
  if (buffer.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, indice) => buffer[indice] === byte)) return { extension: "png", mimeType: "image/png" };
  if (buffer.length >= 12 && Buffer.from(buffer.subarray(0, 4)).toString("ascii") === "RIFF" && Buffer.from(buffer.subarray(8, 12)).toString("ascii") === "WEBP") return { extension: "webp", mimeType: "image/webp" };
  return undefined;
}

function esDireccionPrivada(direccion: string) {
  const normalizada = direccion.toLocaleLowerCase();
  if (normalizada === "::" || normalizada === "::1" || normalizada === "0:0:0:0:0:0:0:1" || normalizada.startsWith("::ffff:") || normalizada.startsWith("fc") || normalizada.startsWith("fd") || normalizada.startsWith("fe8") || normalizada.startsWith("fe9") || normalizada.startsWith("fea") || normalizada.startsWith("feb")) return true;
  const partes = normalizada.split(".").map(Number);
  return partes.length === 4 && (partes[0] === 10 || partes[0] === 127 || partes[0] === 0 || (partes[0] === 169 && partes[1] === 254) || (partes[0] === 172 && partes[1] >= 16 && partes[1] <= 31) || (partes[0] === 192 && partes[1] === 168));
}

async function validarDestinoExterno(url: URL) {
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("El enlace debe utilizar HTTP o HTTPS.");
  if (url.username || url.password) throw new Error("El enlace no debe incluir credenciales.");
  const direcciones = isIP(url.hostname) ? [{ address: url.hostname }] : await lookup(url.hostname, { all: true });
  if (!direcciones.length || direcciones.some(({ address }) => esDireccionPrivada(address))) throw new Error("El enlace apunta a una red privada o no permitida.");
}

async function descargar(urlInicial: string) {
  let url = new URL(urlInicial);
  for (let redireccion = 0; redireccion <= 3; redireccion++) {
    await validarDestinoExterno(url);
    const respuesta = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15_000), headers: { "User-Agent": "TUFIS-Imagenes/1.0", Accept: "image/jpeg,image/png,image/webp" } });
    if ([301, 302, 303, 307, 308].includes(respuesta.status)) {
      const destino = respuesta.headers.get("location");
      if (!destino || redireccion === 3) throw new Error("El enlace de imagen tiene demasiadas redirecciones.");
      url = new URL(destino, url); continue;
    }
    if (!respuesta.ok || !respuesta.body) throw new Error(`No fue posible descargar la imagen (HTTP ${respuesta.status}).`);
    const longitud = Number(respuesta.headers.get("content-length") || 0);
    if (longitud > TAMANO_MAXIMO) throw new Error("La imagen no debe superar 5 MB.");
    const lector = respuesta.body.getReader(), fragmentos: Uint8Array[] = []; let total = 0;
    while (true) {
      const { done, value } = await lector.read(); if (done) break;
      total += value.byteLength;
      if (total > TAMANO_MAXIMO) { await lector.cancel(); throw new Error("La imagen no debe superar 5 MB."); }
      fragmentos.push(value);
    }
    return Buffer.concat(fragmentos.map((fragmento) => Buffer.from(fragmento)), total);
  }
  throw new Error("No fue posible descargar la imagen.");
}

async function persistir(buffer: Buffer, clave: string, modelo: string) {
  if (!buffer.length) throw new Error("La imagen está vacía.");
  if (buffer.length > TAMANO_MAXIMO) throw new Error("La imagen no debe superar 5 MB.");
  const formato = detectarFormatoImagen(buffer);
  if (!formato) throw new Error("La imagen debe ser un archivo JPG, PNG o WebP válido.");
  const nombre = crearNombreImagen(clave, modelo, formato.extension);
  const directorio = path.join(process.cwd(), "public", "imagenes", "productos");
  const temporal = path.join(directorio, `.${nombre}.${process.pid}.tmp`);
  await mkdir(directorio, { recursive: true });
  await writeFile(temporal, buffer); await rename(temporal, path.join(directorio, nombre));
  return { imagenUrl: `${DIRECTORIO_PUBLICO}${nombre}`, imagenNombre: nombre, imagenMimeType: formato.mimeType, imagenTamano: buffer.length };
}

export async function guardarArchivoLocal(archivo: File, clave: string, modelo: string) {
  return persistir(Buffer.from(await archivo.arrayBuffer()), clave, modelo);
}

export async function copiarImagenExterna(url: string, clave: string, modelo: string) {
  return persistir(await descargar(url), clave, modelo);
}

export async function copiarImagenMercadoLibre(url: string, publicacionId: string, variacionId = "") {
  const imagen = await copiarImagenExterna(url, `ml-${publicacionId}`, variacionId || "principal");
  if ((imagen.imagenTamano ?? 0) <= 3 * 1024 * 1024) return imagen;
  await eliminarImagenLocal(imagen.imagenUrl);
  throw new Error("La imagen de Mercado Libre supera 3 MB.");
}

export async function eliminarImagenLocal(url?: string | null) {
  if (!url?.startsWith(DIRECTORIO_PUBLICO)) return;
  const nombre = path.basename(url);
  if (url !== `${DIRECTORIO_PUBLICO}${nombre}`) return;
  try { await unlink(path.join(process.cwd(), "public", "imagenes", "productos", nombre)); } catch (causa) {
    if ((causa as NodeJS.ErrnoException).code !== "ENOENT") throw causa;
  }
}
