import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

export const esquemaFichaB = z.object({
  anchoCuerpoMm: z.number().positive().nullable(), altoCuerpoMm: z.number().positive().nullable(), grosorCuerpoMm: z.number().positive().nullable(),
  anchoDisplayMm: z.number().positive().nullable(), altoDisplayMm: z.number().positive().nullable(), diagonalDisplayMm: z.number().positive().nullable(),
  aspectRatio: z.string().nullable(), areaDisplayPorcentaje: z.number().min(0).max(100).nullable(), curvatura: z.string().nullable(),
  pesoGramos: z.number().positive().nullable(), volumenCm3: z.number().positive().nullable(), materiales: z.string().nullable(), colores: z.string().nullable(), certificaciones: z.string().nullable(),
  tipoHuella: z.string().nullable(), huellaBajoPantalla: z.boolean().nullable(), sensores: z.array(z.string()), advertencias: z.array(z.string()),
});
export type DatosFichaB = z.infer<typeof esquemaFichaB> & { biselLateralMm: number | null; biselVerticalTotalMm: number | null };

export async function analizarFichaB(params: { df: Buffer; dfMime: string; ses: Buffer; sesMime: string; clave: string; modelo: string }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Falta configurar OPENAI_API_KEY en el servidor.");
  const modeloOpenAI = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const cliente = new OpenAI({ apiKey });
  const respuesta = await cliente.responses.parse({
    model: modeloOpenAI,
    input: [{ role: "user", content: [
      { type: "input_text", text: `Analiza estas dos capturas técnicas del teléfono ${params.modelo}, Clave ${params.clave}. La primera es Diseño físico (DF) y la segunda Sensores (SES). Extrae exclusivamente valores visibles. No inventes ni completes por conocimiento general. Convierte dimensiones a mm, peso a gramos y volumen a cm³. En curvatura conserva una descripción breve como plana, 2.5D, curva o la frase visible. tipoHuella debe indicar óptica, ultrasónica, capacitiva u otro texto visible. huellaBajoPantalla solo puede ser true si la fuente lo afirma; false si muestra otra ubicación; null si no se puede determinar. Incluye todos los sensores visibles. Agrega en advertencias cualquier dato ambiguo, ausente o que requiera medición física.` },
      { type: "input_image", image_url: `data:${params.dfMime};base64,${params.df.toString("base64")}`, detail: "high" },
      { type: "input_image", image_url: `data:${params.sesMime};base64,${params.ses.toString("base64")}`, detail: "high" },
    ] }],
    text: { format: zodTextFormat(esquemaFichaB, "ficha_tecnica_b") },
  });
  if (!respuesta.output_parsed) throw new Error("OpenAI no devolvió una Ficha B estructurada.");
  return { datos: { ...respuesta.output_parsed, biselLateralMm: null, biselVerticalTotalMm: null }, modeloOpenAI };
}
