import "dotenv/config";

import { readFile } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, TipoFormaPantalla } from "../src/generated/prisma/client";
import { copiarImagenExterna } from "../src/lib/imagenes/almacen-local";
import { esquemaFichaTecnicaExtraida, normalizarFormaYCristalFrontal } from "../src/lib/openai/analizar-ficha-tecnica";

type Fila = {
  clave: string;
  descripcion: string;
  existencia: number;
  modelo: string;
  imagenurl: string;
  marca: string;
  linea: string;
  tipoproducto: string;
  color: string;
};

type Resultado = { fila: Fila; datos: unknown };

function argumento(nombre: string) {
  const indice = process.argv.indexOf(nombre);
  return indice >= 0 ? process.argv[indice + 1] : undefined;
}

const ruta = argumento("--resultados");
const aplicar = process.argv.includes("--aplicar");
const completarSeisDigitos = process.argv.includes("--completar-seis-digitos");

if (!ruta) throw new Error("Indica --resultados <archivo.json>.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no está configurada.");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const normalizarClave = (clave: string) =>
  completarSeisDigitos && /^\d{1,6}$/.test(clave) ? clave.padStart(6, "0") : clave;

async function main() {
  const contenido = JSON.parse(await readFile(ruta!, "utf8")) as { resultados: Resultado[] };
  const resultados = contenido.resultados.map((resultado) => ({
    fila: { ...resultado.fila, clave: normalizarClave(resultado.fila.clave) },
    datos: (() => {
      const datos = esquemaFichaTecnicaExtraida.parse(resultado.datos);
      return { ...datos, ...normalizarFormaYCristalFrontal(datos.cristalFrontal) };
    })(),
  }));

  if (!resultados.length) throw new Error("El archivo no contiene resultados.");
  if (new Set(resultados.map(({ fila }) => fila.clave)).size !== resultados.length) {
    throw new Error("Hay Claves duplicadas después de normalizarlas.");
  }

  const [lineas, marcas, tipos, existentes] = await Promise.all([
    prisma.linea.findMany({ select: { id: true, nombre: true } }),
    prisma.marca.findMany({ select: { id: true, nombre: true } }),
    prisma.tipoProducto.findMany({ select: { id: true, nombre: true } }),
    prisma.producto.findMany({
      where: { clave: { in: resultados.map(({ fila }) => fila.clave) } },
      select: { clave: true },
    }),
  ]);
  const buscar = <T extends { nombre: string }>(lista: T[], nombre: string) =>
    lista.find((item) => item.nombre.localeCompare(nombre, "es-MX", { sensitivity: "base" }) === 0);

  for (const { fila } of resultados) {
    if (!buscar(lineas, fila.linea)) throw new Error(`No existe la línea ${fila.linea}.`);
    if (!buscar(marcas, fila.marca)) throw new Error(`No existe la marca ${fila.marca}.`);
    if (!buscar(tipos, fila.tipoproducto)) throw new Error(`No existe el tipo ${fila.tipoproducto}.`);
  }

  console.log(JSON.stringify({
    total: resultados.length,
    crear: resultados.length - existentes.length,
    actualizar: existentes.length,
    claves: resultados.map(({ fila }) => fila.clave),
    modo: aplicar ? "aplicar" : "prueba",
  }, null, 2));
  if (!aplicar) return;

  const preparados: Array<(typeof resultados)[number] & {
    imagen: Awaited<ReturnType<typeof copiarImagenExterna>>;
  }> = [];
  for (const resultado of resultados) {
    console.log(`Descargando imagen ${resultado.fila.clave}...`);
    preparados.push({
      ...resultado,
      imagen: await copiarImagenExterna(
        resultado.fila.imagenurl,
        resultado.fila.clave,
        resultado.fila.modelo,
      ),
    });
  }

  await prisma.$transaction(async (tx) => {
    for (const { fila, datos, imagen } of preparados) {
      const linea = buscar(lineas, fila.linea)!;
      const marca = buscar(marcas, fila.marca)!;
      const tipo = buscar(tipos, fila.tipoproducto)!;
      const producto = await tx.producto.upsert({
        where: { clave: fila.clave },
        create: {
          clave: fila.clave,
          descripcion: fila.descripcion,
          existencia: fila.existencia,
          modelo: fila.modelo,
          color: fila.color || null,
          lineaId: linea.id,
          marcaId: marca.id,
          tipoProductoId: tipo.id,
          ...imagen,
        },
        update: {
          descripcion: fila.descripcion,
          existencia: fila.existencia,
          modelo: fila.modelo,
          color: fila.color || null,
          lineaId: linea.id,
          marcaId: marca.id,
          tipoProductoId: tipo.id,
          ...imagen,
        },
      });
      const ficha = {
        clave: fila.clave,
        modelo: fila.modelo,
        lineaId: linea.id,
        marcaId: marca.id,
        tecnologia: datos.tecnologia!,
        tipoFormaPantalla: datos.tipoFormaPantalla as TipoFormaPantalla,
        diagonalMm: datos.diagonalMm!,
        diagonalPulgadas: datos.diagonalPulgadas!,
        anchoDisplayMm: datos.anchoDisplayMm!,
        altoDisplayMm: datos.altoDisplayMm!,
        aspectRatio: datos.aspectRatio!,
        resolucionAnchoPx: datos.resolucionAnchoPx!,
        resolucionAltoPx: datos.resolucionAltoPx!,
        densidadPpi: datos.densidadPpi!,
        profundidadColor: datos.profundidadColor!,
        areaDisplayPorcentaje: datos.areaDisplayPorcentaje!,
        cristalFrontal: datos.cristalFrontal,
        refrescoHz: datos.refrescoHz,
      };
      await tx.especificacionPantalla.upsert({
        where: { productoId: producto.id },
        create: { productoId: producto.id, ...ficha },
        update: ficha,
      });
    }
  }, { timeout: 60_000 });
  console.log(`Importación recuperada: ${resultados.length} registros.`);
}

main().finally(() => prisma.$disconnect());
