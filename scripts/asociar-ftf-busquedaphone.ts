import { Pool } from "pg";
import type { Prisma } from "../src/generated/prisma/client";
import { prisma } from "../src/lib/prisma";
import { validarIdentidadFtf } from "../src/lib/ftf/validar";

type CampoOrigen = { label?: string; values?: unknown[] };
type SeccionOrigen = { section_key: string; section_name: string; data: { fields?: CampoOrigen[] } };
type FilaOrigen = {
  source_id: string;
  clave: string; brand: string; model: string; source_brand: string; source_model: string;
  diagonal_expected_in: string; diagonal_found_in: string | null; source_url: string;
  sections: SeccionOrigen[];
};

const sourceUrl = process.env.SOURCE_DATABASE_URL;
if (!sourceUrl) throw new Error("Define SOURCE_DATABASE_URL para leer busquedaPhone.");
const confirmar = process.argv.includes("--confirmar");
const importarPendientes = process.argv.includes("--importar-pendientes");
const origen = new Pool({ connectionString: sourceUrl, max: 2 });

function convertirSecciones(secciones: SeccionOrigen[]) {
  return secciones.map((seccion) => ({
    clave: seccion.section_key,
    titulo: seccion.section_name,
    campos: (seccion.data?.fields ?? []).flatMap((campo) => {
      const etiqueta = String(campo.label ?? "").trim();
      const valores = (campo.values ?? []).map((valor) => String(valor).trim()).filter(Boolean);
      return etiqueta && valores.length ? [{ etiqueta, valores }] : [];
    }),
  })).filter((seccion) => seccion.campos.length);
}

