"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { eliminarEspecificacion } from "@/actions/especificaciones";
import { ImagenProducto } from "@/components/productos/imagen-producto";

export interface RegistroTecnico {
  id: string;
  clave: string;
  descripcion: string;
  imagenUrl: string | null;
  modelo: string;
  linea: string;
  marca: string;
  tipoProducto: string;
  existencia: number;
  color: string | null;
  tecnologia: string;
  tipoFormaPantalla: string;
  tipoFormaOtro: string | null;
  diagonalMm: string;
  diagonalPulgadas: string;
  anchoDisplayMm: string;
  altoDisplayMm: string;
  aspectRatio: string;
  resolucionAnchoPx: number;
  resolucionAltoPx: number;
  densidadPpi: number;
  profundidadColor: string;
  areaDisplayPorcentaje: string;
  cristalFrontal: string | null;
  refrescoHz: number | null;
  fichaB: { anchoCuerpoMm: string | null; altoCuerpoMm: string | null; grosorCuerpoMm: string | null; anchoDisplayMm: string | null; altoDisplayMm: string | null; diagonalDisplayMm: string | null; aspectRatio: string | null; areaDisplayPorcentaje: string | null; biselLateralMm: string | null; biselVerticalTotalMm: string | null; curvatura: string | null; pesoGramos: string | null; volumenCm3: string | null; materiales: string | null; colores: string | null; certificaciones: string | null; tipoHuella: string | null; huellaBajoPantalla: boolean | null; sensores: string[]; advertencias: string[] } | null;
}

const nombresForma: Record<string, string> = {
  PLANA: "Pantalla plana (cristal 2D)",
  CURVA: "Pantalla curva (3D o Dual-Edge)",
  DOS_PUNTO_CINCO_D: "Cristal 2.5D (pantalla plana con borde biselado)",
  TRES_D: "Waterfall o 4D (Quad-Curved)",
  FLEXIBLE: "Pantalla flexible",
  PLEGABLE: "Pantalla plegable",
  OTRO: "Otro tipo de pantalla",
};

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | number | null }) {
  return <div className="rounded-2xl bg-white/55 p-3"><dt className="text-xs font-semibold text-[var(--on-surface-variant)]">{etiqueta}</dt><dd className="mt-1 break-words font-mono text-sm">{valor ?? "No especificado"}</dd></div>;
}

