import Link from "next/link";
import { notFound } from "next/navigation";
import { FormularioCatalogo } from "@/components/catalogos/formulario-catalogo";
import { etiquetasCatalogo, tiposPorRuta } from "@/lib/catalogos/datos-catalogos";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export default async function EditarCatalogo({ params }: { params: Promise<{ tipo: string; id: string }> }) {
  const { tipo: ruta, id } = await params; const tipo = tiposPorRuta[ruta]; if (!tipo) notFound();
  const registro = tipo === "linea" ? await prisma.linea.findUnique({ where: { id }, select: { id: true, clave: true, nombre: true } }) : tipo === "marca" ? await prisma.marca.findUnique({ where: { id }, select: { id: true, clave: true, nombre: true } }) : await prisma.tipoProducto.findUnique({ where: { id }, select: { id: true, clave: true, nombre: true } });
  if (!registro) notFound();
  return <main className="px-4 pb-28 pt-8 sm:px-8 xl:px-12"><header className="mb-8"><nav aria-label="Migas de pan" className="mb-3 flex items-center gap-2 text-sm text-[var(--on-surface-variant)]"><Link href="/catalogos">Catálogos</Link><i className="bx bx-chevron-right" /><span>Editar {etiquetasCatalogo[tipo].toLocaleLowerCase("es-MX")}</span></nav><h1 className="text-3xl font-bold sm:text-5xl">Editar {etiquetasCatalogo[tipo].toLocaleLowerCase("es-MX")}</h1></header><FormularioCatalogo tipo={tipo} registro={registro} /></main>;
}
