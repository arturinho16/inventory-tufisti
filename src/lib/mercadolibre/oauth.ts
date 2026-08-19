import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { base64UrlSha256, cifrarSecreto, descifrarSecreto, hashSeguro } from "./cifrado";

const TOKEN_URL = "https://api.mercadolibre.com/oauth/token";
const API_URL = "https://api.mercadolibre.com";

function configuracion() {
  const clientId = process.env.MERCADOLIBRE_CLIENT_ID?.trim();
  const clientSecret = process.env.MERCADOLIBRE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.MERCADOLIBRE_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) throw new Error("La integración de Mercado Libre no está configurada en el servidor.");
  return { clientId, clientSecret, redirectUri };
}

type RespuestaToken = { access_token: string; refresh_token: string; expires_in: number; scope?: string; user_id: number };

async function solicitarToken(datos: URLSearchParams) {
  const respuesta = await fetch(TOKEN_URL, { method: "POST", headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" }, body: datos, cache: "no-store" });
  if (!respuesta.ok) throw new Error(`Mercado Libre rechazó el intercambio de credenciales (${respuesta.status}).`);
  const token = await respuesta.json() as Partial<RespuestaToken>;
  if (!token.access_token || !token.refresh_token || !token.expires_in || !token.user_id) throw new Error("Mercado Libre devolvió una respuesta de autorización incompleta.");
  return token as RespuestaToken;
}

export async function crearAutorizacion() {
  const { clientId, redirectUri } = configuracion();
  const estado = randomBytes(32).toString("base64url");
  const verificador = randomBytes(64).toString("base64url");
  await prisma.intentoOAuthMercadoLibre.deleteMany({ where: { expiraEn: { lt: new Date() } } });
  await prisma.intentoOAuthMercadoLibre.create({ data: { estadoHash: hashSeguro(estado), verificadorCifrado: cifrarSecreto(verificador), expiraEn: new Date(Date.now() + 10 * 60_000) } });
  const url = new URL("https://auth.mercadolibre.com.mx/authorization");
  url.search = new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: redirectUri, state: estado, code_challenge: base64UrlSha256(verificador), code_challenge_method: "S256" }).toString();
  return url.toString();
}

export async function completarAutorizacion(codigo: string, estado: string) {
  const intento = await prisma.intentoOAuthMercadoLibre.findUnique({ where: { estadoHash: hashSeguro(estado) } });
  if (!intento || intento.usadoEn || intento.expiraEn <= new Date()) throw new Error("La autorización expiró o ya fue utilizada.");
  const reclamado = await prisma.intentoOAuthMercadoLibre.updateMany({ where: { id: intento.id, usadoEn: null }, data: { usadoEn: new Date() } });
  if (reclamado.count !== 1) throw new Error("La autorización ya fue utilizada.");
  const { clientId, clientSecret, redirectUri } = configuracion();
  const token = await solicitarToken(new URLSearchParams({ grant_type: "authorization_code", client_id: clientId, client_secret: clientSecret, code: codigo, redirect_uri: redirectUri, code_verifier: descifrarSecreto(intento.verificadorCifrado) }));
  let apodo: string | undefined; let sitioId: string | undefined;
  try {
    const respuesta = await fetch(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token.access_token}` }, cache: "no-store" });
    if (respuesta.ok) { const usuario = await respuesta.json() as { nickname?: string; site_id?: string }; apodo = usuario.nickname; sitioId = usuario.site_id; }
  } catch { /* La cuenta sigue conectada aunque el perfil temporalmente no responda. */ }
  return prisma.cuentaMercadoLibre.upsert({
    where: { usuarioMercadoLibreId: String(token.user_id) },
    create: { usuarioMercadoLibreId: String(token.user_id), apodo, sitioId, accessTokenCifrado: cifrarSecreto(token.access_token), refreshTokenCifrado: cifrarSecreto(token.refresh_token), tokenExpiraEn: new Date(Date.now() + token.expires_in * 1000), alcance: token.scope },
    update: { apodo, sitioId, accessTokenCifrado: cifrarSecreto(token.access_token), refreshTokenCifrado: cifrarSecreto(token.refresh_token), tokenExpiraEn: new Date(Date.now() + token.expires_in * 1000), alcance: token.scope, ultimoError: null, versionToken: { increment: 1 } },
  });
}

export async function obtenerAccessToken(cuentaId: string) {
  const cuenta = await prisma.cuentaMercadoLibre.findUniqueOrThrow({ where: { id: cuentaId } });
  if (cuenta.tokenExpiraEn.getTime() > Date.now() + 10 * 60_000) return descifrarSecreto(cuenta.accessTokenCifrado);
  const { clientId, clientSecret } = configuracion();
  try {
    const token = await solicitarToken(new URLSearchParams({ grant_type: "refresh_token", client_id: clientId, client_secret: clientSecret, refresh_token: descifrarSecreto(cuenta.refreshTokenCifrado) }));
    const actualizado = await prisma.cuentaMercadoLibre.updateMany({ where: { id: cuenta.id, versionToken: cuenta.versionToken }, data: { accessTokenCifrado: cifrarSecreto(token.access_token), refreshTokenCifrado: cifrarSecreto(token.refresh_token), tokenExpiraEn: new Date(Date.now() + token.expires_in * 1000), alcance: token.scope, ultimoError: null, versionToken: { increment: 1 } } });
    if (actualizado.count === 1) return token.access_token;
    const vigente = await prisma.cuentaMercadoLibre.findUniqueOrThrow({ where: { id: cuenta.id } });
    return descifrarSecreto(vigente.accessTokenCifrado);
  } catch (error) {
    await prisma.cuentaMercadoLibre.update({ where: { id: cuenta.id }, data: { ultimoError: "No fue posible renovar la autorización. Vuelve a conectar la cuenta." } });
    throw error;
  }
}
