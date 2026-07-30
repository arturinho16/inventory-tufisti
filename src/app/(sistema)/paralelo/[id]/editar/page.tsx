import Link from "next/link";
import { notFound } from "next/navigation";
import { FormularioEspecificacion } from "@/components/smart-match/formulario-especificacion";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export default async function EditarRegistroTecnico({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [especificacion, formasPersonalizadas] = await Promise.all([prisma.especificacionPantalla.findUnique({ where: { id }, include: { producto: { include: { linea: true, marca: true, tipoProducto: true } } } }), prisma.formaPantallaPersonalizada.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } })]);
  if (!especificacion) notFound();
  const p = especificacion.producto; const productos = [{ id: p.id, clave: p.clave, descripcion: p.descripcion, modelo: p.modelo, imagenUrl: p.imagenUrl, linea: p.linea.nombre, marca: p.marca.nombre, tipo: p.tipoProducto.nombre }];
  const inicial = { productoId: p.id, tecnologia: especificacion.tecnologia, tipoFormaPantalla: especificacion.tipoFormaPantalla, tipoFormaOtro: especificacion.tipoFormaOtro ?? "", diagonalMm: Number(especificacion.diagonalMm), diagonalPulgadas: Number(especificacion.diagonalPulgadas), anchoDisplayMm: Number(especificacion.anchoDisplayMm), altoDisplayMm: Number(especificacion.altoDisplayMm), aspectRatio: especificacion.aspectRatio, resolucionAnchoPx: especificacion.resolucionAnchoPx, resolucionAltoPx: especificacion.resolucionAltoPx, densidadPpi: especificacion.densidadPpi, profundidadColor: especificacion.profundidadColor, areaDisplayPorcentaje: Number(especificacion.areaDisplayPorcentaje), cristalFrontal: especificacion.cristalFrontal ?? "", refrescoHz: especificacion.refrescoHz };
  return <main className="px-4 pb-28 pt-8 sm:px-8 xl:px-12"><header className="mb-8"><nav aria-label="Migas de pan" className="mb-3 flex items-center gap-2 text-sm text-[var(--on-surface-variant)]"><Link href="/paralelo/registros">Registros técnicos</Link><i className="bx bx-chevron-right" /><span>Editar</span></nav><p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-[var(--primary)]">Smart Match</p><h1 className="text-3xl font-bold sm:text-5xl">Editar parámetros de pantalla</h1></header><FormularioEspecificacion productos={productos} formasPersonalizadas={formasPersonalizadas} inicial={inicial} especificacionId={id} /></main>;
}
