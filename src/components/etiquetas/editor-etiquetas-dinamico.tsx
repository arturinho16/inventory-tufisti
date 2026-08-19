"use client";

import dynamic from "next/dynamic";
import type { ProductoEtiqueta } from "@/types/etiqueta";

const EditorEtiquetas = dynamic(() => import("./editor-etiquetas").then((modulo) => modulo.EditorEtiquetas), { ssr: false, loading: () => <div className="grid min-h-96 place-items-center rounded-[2.5rem] bg-white/40"><span>Cargando editor de etiquetas…</span></div> });

export function EditorEtiquetasDinamico({ producto }: { producto: ProductoEtiqueta }) {
  return <EditorEtiquetas producto={producto} />;
}
