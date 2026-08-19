"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { eliminarEspecificacion } from "@/actions/especificaciones";
import { ImagenProducto } from "@/components/productos/imagen-producto";

export interface RegistroTecnico {
  id: string;
  especificacionId: string | null;
  clave: string;
  descripcion: string;
  imagenUrl: string | null;
  modelo: string;
  linea: string;
  marca: string;
  tipoProducto: string;
  existencia: number;
  color: string | null;
  tecnologia: string | null;
  tipoFormaPantalla: string | null;
  tipoFormaOtro: string | null;
  diagonalMm: string | null;
  diagonalPulgadas: string | null;
  anchoDisplayMm: string | null;
  altoDisplayMm: string | null;
  aspectRatio: string | null;
  resolucionAnchoPx: number | null;
  resolucionAltoPx: number | null;
  densidadPpi: number | null;
  profundidadColor: string | null;
  areaDisplayPorcentaje: string | null;
  cristalFrontal: string | null;
  refrescoHz: number | null;
  fichaB: { anchoCuerpoMm: string | null; altoCuerpoMm: string | null; grosorCuerpoMm: string | null; anchoDisplayMm: string | null; altoDisplayMm: string | null; diagonalDisplayMm: string | null; aspectRatio: string | null; areaDisplayPorcentaje: string | null; biselLateralMm: string | null; biselVerticalTotalMm: string | null; curvatura: string | null; pesoGramos: string | null; volumenCm3: string | null; materiales: string | null; colores: string | null; certificaciones: string | null; tipoHuella: string | null; huellaBajoPantalla: boolean | null; sensores: string[]; advertencias: string[] } | null;
  fichaC: { geometriaPrevista: string | null; anchoExteriorMm: string | null; altoExteriorMm: string | null; grosorMm: string | null; radiosEsquina: string | null; aberturas: string | null; marcoBorde: string | null; curvatura: string | null; adhesivo: string | null; huellaComprobada: string | null } | null;
  ftf: { proveedor: string; url: string; validacion: string; secciones: Array<{ clave: string; titulo: string; campos: Array<{ etiqueta: string; valores: string[] }> }> } | null;
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

const normalizarTitulo = (valor: string) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const titulosTraducidos: Record<string, string> = {
  "brand and model": "Marca y modelo", design: "Diseño", "sim card": "Tarjeta SIM", networks: "Redes",
  "mobile network technologies and bandwidth": "Tecnologías y bandas de red móvil", "operating system": "Sistema operativo",
  "system on chip (soc)": "Sistema en chip (SoC)", storage: "Almacenamiento", "memory cards": "Tarjetas de memoria",
  display: "Pantalla", sensors: "Sensores", "main rear camera": "Cámara trasera principal", "ultra-wide camera": "Cámara ultra gran angular",
  "telephoto camera": "Cámara telefoto", "front camera": "Cámara frontal", audio: "Audio", radio: "Radio",
  "tracking/positioning": "Rastreo y posicionamiento", "wi-fi": "Wi-Fi", bluetooth: "Bluetooth", usb: "USB",
  "headphone jack": "Conector de audífonos", connectivity: "Conectividad", browser: "Navegador",
  "audio file formats/codecs": "Formatos y códecs de audio", "video file formats/codecs": "Formatos y códecs de video", battery: "Batería",
};
const camposTraducidos: Record<string, string> = {
  brand: "Marca", model: "Modelo", "model alias": "Alias del modelo", width: "Ancho", height: "Alto", thickness: "Grosor", weight: "Peso",
  volume: "Volumen", colors: "Colores", "body materials": "Materiales del cuerpo", certification: "Certificación", type: "Tipo",
  "type/technology": "Tipo y tecnología", "diagonal size": "Tamaño diagonal", "aspect ratio": "Relación de aspecto", resolution: "Resolución",
  "pixel density": "Densidad de píxeles", "color depth": "Profundidad de color", "display area": "Área de pantalla",
  "other features": "Otras características", sensors: "Sensores", chipset: "Chipset", cpu: "Procesador", "cpu cores": "Núcleos del procesador",
  "cpu frequency": "Frecuencia del procesador", gpu: "Procesador gráfico", ram: "Memoria RAM", "internal storage": "Almacenamiento interno",
  os: "Sistema operativo", battery: "Batería", capacity: "Capacidad", "quick charge": "Carga rápida", "wireless charging": "Carga inalámbrica",
  technology: "Tecnología", features: "Características", aperture: "Apertura", "image resolution": "Resolución de imagen",
  "video resolution": "Resolución de video", flash: "Flash", networks: "Redes", gps: "GPS", navigation: "Navegación",
  bluetooth: "Bluetooth", usb: "USB", "usb version": "Versión USB", "headphone jack": "Conector de audífonos",
  speaker: "Altavoz", radio: "Radio", browser: "Navegador", format: "Formato", formats: "Formatos",
};
const baseFuente = (valor: string) => normalizarTitulo(valor).replace(/\s+(information about|the |a |an ).*$/i, "").trim();
const traducirTitulo = (valor: string) => {
  const base = normalizarTitulo(valor);
  const encontrada = Object.entries(titulosTraducidos).find(([origen]) => base === origen || base.startsWith(`${origen} `));
  return encontrada?.[1] ?? valor;
};
const traducirCampo = (valor: string) => camposTraducidos[baseFuente(valor)] ?? valor;
const esSeccion = (seccion: NonNullable<RegistroTecnico["ftf"]>["secciones"][number], nombre: string) => {
  const clave = normalizarTitulo(seccion.clave);
  const titulo = normalizarTitulo(seccion.titulo);
  return clave === nombre || clave.startsWith(`${nombre}_`) || titulo === nombre || titulo.startsWith(`${nombre} `);
};

function CamposFtf({ seccion }: { seccion: NonNullable<RegistroTecnico["ftf"]>["secciones"][number] }) {
  return <dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{seccion.campos.map((campo, indice) => <Dato key={`${campo.etiqueta}-${indice}`} etiqueta={traducirCampo(campo.etiqueta)} valor={campo.valores.join(" · ") || null} />)}</dl>;
}

function ModalFicha({ registro, cerrar }: { registro: RegistroTecnico; cerrar: () => void }) {
  const [pagina, setPagina] = useState<"resumen" | "completa">("resumen");
  useEffect(() => {
    const alPresionar = (evento: KeyboardEvent) => { if (evento.key === "Escape") cerrar(); };
    document.addEventListener("keydown", alPresionar);
    const desbordamiento = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", alPresionar); document.body.style.overflow = desbordamiento; };
  }, [cerrar]);

  const forma = registro.tipoFormaPantalla === "OTRO" && registro.tipoFormaOtro
    ? registro.tipoFormaOtro
    : registro.tipoFormaPantalla ? nombresForma[registro.tipoFormaPantalla] ?? registro.tipoFormaPantalla : null;
  const medida = (valor: string | null, unidad: string) => valor ? `${valor} ${unidad}` : null;

  const disenoFtf = registro.ftf?.secciones.find((seccion) => esSeccion(seccion, "design"));
  const sensoresFtf = registro.ftf?.secciones.find((seccion) => esSeccion(seccion, "sensors"));
  const seccionesAdicionales = registro.ftf?.secciones.filter((seccion) => !["display", "design", "sensors"].some((nombre) => esSeccion(seccion, nombre))) ?? [];
  const c = registro.fichaC;

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--on-surface)]/35 p-3 backdrop-blur-md sm:p-6" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) cerrar(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="titulo-ficha-tecnica" className="relative max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2.5rem] border border-white/60 bg-[var(--surface)] p-5 shadow-2xl sm:p-8">
      <button type="button" onClick={cerrar} aria-label="Cerrar ficha técnica" className="absolute right-4 top-4 z-10 grid size-11 place-items-center rounded-full bg-white/80 text-2xl text-[var(--on-surface)] shadow-sm"><i className="bx bx-x" aria-hidden="true" /></button>
      <header className="pr-14"><p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--primary)]">Smart Match</p><h2 id="titulo-ficha-tecnica" className="mt-2 text-3xl font-bold">Ficha técnica unificada</h2>{registro.ftf && <p className="mt-3 text-sm text-[var(--on-surface-variant)]">Fuente principal: <a href={registro.ftf.url} target="_blank" rel="noreferrer" className="font-semibold text-[var(--primary)] underline">{registro.ftf.proveedor}</a> · {registro.ftf.secciones.length} secciones · {registro.ftf.validacion}</p>}<nav aria-label="Páginas de la ficha técnica" className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => setPagina("resumen")} aria-current={pagina === "resumen" ? "page" : undefined} className={`rounded-full px-5 py-2.5 font-semibold ${pagina === "resumen" ? "bg-[var(--primary)] text-white" : "bg-white/70"}`}>Resumen técnico</button><button type="button" onClick={() => setPagina("completa")} aria-current={pagina === "completa" ? "page" : undefined} className={`rounded-full px-5 py-2.5 font-semibold ${pagina === "completa" ? "bg-[var(--primary)] text-white" : "bg-white/70"}`}>Ficha completa ({seccionesAdicionales.length})</button></nav></header>
      <div className={`${pagina === "resumen" ? "grid" : "hidden"} mt-6 gap-6 lg:grid-cols-[15rem_1fr]`}>
        <aside><div className="relative aspect-square overflow-hidden rounded-[2rem] bg-gradient-to-br from-purple-100 to-pink-100"><ImagenProducto url={registro.imagenUrl} descripcion={registro.descripcion} sizes="240px" icono="bx-mobile-alt" /></div><p className="mt-4 font-mono text-sm font-semibold text-[var(--primary)]">Clave: {registro.clave}</p><h3 className="mt-2 text-xl font-bold">{registro.descripcion}</h3><p className="mt-2 text-sm text-[var(--on-surface-variant)]">{registro.marca} · {registro.modelo}</p></aside>
        <div className="min-w-0"><h3 className="text-xl font-semibold">Identificación</h3><dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><Dato etiqueta="Modelo" valor={registro.modelo} /><Dato etiqueta="Línea" valor={registro.linea} /><Dato etiqueta="Marca" valor={registro.marca} /><Dato etiqueta="Tipo de producto" valor={registro.tipoProducto} /><Dato etiqueta="Existencia" valor={registro.existencia} /><Dato etiqueta="Color" valor={registro.color} /></dl>
          <h3 className="mt-6 text-xl font-semibold">Parámetros de pantalla</h3>{!registro.especificacionId && <div className="mt-4"><EstadoCapa icono="bx-ruler" titulo="Parámetros pendientes" descripcion="El producto ya aparece en Paralelo visual, pero aún necesita sus medidas técnicas de pantalla." /></div>}<dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><Dato etiqueta="Tecnología" valor={registro.tecnologia} /><Dato etiqueta="Tipo o forma" valor={forma} /><Dato etiqueta="Diagonal" valor={registro.diagonalPulgadas && registro.diagonalMm ? `${registro.diagonalPulgadas} pulgadas · ${registro.diagonalMm} mm` : null} /><Dato etiqueta="Ancho del display" valor={medida(registro.anchoDisplayMm, "mm")} /><Dato etiqueta="Alto del display" valor={medida(registro.altoDisplayMm, "mm")} /><Dato etiqueta="Aspect ratio" valor={registro.aspectRatio} /><Dato etiqueta="Resolución" valor={registro.resolucionAnchoPx !== null && registro.resolucionAltoPx !== null ? `${registro.resolucionAnchoPx} × ${registro.resolucionAltoPx} px` : null} /><Dato etiqueta="Densidad" valor={registro.densidadPpi !== null ? `${registro.densidadPpi} ppi` : null} /><Dato etiqueta="Profundidad de color" valor={registro.profundidadColor} /><Dato etiqueta="Área del display" valor={medida(registro.areaDisplayPorcentaje, "%")} /><Dato etiqueta="Cristal frontal" valor={registro.cristalFrontal} /><Dato etiqueta="Frecuencia de refresco" valor={registro.refrescoHz ? `${registro.refrescoHz} Hz` : null} /></dl>
          <h3 className="mt-7 text-xl font-semibold">Diseño físico del dispositivo</h3>{disenoFtf ? <CamposFtf seccion={disenoFtf} /> : <dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><Dato etiqueta="Ancho del cuerpo" valor={registro.fichaB?.anchoCuerpoMm ? `${registro.fichaB.anchoCuerpoMm} mm` : null} /><Dato etiqueta="Alto del cuerpo" valor={registro.fichaB?.altoCuerpoMm ? `${registro.fichaB.altoCuerpoMm} mm` : null} /><Dato etiqueta="Grosor" valor={registro.fichaB?.grosorCuerpoMm ? `${registro.fichaB.grosorCuerpoMm} mm` : null} /><Dato etiqueta="Curvatura" valor={registro.fichaB?.curvatura ?? null} /><Dato etiqueta="Peso" valor={registro.fichaB?.pesoGramos ? `${registro.fichaB.pesoGramos} g` : null} /><Dato etiqueta="Materiales" valor={registro.fichaB?.materiales ?? null} /></dl>}
          <h3 className="mt-7 text-xl font-semibold">Sensores</h3>{sensoresFtf ? <CamposFtf seccion={sensoresFtf} /> : <dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><Dato etiqueta="Tipo de huella" valor={registro.fichaB?.tipoHuella ?? null} /><Dato etiqueta="Huella bajo pantalla" valor={registro.fichaB?.huellaBajoPantalla === null || registro.fichaB?.huellaBajoPantalla === undefined ? null : registro.fichaB.huellaBajoPantalla ? "Sí" : "No"} /><Dato etiqueta="Lista de sensores" valor={registro.fichaB?.sensores.join(", ") || null} /></dl>}
          <div className="mt-8 border-t border-[var(--outline-variant)] pt-7"><h3 className="text-xl font-semibold">Datos físicos del cristal templado</h3><p className="mt-2 text-sm text-[var(--on-surface-variant)]">Mediciones independientes del protector real; no se sustituyen con información comercial de la FTF.</p>{!c && <div className="mt-4"><EstadoCapa icono="bx-shape-square" titulo="Medición física pendiente" descripcion="Todavía no se han registrado el contorno, grosor, esquinas, aberturas, marco y comprobaciones funcionales del cristal." /></div>}<dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><Dato etiqueta="Geometría prevista" valor={c?.geometriaPrevista ?? null} /><Dato etiqueta="Ancho exterior" valor={c?.anchoExteriorMm ? `${c.anchoExteriorMm} mm` : null} /><Dato etiqueta="Alto exterior" valor={c?.altoExteriorMm ? `${c.altoExteriorMm} mm` : null} /><Dato etiqueta="Grosor" valor={c?.grosorMm ? `${c.grosorMm} mm` : null} /><Dato etiqueta="Radios de esquina" valor={c?.radiosEsquina ?? null} /><Dato etiqueta="Aberturas" valor={c?.aberturas ?? null} /><Dato etiqueta="Marco del borde" valor={c?.marcoBorde ?? null} /><Dato etiqueta="Curvatura" valor={c?.curvatura ?? null} /><Dato etiqueta="Adhesivo" valor={c?.adhesivo ?? null} /><Dato etiqueta="Huella comprobada" valor={c?.huellaComprobada ?? null} /></dl></div>
          <div className="mt-7 flex justify-end"><Link href={registro.especificacionId ? `/paralelo/${registro.especificacionId}/editar` : "/paralelo/nuevo"} className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-5 py-3 font-semibold text-[var(--primary)]"><i className={`bx ${registro.especificacionId ? "bx-edit-alt" : "bx-plus"}`} aria-hidden="true" />{registro.especificacionId ? "Editar parámetros" : "Agregar parámetros"}</Link></div>
        </div>
      </div>
      {pagina === "completa" && <div className="mt-6 space-y-5">{registro.ftf ? seccionesAdicionales.map((seccion, indice) => <article key={`${seccion.clave}-${indice}`} className="rounded-[2rem] border border-white/70 bg-white/45 p-5 sm:p-6"><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-purple-100 font-mono text-sm font-bold text-[var(--primary)]">{indice + 1}</span><h3 className="text-xl font-semibold">{traducirTitulo(seccion.titulo)}</h3></div><CamposFtf seccion={seccion} /></article>) : <EstadoCapa icono="bx-file-blank" titulo="FTF no descargada" descripcion="Este producto conserva sus parámetros anteriores de Paralelo, pero todavía no tiene una Ficha Técnica Full asociada." />}{registro.ftf && !seccionesAdicionales.length && <EstadoCapa icono="bx-file-blank" titulo="Sin secciones adicionales" descripcion="La FTF sólo contiene las secciones técnicas incluidas en el resumen." />}</div>}
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
  const eliminar = async () => { if (!aEliminar?.especificacionId) return; setEliminando(true); setError(""); try { await eliminarEspecificacion(aEliminar.especificacionId); setAEliminar(null); router.refresh(); } catch (causa) { setError(causa instanceof Error ? causa.message : "No fue posible eliminar."); } finally { setEliminando(false); } };

  if (!registros.length) return <div className="rounded-[2.5rem] border border-white/60 bg-white/40 p-10 text-center"><i className="bx bx-layer text-5xl text-[var(--primary)]" /><h2 className="mt-3 text-2xl font-semibold">Sin cristales templados</h2><p className="mt-2 text-[var(--on-surface-variant)]">No hay productos que coincidan con los filtros seleccionados.</p></div>;
  return <><div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">{registros.map((registro) => <article key={registro.id} className="rounded-[2rem] border border-white/60 bg-white/40 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl"><div className="flex min-w-0 items-start gap-4"><div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 text-3xl text-[var(--primary)] sm:size-24"><ImagenProducto url={registro.imagenUrl} descripcion={registro.descripcion} sizes="96px" icono="bx-mobile-alt" /></div><div className="min-w-0 flex-1"><p className="font-mono text-xs font-semibold text-[var(--primary)]">{registro.clave}</p><h2 className="mt-1 break-words text-base font-semibold leading-snug">{registro.descripcion}</h2><span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${registro.especificacionId ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{registro.especificacionId ? "Ficha técnica disponible" : "Parámetros pendientes"}</span></div></div><div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setAConsultar(registro)} aria-label={`Ver ficha técnica completa de ${registro.clave}`} title="Ver ficha técnica" className="grid size-10 place-items-center rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] text-xl text-white"><i className="bx bx-plus" aria-hidden="true" /></button><Link href={registro.especificacionId ? `/paralelo/${registro.especificacionId}/editar` : "/paralelo/nuevo"} aria-label={`${registro.especificacionId ? "Editar" : "Agregar"} registro ${registro.clave}`} className="inline-flex items-center justify-center gap-2 rounded-full bg-purple-100 px-4 py-2 text-sm font-semibold text-[var(--primary)]"><i className={`bx ${registro.especificacionId ? "bx-edit-alt" : "bx-plus"}`} />{registro.especificacionId ? "Editar" : "Agregar ficha"}</Link>{registro.especificacionId && <button onClick={() => setAEliminar(registro)} aria-label={`Eliminar registro ${registro.clave}`} className="inline-flex items-center justify-center gap-2 rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-[var(--error)]"><i className="bx bx-trash" />Eliminar</button>}</div></article>)}</div>
    {aConsultar && <ModalFicha registro={aConsultar} cerrar={() => setAConsultar(null)} />}
    {aEliminar && <div className="fixed inset-0 z-[100] grid place-items-center bg-[var(--on-surface)]/30 p-4 backdrop-blur-md"><section role="alertdialog" aria-modal="true" className="w-full max-w-lg rounded-[2.5rem] bg-[var(--surface)] p-8 shadow-2xl"><h2 className="text-2xl font-bold">Eliminar parámetros</h2><p className="mt-3">Se eliminará la ficha técnica de <strong>{aEliminar.clave}</strong>, no el producto.</p>{error && <p role="alert" className="mt-4 rounded-2xl bg-red-100 p-4 text-[var(--error)]">{error}</p>}<div className="mt-7 flex justify-end gap-3"><button disabled={eliminando} onClick={() => setAEliminar(null)} className="rounded-full border px-5 py-3">Cancelar</button><button disabled={eliminando} onClick={eliminar} className="rounded-full bg-[var(--error)] px-5 py-3 font-semibold text-white">Eliminar</button></div></section></div>}
  </>;
}
