import Link from "next/link";
import { notFound } from "next/navigation";
import { ImagenProducto } from "@/components/productos/imagen-producto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const nombresForma: Record<string, string> = {
  PLANA: "Pantalla plana (cristal 2D)",
  CURVA: "Pantalla curva (3D o Dual-Edge)",
  DOS_PUNTO_CINCO_D: "Cristal 2.5D (pantalla plana con borde biselado)",
  TRES_D: "Waterfall o 4D (Quad-Curved)",
  FLEXIBLE: "Pantalla flexible",
  PLEGABLE: "Pantalla plegable",
  OTRO: "Otro tipo de pantalla",
};

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | number | null | undefined }) {
  return <div className="rounded-2xl bg-white/45 p-4"><dt className="text-sm font-semibold text-[var(--on-surface-variant)]">{etiqueta}</dt><dd className="mt-1 break-words font-mono text-sm">{valor ?? "No especificado"}</dd></div>;
}

export default async function DetalleRegistroTecnico({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await prisma.especificacionPantalla.findUnique({
    where: { id },
    include: { producto: { include: { linea: true, marca: true, tipoProducto: true, fichaTecnicaB: true } } },
  });
  if (!ficha) notFound();
  const producto = ficha.producto;
  const forma = ficha.tipoFormaPantalla === "OTRO" && ficha.tipoFormaOtro
    ? ficha.tipoFormaOtro
    : nombresForma[ficha.tipoFormaPantalla] ?? ficha.tipoFormaPantalla;

  return <main className="px-4 pb-28 pt-8 sm:px-8 xl:px-12">
    <header className="mb-8">
      <nav aria-label="Migas de pan" className="mb-3 flex items-center gap-2 text-sm text-[var(--on-surface-variant)]"><Link href="/paralelo/registros">Registros del paralelo visual</Link><i className="bx bx-chevron-right" aria-hidden="true" /><span>Ficha técnica</span></nav>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-[var(--primary)]">Smart Match</p><h1 className="text-3xl font-bold sm:text-5xl">Ficha técnica de pantalla</h1></div><Link href={`/paralelo/${id}/editar`} className="inline-flex items-center justify-center gap-2 rounded-full bg-purple-100 px-5 py-3 font-semibold text-[var(--primary)]"><i className="bx bx-edit-alt" aria-hidden="true" />Editar ficha</Link></div>
    </header>

    <section className="grid gap-6 rounded-[2.5rem] border border-white/60 bg-white/40 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl sm:p-8 lg:grid-cols-[18rem_1fr]">
      <div><div className="relative aspect-square overflow-hidden rounded-[2rem] bg-gradient-to-br from-purple-100 to-pink-100"><ImagenProducto url={producto.imagenUrl} descripcion={producto.descripcion} sizes="288px" icono="bx-mobile-alt" /></div><p className="mt-5 font-mono text-sm font-semibold text-[var(--primary)]">Clave: {producto.clave}</p><h2 className="mt-2 text-2xl font-bold">{producto.descripcion}</h2><p className="mt-2 text-[var(--on-surface-variant)]">{producto.marca.nombre} · {producto.modelo}</p></div>
      <div className="min-w-0"><h2 className="text-2xl font-semibold">Identificación</h2><dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><Dato etiqueta="Modelo" valor={producto.modelo} /><Dato etiqueta="Línea" valor={producto.linea.nombre} /><Dato etiqueta="Marca" valor={producto.marca.nombre} /><Dato etiqueta="Tipo de producto" valor={producto.tipoProducto.nombre} /><Dato etiqueta="Existencia" valor={producto.existencia} /><Dato etiqueta="Color" valor={producto.color} /></dl>
        <h2 className="mt-8 text-2xl font-semibold">Parámetros de pantalla</h2><dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><Dato etiqueta="Tecnología" valor={ficha.tecnologia} /><Dato etiqueta="Tipo o forma" valor={forma} /><Dato etiqueta="Diagonal" valor={`${ficha.diagonalPulgadas.toString()} pulgadas · ${ficha.diagonalMm.toString()} mm`} /><Dato etiqueta="Ancho del display" valor={`${ficha.anchoDisplayMm.toString()} mm`} /><Dato etiqueta="Alto del display" valor={`${ficha.altoDisplayMm.toString()} mm`} /><Dato etiqueta="Aspect ratio" valor={ficha.aspectRatio} /><Dato etiqueta="Resolución" valor={`${ficha.resolucionAnchoPx} × ${ficha.resolucionAltoPx} px`} /><Dato etiqueta="Densidad" valor={`${ficha.densidadPpi} ppi`} /><Dato etiqueta="Profundidad de color" valor={ficha.profundidadColor} /><Dato etiqueta="Área del display" valor={`${ficha.areaDisplayPorcentaje.toString()} %`} /><Dato etiqueta="Cristal frontal" valor={ficha.cristalFrontal} /><Dato etiqueta="Frecuencia de refresco" valor={ficha.refrescoHz ? `${ficha.refrescoHz} Hz` : null} /></dl>
        {producto.fichaTecnicaB && <><h2 className="mt-8 text-2xl font-semibold">Diseño físico y sensores</h2><dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><Dato etiqueta="Cuerpo" valor={producto.fichaTecnicaB.anchoCuerpoMm && producto.fichaTecnicaB.altoCuerpoMm ? `${producto.fichaTecnicaB.anchoCuerpoMm.toString()} × ${producto.fichaTecnicaB.altoCuerpoMm.toString()} mm` : null} /><Dato etiqueta="Grosor" valor={producto.fichaTecnicaB.grosorCuerpoMm ? `${producto.fichaTecnicaB.grosorCuerpoMm.toString()} mm` : null} /><Dato etiqueta="Bisel lateral" valor={producto.fichaTecnicaB.biselLateralMm ? `${producto.fichaTecnicaB.biselLateralMm.toString()} mm/lado` : null} /><Dato etiqueta="Bisel vertical total" valor={producto.fichaTecnicaB.biselVerticalTotalMm ? `${producto.fichaTecnicaB.biselVerticalTotalMm.toString()} mm` : null} /><Dato etiqueta="Curvatura" valor={producto.fichaTecnicaB.curvatura} /><Dato etiqueta="Tipo de huella" valor={producto.fichaTecnicaB.tipoHuella} /><Dato etiqueta="Huella bajo pantalla" valor={producto.fichaTecnicaB.huellaBajoPantalla === null ? null : producto.fichaTecnicaB.huellaBajoPantalla ? "Sí" : "No"} /><Dato etiqueta="Sensores" valor={producto.fichaTecnicaB.sensores.join(", ") || null} /></dl></>}
      </div>
    </section>
  </main>;
}