async function main() {
  const consulta = await origen.query<FilaOrigen>(`
    SELECT d.id::text AS source_id, s.clave, s.brand, s.model, d.brand AS source_brand, d.model AS source_model,
      s.diagonal_expected_in::text, dd.diagonal_in::text AS diagonal_found_in, d.source_url,
      COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'section_key', ds.section_key, 'section_name', ds.section_name, 'data', ds.data
      ) ORDER BY ds.section_order) FROM catalog_devicesection ds WHERE ds.device_id=d.id), '[]'::jsonb) AS sections
    FROM catalog_sourceinventoryitem s
    JOIN catalog_catalogdevice d ON d.id=s.device_id
    LEFT JOIN catalog_devicedisplay dd ON dd.device_id=d.id
    WHERE d.status='COMPLETED' AND d.identity_validated=true
    ORDER BY s.clave, d.completed_at DESC NULLS LAST
  `);
  const porClave = new Map<string, FilaOrigen[]>();
  for (const fila of consulta.rows) porClave.set(fila.clave, [...(porClave.get(fila.clave) ?? []), fila]);
  const productos = await prisma.producto.findMany({
    where: { clave: { in: [...porClave.keys()] } },
    include: { marca: { select: { nombre: true } }, especificacionPantalla: { select: { diagonalPulgadas: true } }, fichaTecnicaFull: { select: { id: true } } },
  });
  const resultados: Array<{ clave: string; modelo: string; resultado: string }> = [];
  let asociadas = 0;
  for (const producto of productos) {
    if (producto.fichaTecnicaFull) { resultados.push({ clave: producto.clave, modelo: producto.modelo, resultado: "Ya tenía FTF" }); continue; }
    const diagonalEsperada = producto.especificacionPantalla ? Number(producto.especificacionPantalla.diagonalPulgadas) : null;
    if (diagonalEsperada === null) { resultados.push({ clave: producto.clave, modelo: producto.modelo, resultado: "Sin diagonal técnica para validar" }); continue; }
    const evaluadas = (porClave.get(producto.clave) ?? []).map((fila) => {
      const diagonal = fila.diagonal_found_in === null ? null : Number(fila.diagonal_found_in);
      const validacion = validarIdentidadFtf(
        { marca: producto.marca.nombre, modelo: producto.modelo, diagonal: diagonalEsperada },
        { marca: fila.source_brand, modelo: fila.source_model, diagonal },
      );
      return { fila, diagonal, validacion };
    }).sort((a, b) => Number(b.validacion.valida) - Number(a.validacion.valida) || b.validacion.puntuacionModelo - a.validacion.puntuacionModelo || (a.validacion.diferencia ?? Infinity) - (b.validacion.diferencia ?? Infinity));
    const elegida = evaluadas[0];
    if (!elegida?.validacion.valida || elegida.diagonal === null || elegida.validacion.diferencia === null) {
      const diagnostico = elegida ? `modelo ${elegida.validacion.puntuacionModelo.toFixed(1)}%, variante ${elegida.validacion.variantesCoinciden ? "sí" : "no"}, diagonal ${elegida.validacion.diferencia?.toFixed(2) ?? "desconocida"}` : "sin candidata";
      resultados.push({ clave: producto.clave, modelo: producto.modelo, resultado: `Revisión: ${diagnostico}` });
      continue;
    }
    const secciones = convertirSecciones(elegida.fila.sections);
    if (!secciones.length) { resultados.push({ clave: producto.clave, modelo: producto.modelo, resultado: "Revisión: FTF sin secciones" }); continue; }
    if (confirmar) await prisma.fichaTecnicaFull.create({ data: {
      productoId: producto.id, urlFuente: elegida.fila.source_url,
      proveedor: elegida.fila.source_url.includes("smart-gsm.com") ? "SmartGSM" : elegida.fila.source_url.includes("vivo.com") ? "Vivo México" : "DeviceSpecifications",
      marcaFuente: elegida.fila.source_brand, modeloFuente: elegida.fila.source_model,
      diagonalFuente: elegida.diagonal, diferenciaDiagonal: elegida.validacion.diferencia,
      validacion: "MIGRADA_BUSQUEDAPHONE_VALIDADA", secciones: secciones as unknown as Prisma.InputJsonValue,
      cantidadSecciones: secciones.length,
    } });
    asociadas += 1;
    resultados.push({ clave: producto.clave, modelo: producto.modelo, resultado: `${confirmar ? "Asociada" : "Lista"}: ${elegida.fila.source_model}, ${secciones.length} secciones` });
  }
  const clavesSinProducto = [...porClave.keys()].filter((clave) => !productos.some((producto) => producto.clave === clave));
  let pendientesImportadas = 0;
  if (importarPendientes) {
    const urlsAsociadas = new Set((await prisma.fichaTecnicaFull.findMany({ select: { urlFuente: true } })).map(({ urlFuente }) => urlFuente));
    const dispositivos = new Map<string, FilaOrigen>();
    for (const fila of consulta.rows) if (!dispositivos.has(fila.source_id)) dispositivos.set(fila.source_id, fila);
    for (const fila of dispositivos.values()) {
      if (urlsAsociadas.has(fila.source_url)) continue;
      const secciones = convertirSecciones(fila.sections);
      if (!secciones.length) continue;
      await prisma.fichaFtfPendiente.upsert({
        where: { sourceId: fila.source_id },
        create: { sourceId: fila.source_id, claveOrigen: fila.clave, marcaFuente: fila.source_brand, modeloFuente: fila.source_model,
          diagonalFuente: fila.diagonal_found_in === null ? null : Number(fila.diagonal_found_in), urlFuente: fila.source_url,
          proveedor: fila.source_url.includes("smart-gsm.com") ? "SmartGSM" : fila.source_url.includes("vivo.com") ? "Vivo México" : "DeviceSpecifications",
          secciones: secciones as unknown as Prisma.InputJsonValue, cantidadSecciones: secciones.length },
        update: { claveOrigen: fila.clave, marcaFuente: fila.source_brand, modeloFuente: fila.source_model,
          diagonalFuente: fila.diagonal_found_in === null ? null : Number(fila.diagonal_found_in), urlFuente: fila.source_url,
          proveedor: fila.source_url.includes("smart-gsm.com") ? "SmartGSM" : fila.source_url.includes("vivo.com") ? "Vivo México" : "DeviceSpecifications",
          secciones: secciones as unknown as Prisma.InputJsonValue, cantidadSecciones: secciones.length },
      });
      pendientesImportadas += 1;
    }
  }
  console.log(JSON.stringify({ modo: confirmar ? "confirmado" : "simulacion", filasOrigen: consulta.rows.length, clavesOrigen: porClave.size, productosEncontrados: productos.length, asociadas, pendientesImportadas, clavesSinProducto, resultados }, null, 2));
}

main().finally(async () => { await origen.end(); await prisma.$disconnect(); });
