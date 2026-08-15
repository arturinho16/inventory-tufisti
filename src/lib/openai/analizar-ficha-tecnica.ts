import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

export const esquemaFichaTecnicaExtraida = z.object({
  tecnologia: z.string().nullable(),
  diagonalMm: z.number().positive().nullable(),
  diagonalPulgadas: z.number().positive().nullable(),
  anchoDisplayMm: z.number().positive().nullable(),
  altoDisplayMm: z.number().positive().nullable(),
  aspectRatio: z.string().nullable(),
  resolucionAnchoPx: z.number().int().positive().nullable(),
  resolucionAltoPx: z.number().int().positive().nullable(),
  densidadPpi: z.number().int().positive().nullable(),
  profundidadColor: z.string().nullable(),
  areaDisplayPorcentaje: z.number().min(0).max(100).nullable(),
  cristalFrontal: z.string().nullable(),
  refrescoHz: z.number().int().positive().nullable(),
  advertencias: z.array(z.string()),
});

export const tiposFormaPantalla = ["PLANA", "CURVA", "DOS_PUNTO_CINCO_D", "TRES_D", "FLEXIBLE", "PLEGABLE", "OTRO"] as const;
export type TipoFormaPantallaExtraida = typeof tiposFormaPantalla[number];
export type FichaTecnicaExtraida = z.infer<typeof esquemaFichaTecnicaExtraida> & { tipoFormaPantalla: TipoFormaPantallaExtraida };

export function normalizarProfundidadColor(valor: string | null) {
  if (!valor) return null;
  const coincidencia = valor.match(/\b\d+(?:[.,]\d+)?\s*bits?\b/i);
  return coincidencia?.[0].replace(/\s+/g, " ").trim() ?? valor.split(/\r?\n/)[0].trim();
}

export function normalizarFormaYCristalFrontal(cristalFrontal: string | null): Pick<FichaTecnicaExtraida, "tipoFormaPantalla" | "cristalFrontal"> {
  const valor = cristalFrontal?.trim();
  if (!valor || valor.toLocaleLowerCase("en-US") === "null") {
    return { tipoFormaPantalla: "DOS_PUNTO_CINCO_D", cristalFrontal: "Gorilla Glass" };
  }

  if (/\b3d\s+curved\s+glass\s+screen\b/i.test(valor)) {
    return { tipoFormaPantalla: "CURVA", cristalFrontal: "Gorilla Glass" };
  }
  if (/\b(?:waterfall|quad[- ]curved|4d)\b/i.test(valor)) {
    return { tipoFormaPantalla: "TRES_D", cristalFrontal: "Gorilla Glass" };
  }
  if (/\b2[.,]5d\s+curved\s+glass\s+screen\b/i.test(valor)) {
    return { tipoFormaPantalla: "DOS_PUNTO_CINCO_D", cristalFrontal: "Gorilla Glass" };
  }

  return { tipoFormaPantalla: "DOS_PUNTO_CINCO_D", cristalFrontal: valor };
}

interface AnalizarFichaTecnicaParams {
  imagen: Buffer;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  modeloProducto?: string;
}

export async function analizarFichaTecnica({ imagen, mimeType, modeloProducto }: AnalizarFichaTecnicaParams) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Falta configurar OPENAI_API_KEY en el servidor.");

  const modelo = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const cliente = new OpenAI({ apiKey });
  const imagenBase64 = `data:${mimeType};base64,${imagen.toString("base64")}`;
  const respuesta = await cliente.responses.parse({
    model: modelo,
    input: [{
      role: "user",
      content: [
        {
          type: "input_text",
          text: `Extrae únicamente los datos técnicos visibles en esta imagen${modeloProducto ? ` del modelo ${modeloProducto}` : ""}. No inventes valores. Usa null cuando un dato no sea visible. Conserva la tecnología y profundidad de color como texto breve. Separa la resolución en ancho y alto: en una resolución 1080 x 1920, ancho es 1080 y alto es 1920. Para ancho y alto físicos usa milímetros, no centímetros. Para refrescoHz extrae la frecuencia visible; si aparece un rango como 60-120 Hz, usa la frecuencia máxima compatible (120) y anota el rango en advertencias. En advertencias indica también datos ambiguos, aproximados, calculados o ausentes que requieran revisión humana.`,
        },
        { type: "input_image", image_url: imagenBase64, detail: "high" },
      ],
    }],
    text: { format: zodTextFormat(esquemaFichaTecnicaExtraida, "ficha_tecnica") },
  });

  if (!respuesta.output_parsed) {
    throw new Error("OpenAI no devolvió una ficha técnica estructurada.");
  }

  return {
    datos: {
      ...respuesta.output_parsed,
      profundidadColor: normalizarProfundidadColor(respuesta.output_parsed.profundidadColor),
      ...normalizarFormaYCristalFrontal(respuesta.output_parsed.cristalFrontal),
    },
    metadatos: {
      modelo,
      respuestaId: respuesta.id,
      tokensEntrada: respuesta.usage?.input_tokens ?? null,
      tokensSalida: respuesta.usage?.output_tokens ?? null,
      tokensTotales: respuesta.usage?.total_tokens ?? null,
    },
  };
}
