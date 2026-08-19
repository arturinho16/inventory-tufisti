import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function obtenerClave() {
  const valor = process.env.MERCADOLIBRE_TOKEN_ENCRYPTION_KEY?.trim();
  if (!valor) throw new Error("Falta MERCADOLIBRE_TOKEN_ENCRYPTION_KEY.");
  const clave = Buffer.from(valor, "base64");
  if (clave.length !== 32) throw new Error("MERCADOLIBRE_TOKEN_ENCRYPTION_KEY debe contener 32 bytes en Base64.");
  return clave;
}

export function cifrarSecreto(texto: string) {
  const iv = randomBytes(12);
  const cifrador = createCipheriv("aes-256-gcm", obtenerClave(), iv);
  const contenido = Buffer.concat([cifrador.update(texto, "utf8"), cifrador.final()]);
  return `v1.${iv.toString("base64url")}.${cifrador.getAuthTag().toString("base64url")}.${contenido.toString("base64url")}`;
}

export function descifrarSecreto(valor: string) {
  const [version, iv, etiqueta, contenido] = valor.split(".");
  if (version !== "v1" || !iv || !etiqueta || !contenido) throw new Error("Secreto cifrado inválido.");
  const descifrador = createDecipheriv("aes-256-gcm", obtenerClave(), Buffer.from(iv, "base64url"));
  descifrador.setAuthTag(Buffer.from(etiqueta, "base64url"));
  return Buffer.concat([descifrador.update(Buffer.from(contenido, "base64url")), descifrador.final()]).toString("utf8");
}

export const hashSeguro = (valor: string) => createHash("sha256").update(valor).digest("hex");
export const base64UrlSha256 = (valor: string) => createHash("sha256").update(valor).digest("base64url");
