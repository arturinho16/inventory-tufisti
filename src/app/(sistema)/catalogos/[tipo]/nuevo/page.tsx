import Link from "next/link";
import { notFound } from "next/navigation";
import { FormularioCatalogo } from "@/components/catalogos/formulario-catalogo";
import { etiquetasCatalogo, tiposPorRuta } from "@/lib/catalogos/datos-catalogos";

export default async function NuevoCatalogo({ params }: { params: Promise<{ tipo: string }> }) {
  const { tipo: ruta } = await params; const tipo = tiposPorRuta[ruta]; if (!tipo) notFound();
  return <main className="px-4 pb-28 pt-8 sm:px-8 xl:px-12"><header className="mb-8"><nav aria-label="Migas de pan" className="mb-3 flex items-center gap-2 text-sm text-[var(--on-surface-variant)]"><Link href="/catalogos">Catálogos</Link><i className="bx bx-chevron-right" /><span>Nueva {etiquetasCatalogo[tipo].toLocaleLowerCase("es-MX")}</span></nav><h1 className="text-3xl font-bold sm:text-5xl">Crear {etiquetasCatalogo[tipo].toLocaleLowerCase("es-MX")}</h1></header><FormularioCatalogo tipo={tipo} /></main>;
}
