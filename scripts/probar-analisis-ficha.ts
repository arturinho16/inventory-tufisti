import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { analizarFichaTecnica } from "../src/lib/openai/analizar-ficha-tecnica";

async function main() {
  const rutaRelativa = process.argv[2] ?? "automatizacion/google/fichas-tecnicas/Google pixel 2.png";
  const rutaAbsoluta = resolve(rutaRelativa);
  const raizPermitida = `${resolve("automatizacion")}/`;

  if (!rutaAbsoluta.startsWith(raizPermitida)) {
    throw new Error("La imagen de prueba debe estar dentro de la carpeta automatizacion.");
  }

const mimeTypes = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
} as const;
  const extension = extname(rutaAbsoluta).toLowerCase() as keyof typeof mimeTypes;
  const mimeType = mimeTypes[extension];
  if (!mimeType) throw new Error("La imagen debe ser PNG, JPEG o WebP.");

  const imagen = await readFile(rutaAbsoluta);
  const modeloProducto = rutaAbsoluta.split("/").at(-1)?.replace(/\.[^.]+$/, "");
  const resultado = await analizarFichaTecnica({ imagen, mimeType, modeloProducto });

  console.log(JSON.stringify({ ruta: rutaRelativa, escrituraBaseDatos: false, ...resultado }, null, 2));
}

main().catch((causa) => {
  console.error(causa instanceof Error ? causa.message : "No fue posible analizar la ficha técnica.");
  process.exitCode = 1;
});