function ModalFicha({ registro, cerrar }: { registro: RegistroTecnico; cerrar: () => void }) {
  const [fichaVisible, setFichaVisible] = useState<"A" | "B" | "C">("A");
  useEffect(() => {
    const alPresionar = (evento: KeyboardEvent) => { if (evento.key === "Escape") cerrar(); };
    document.addEventListener("keydown", alPresionar);
    const desbordamiento = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", alPresionar); document.body.style.overflow = desbordamiento; };
  }, [cerrar]);

  const forma = registro.tipoFormaPantalla === "OTRO" && registro.tipoFormaOtro
    ? registro.tipoFormaOtro
    : nombresForma[registro.tipoFormaPantalla] ?? registro.tipoFormaPantalla;

  const titulos = { A: "Ficha técnica A · Pantalla", B: "Ficha técnica B · Diseño y sensores", C: "Ficha técnica C · Geometría real del protector" } as const;

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--on-surface)]/35 p-3 backdrop-blur-md sm:p-6" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) cerrar(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="titulo-ficha-tecnica" className="relative max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2.5rem] border border-white/60 bg-[var(--surface)] p-5 shadow-2xl sm:p-8">
      <button type="button" onClick={cerrar} aria-label="Cerrar ficha técnica" className="absolute right-4 top-4 z-10 grid size-11 place-items-center rounded-full bg-white/80 text-2xl text-[var(--on-surface)] shadow-sm"><i className="bx bx-x" aria-hidden="true" /></button>
      <header className="pr-14"><p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--primary)]">Smart Match</p><h2 id="titulo-ficha-tecnica" className="mt-2 text-3xl font-bold">{titulos[fichaVisible]}</h2><div className="mt-4 flex flex-wrap gap-2" aria-label="Capas de la ficha técnica">{(["A", "B", "C"] as const).map((ficha) => <button key={ficha} type="button" onClick={() => setFichaVisible(ficha)} aria-current={fichaVisible === ficha ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm font-semibold ${fichaVisible === ficha ? "bg-[var(--primary)] text-white" : "bg-white/70 text-[var(--on-surface-variant)]"}`}>Ficha {ficha}</button>)}</div></header>
      <div className="mt-6 grid gap-6 lg:grid-cols-[15rem_1fr]">
        <aside className="flex min-h-full flex-col"><div className="relative aspect-square overflow-hidden rounded-[2rem] bg-gradient-to-br from-purple-100 to-pink-100"><ImagenProducto url={registro.imagenUrl} descripcion={registro.descripcion} sizes="240px" icono="bx-mobile-alt" /></div><p className="mt-4 font-mono text-sm font-semibold text-[var(--primary)]">Clave: {registro.clave}</p><h3 className="mt-2 text-xl font-bold">{registro.descripcion}</h3><p className="mt-2 text-sm text-[var(--on-surface-variant)]">{registro.marca} · {registro.modelo}</p><div className="mt-auto pt-6">{fichaVisible === "A" && <button type="button" onClick={() => setFichaVisible("B")} className="flex w-full items-center justify-between rounded-2xl bg-purple-100 px-4 py-3 text-left font-semibold text-[var(--primary)]"><span><small className="block font-mono text-[0.65rem] uppercase">Siguiente capa</small>Ver ficha técnica B</span><i className="bx bx-down-arrow-alt text-2xl" /></button>}{fichaVisible === "B" && <button type="button" onClick={() => setFichaVisible("C")} className="flex w-full items-center justify-between rounded-2xl bg-purple-100 px-4 py-3 text-left font-semibold text-[var(--primary)]"><span><small className="block font-mono text-[0.65rem] uppercase">Siguiente capa</small>Ver ficha técnica C</span><i className="bx bx-down-arrow-alt text-2xl" /></button>}{fichaVisible === "C" && <button type="button" onClick={() => setFichaVisible("B")} className="flex w-full items-center gap-2 rounded-2xl bg-white/70 px-4 py-3 font-semibold text-[var(--primary)]"><i className="bx bx-up-arrow-alt text-xl" />Volver a ficha B</button>}</div></aside>
        {fichaVisible === "A" && <div className="min-w-0"><h3 className="text-xl font-semibold">Identificación</h3><dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><Dato etiqueta="Modelo" valor={registro.modelo} /><Dato etiqueta="Línea" valor={registro.linea} /><Dato etiqueta="Marca" valor={registro.marca} /><Dato etiqueta="Tipo de producto" valor={registro.tipoProducto} /><Dato etiqueta="Existencia" valor={registro.existencia} /><Dato etiqueta="Color" valor={registro.color} /></dl>
          <h3 className="mt-6 text-xl font-semibold">Parámetros de pantalla</h3><dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><Dato etiqueta="Tecnología" valor={registro.tecnologia} /><Dato etiqueta="Tipo o forma" valor={forma} /><Dato etiqueta="Diagonal" valor={`${registro.diagonalPulgadas} pulgadas · ${registro.diagonalMm} mm`} /><Dato etiqueta="Ancho del display" valor={`${registro.anchoDisplayMm} mm`} /><Dato etiqueta="Alto del display" valor={`${registro.altoDisplayMm} mm`} /><Dato etiqueta="Aspect ratio" valor={registro.aspectRatio} /><Dato etiqueta="Resolución" valor={`${registro.resolucionAnchoPx} × ${registro.resolucionAltoPx} px`} /><Dato etiqueta="Densidad" valor={`${registro.densidadPpi} ppi`} /><Dato etiqueta="Profundidad de color" valor={registro.profundidadColor} /><Dato etiqueta="Área del display" valor={`${registro.areaDisplayPorcentaje} %`} /><Dato etiqueta="Cristal frontal" valor={registro.cristalFrontal} /><Dato etiqueta="Frecuencia de refresco" valor={registro.refrescoHz ? `${registro.refrescoHz} Hz` : null} /></dl>
          <div className="mt-6 flex justify-end"><Link href={`/paralelo/${registro.id}/editar`} className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-5 py-3 font-semibold text-[var(--primary)]"><i className="bx bx-edit-alt" aria-hidden="true" />Editar ficha</Link></div>
        </div>}
        {fichaVisible === "B" && <div className="min-w-0">{!registro.fichaB && <EstadoCapa icono="bx-ruler" titulo="Ficha B pendiente" descripcion="Todavía no se han importado las imágenes DF y SES de este modelo." />}<h3 className="mt-6 text-xl font-semibold">Diseño físico</h3><dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><Dato etiqueta="Ancho del cuerpo" valor={registro.fichaB?.anchoCuerpoMm ? `${registro.fichaB.anchoCuerpoMm} mm` : null} /><Dato etiqueta="Alto del cuerpo" valor={registro.fichaB?.altoCuerpoMm ? `${registro.fichaB.altoCuerpoMm} mm` : null} /><Dato etiqueta="Grosor" valor={registro.fichaB?.grosorCuerpoMm ? `${registro.fichaB.grosorCuerpoMm} mm` : null} /><Dato etiqueta="Display" valor={registro.fichaB?.anchoDisplayMm && registro.fichaB?.altoDisplayMm ? `${registro.fichaB.anchoDisplayMm} × ${registro.fichaB.altoDisplayMm} mm` : null} /><Dato etiqueta="Bisel lateral" valor={registro.fichaB?.biselLateralMm ? `${registro.fichaB.biselLateralMm} mm/lado` : null} /><Dato etiqueta="Bisel vertical total" valor={registro.fichaB?.biselVerticalTotalMm ? `${registro.fichaB.biselVerticalTotalMm} mm` : null} /><Dato etiqueta="Curvatura" valor={registro.fichaB?.curvatura ?? null} /><Dato etiqueta="Peso" valor={registro.fichaB?.pesoGramos ? `${registro.fichaB.pesoGramos} g` : null} /><Dato etiqueta="Materiales" valor={registro.fichaB?.materiales ?? null} /><Dato etiqueta="Certificaciones" valor={registro.fichaB?.certificaciones ?? null} /></dl><h3 className="mt-6 text-xl font-semibold">Sensores</h3><dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><Dato etiqueta="Tipo de huella" valor={registro.fichaB?.tipoHuella ?? null} /><Dato etiqueta="Huella bajo pantalla" valor={registro.fichaB?.huellaBajoPantalla === null || registro.fichaB?.huellaBajoPantalla === undefined ? null : registro.fichaB.huellaBajoPantalla ? "Sí" : "No"} /><Dato etiqueta="Lista de sensores" valor={registro.fichaB?.sensores.join(", ") || null} /></dl>{registro.fichaB?.advertencias.length ? <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900"><strong>Revisión:</strong> {registro.fichaB.advertencias.join("; ")}</p> : null}<div className="mt-7 flex flex-wrap justify-between gap-3"><button type="button" onClick={() => setFichaVisible("A")} className="inline-flex items-center gap-2 rounded-full border border-[var(--outline-variant)] bg-white/70 px-5 py-3 font-semibold"><i className="bx bx-left-arrow-alt" />Volver a ficha A</button><Link href={`/automatizacion/fichas-b?clave=${encodeURIComponent(registro.clave)}`} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] px-5 py-3 font-semibold text-white"><i className="bx bx-upload" />{registro.fichaB ? "Actualizar ficha B" : "Agregar ficha B"}</Link></div></div>}
        {fichaVisible === "C" && <div className="min-w-0"><EstadoCapa icono="bx-shape-square" titulo="Ficha C pendiente de medición" descripcion="Esta capa almacenará la geometría física del protector real: contorno, grosor, esquinas, aberturas, marco y comprobaciones funcionales." /><h3 className="mt-6 text-xl font-semibold">Geometría prevista</h3><dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{["Ancho exterior", "Alto exterior", "Grosor", "Radios de esquina", "Aberturas", "Marco del borde", "Curvatura", "Adhesivo", "Huella comprobada"].map((etiqueta) => <Dato key={etiqueta} etiqueta={etiqueta} valor={null} />)}</dl><div className="mt-7 flex flex-wrap justify-between gap-3"><button type="button" onClick={() => setFichaVisible("B")} className="inline-flex items-center gap-2 rounded-full border border-[var(--outline-variant)] bg-white/70 px-5 py-3 font-semibold"><i className="bx bx-left-arrow-alt" />Volver a ficha B</button><button type="button" disabled title="Se habilitará al implementar la captura física" className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-purple-100 px-5 py-3 font-semibold text-[var(--primary)] opacity-60"><i className="bx bx-edit-alt" />Editar ficha C</button></div></div>}
      </div>
    </section>
  </div>;
}

function EstadoCapa({ icono, titulo, descripcion }: { icono: string; titulo: string; descripcion: string }) {
  return <div className="rounded-[2rem] border border-dashed border-purple-300 bg-purple-50/70 p-6"><i className={`bx ${icono} text-4xl text-[var(--primary)]`} /><h3 className="mt-3 text-2xl font-semibold">{titulo}</h3><p className="mt-2 text-[var(--on-surface-variant)]">{descripcion}</p></div>;
}

export function ListadoRegistros({ registros }: { registros: RegistroTecnico[] }) {
  const router = useRouter();
  const [aEliminar, setAEliminar] = useState<RegistroTecnico | null>(null);
  const [aConsultar, setAConsultar] = useState<RegistroTecnico | null>(null);
  const [error, setError] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const eliminar = async () => { if (!aEliminar) return; setEliminando(true); setError(""); try { await eliminarEspecificacion(aEliminar.id); setAEliminar(null); router.refresh(); } catch (causa) { setError(causa instanceof Error ? causa.message : "No fue posible eliminar."); } finally { setEliminando(false); } };

  if (!registros.length) return <div className="rounded-[2.5rem] border border-white/60 bg-white/40 p-10 text-center"><i className="bx bx-layer text-5xl text-[var(--primary)]" /><h2 className="mt-3 text-2xl font-semibold">Sin registros técnicos</h2><p className="mt-2 text-[var(--on-surface-variant)]">Registra los parámetros del primer producto.</p></div>;
  return <><div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">{registros.map((registro) => <article key={registro.id} className="rounded-[2rem] border border-white/60 bg-white/40 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl"><div className="flex min-w-0 items-start gap-4"><div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 text-3xl text-[var(--primary)] sm:size-24"><ImagenProducto url={registro.imagenUrl} descripcion={registro.descripcion} sizes="96px" icono="bx-mobile-alt" /></div><div className="min-w-0 flex-1"><p className="font-mono text-xs font-semibold text-[var(--primary)]">{registro.clave}</p><h2 className="mt-1 break-words text-base font-semibold leading-snug">{registro.descripcion}</h2></div></div><div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setAConsultar(registro)} aria-label={`Ver ficha técnica completa de ${registro.clave}`} title="Ver ficha técnica" className="grid size-10 place-items-center rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] text-xl text-white"><i className="bx bx-plus" aria-hidden="true" /></button><Link href={`/paralelo/${registro.id}/editar`} aria-label={`Editar registro ${registro.clave}`} className="inline-flex items-center justify-center gap-2 rounded-full bg-purple-100 px-4 py-2 text-sm font-semibold text-[var(--primary)]"><i className="bx bx-edit-alt" />Editar</Link><button onClick={() => setAEliminar(registro)} aria-label={`Eliminar registro ${registro.clave}`} className="inline-flex items-center justify-center gap-2 rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-[var(--error)]"><i className="bx bx-trash" />Eliminar</button></div></article>)}</div>
    {aConsultar && <ModalFicha registro={aConsultar} cerrar={() => setAConsultar(null)} />}
    {aEliminar && <div className="fixed inset-0 z-[100] grid place-items-center bg-[var(--on-surface)]/30 p-4 backdrop-blur-md"><section role="alertdialog" aria-modal="true" className="w-full max-w-lg rounded-[2.5rem] bg-[var(--surface)] p-8 shadow-2xl"><h2 className="text-2xl font-bold">Eliminar parámetros</h2><p className="mt-3">Se eliminará la ficha técnica de <strong>{aEliminar.clave}</strong>, no el producto.</p>{error && <p role="alert" className="mt-4 rounded-2xl bg-red-100 p-4 text-[var(--error)]">{error}</p>}<div className="mt-7 flex justify-end gap-3"><button disabled={eliminando} onClick={() => setAEliminar(null)} className="rounded-full border px-5 py-3">Cancelar</button><button disabled={eliminando} onClick={eliminar} className="rounded-full bg-[var(--error)] px-5 py-3 font-semibold text-white">Eliminar</button></div></section></div>}
  </>;
}
