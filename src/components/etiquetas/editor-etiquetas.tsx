"use client";
/* eslint-disable @next/next/no-img-element -- La zona de impresión usa imágenes data URL generadas localmente. */

import bwipjs from "bwip-js/browser";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Group, Image as ImagenKonva, Layer, Rect, Stage, Text } from "react-konva";
import { esGtinValido } from "@/lib/codigos-universales";
import { ImpresionDirecta } from "@/components/etiquetas/impresion-directa";
import { validarDisenoEtiqueta } from "@/lib/etiquetas/validar-diseno";
import { useEditorEtiquetas } from "@/stores/editor-etiquetas";
import type { ElementoEtiqueta, ProductoEtiqueta, TipoElementoEtiqueta } from "@/types/etiqueta";

const ESCALA = 6;
type PanelMovil = "campos" | "diseno" | "imprimir";
const panelesMoviles: Array<{ id: PanelMovil; etiqueta: string; icono: string }> = [
  { id: "campos", etiqueta: "Campos", icono: "bx-grid-alt" },
  { id: "diseno", etiqueta: "Diseño y ajustes", icono: "bx-edit-alt" },
  { id: "imprimir", etiqueta: "Imprimir", icono: "bx-printer" },
];
const campos: Array<{ tipo: TipoElementoEtiqueta; etiqueta: string; icono: string }> = [
  { tipo: "modelo", etiqueta: "Nombre/modelo", icono: "bx-mobile" }, { tipo: "clave", etiqueta: "Clave", icono: "bx-key" },
  { tipo: "descripcion", etiqueta: "Descripción", icono: "bx-detail" }, { tipo: "codigo", etiqueta: "GTIN/código", icono: "bx-hash" },
  { tipo: "linea", etiqueta: "Línea", icono: "bx-category" }, { tipo: "marca", etiqueta: "Marca", icono: "bx-purchase-tag" },
  { tipo: "barras", etiqueta: "Código de barras", icono: "bx-barcode" }, { tipo: "qr", etiqueta: "Código QR", icono: "bx-qr" },
];

function textoElemento(tipo: TipoElementoEtiqueta, producto: ProductoEtiqueta) {
  const valores: Record<Exclude<TipoElementoEtiqueta, "barras" | "qr">, string> = { modelo: producto.modelo, clave: `Clave: ${producto.clave}`, descripcion: producto.descripcion, codigo: producto.codigoUniversal ? `Código: ${producto.codigoUniversal}` : "Código: sin asignar", linea: `Línea: ${producto.linea}`, marca: `Marca: ${producto.marca}` };
  return tipo === "barras" || tipo === "qr" ? "" : valores[tipo];
}

function crearImagenCodigo(tipo: "barras" | "qr", producto: ProductoEtiqueta) {
  const canvas = document.createElement("canvas");
  const contenido = producto.codigoUniversal || producto.clave;
  const opciones = tipo === "qr"
    ? { bcid: "qrcode" as const, text: contenido, scale: 3 }
    : { bcid: contenido.length === 13 && esGtinValido(contenido) ? "ean13" as const : "code128" as const, text: contenido, scale: 3, height: 10, includetext: true, textxalign: "center" as const };
  bwipjs.toCanvas(canvas, opciones);
  const imagen = new window.Image(); imagen.src = canvas.toDataURL("image/png");
  return { imagen, url: imagen.src };
}

function ElementoCanvas({ elemento, producto, seleccionado, invalido, seleccionar, mover, imagenes }: { elemento: ElementoEtiqueta; producto: ProductoEtiqueta; seleccionado: boolean; invalido: boolean; seleccionar: () => void; mover: (x: number, y: number) => void; imagenes: Record<string, HTMLImageElement> }) {
  const comun = { x: elemento.x, y: elemento.y, draggable: true, onClick: seleccionar, onTap: seleccionar, onDragEnd: (evento: { target: { x(): number; y(): number } }) => mover(evento.target.x(), evento.target.y()) };
  const borde = invalido ? "#ba1a1a" : seleccionado ? "#6b38d4" : undefined;
  if (elemento.tipo === "barras" || elemento.tipo === "qr") return <ImagenKonva {...comun} image={imagenes[elemento.tipo]} width={elemento.ancho} height={elemento.alto} stroke={borde} strokeWidth={borde ? 2 : 0} />;
  return <Group {...comun}><Rect width={elemento.ancho} height={elemento.alto} fill="transparent" stroke={borde} strokeWidth={borde ? 1.5 : 0} dash={invalido ? [4, 3] : undefined} /><Text text={textoElemento(elemento.tipo, producto)} width={elemento.ancho} height={elemento.alto} fontFamily={elemento.tipo === "clave" || elemento.tipo === "codigo" ? "JetBrains Mono" : "Hanken Grotesk"} fontSize={elemento.tamanoFuente} fontStyle={elemento.tipo === "modelo" ? "bold" : "normal"} fill="#1d1a23" padding={seleccionado ? 3 : 0} /></Group>;
}

function LienzoEtiqueta({ factor, producto, imagenes }: { factor: number; producto: ProductoEtiqueta; imagenes: Record<string, HTMLImageElement> }) {
  const { anchoMm, altoMm, margenMm, elementos, seleccionadoId, seleccionar, mover } = useEditorEtiquetas();
  const ancho = anchoMm * ESCALA, alto = altoMm * ESCALA, margen = margenMm * ESCALA;
  const invalidos = new Set(validarDisenoEtiqueta({ elementos, anchoMm, altoMm, margenMm, producto }).filter((problema) => problema.nivel === "error").flatMap((problema) => problema.elementos));
  const moverLimitado = (elemento: ElementoEtiqueta, x: number, y: number) => mover(elemento.id, Math.min(Math.max(x, margen), Math.max(margen, ancho - margen - elemento.ancho)), Math.min(Math.max(y, margen), Math.max(margen, alto - margen - elemento.alto)));
  return <Stage width={ancho * factor} height={alto * factor} onMouseDown={(evento) => { if (evento.target === evento.target.getStage()) seleccionar(); }}><Layer scaleX={factor} scaleY={factor}><Rect width={ancho} height={alto} fill="#fff" /><Rect x={margen} y={margen} width={Math.max(0, ancho - margen * 2)} height={Math.max(0, alto - margen * 2)} stroke="#a43073" dash={[5, 4]} strokeWidth={1 / factor} listening={false} />{elementos.map((elemento) => <ElementoCanvas key={elemento.id} elemento={elemento} producto={producto} seleccionado={elemento.id === seleccionadoId} invalido={invalidos.has(elemento.id)} seleccionar={() => seleccionar(elemento.id)} mover={(x, y) => moverLimitado(elemento, x, y)} imagenes={imagenes} />)}</Layer></Stage>;
}

export function EditorEtiquetas({ producto }: { producto: ProductoEtiqueta }) {
  const editor = useEditorEtiquetas();
  const { anchoMm, altoMm, margenMm, elementos, seleccionadoId, cambiarTamano, cambiarMargen, agregar, seleccionar, mover, cambiarFuente, redimensionar, eliminar, eliminarSeleccionado, organizar, reiniciar } = editor;
  const [cantidad, setCantidad] = useState(1);
  const [panelMovil, setPanelMovil] = useState<PanelMovil>("campos");
  const [vistaGrande, setVistaGrande] = useState(false);
  const [imagenes, setImagenes] = useState<Record<string, HTMLImageElement>>({});
  const [urls, setUrls] = useState<Record<string, string>>({});
  const seleccionado = elementos.find((elemento) => elemento.id === seleccionadoId);
  const problemas = useMemo(() => validarDisenoEtiqueta({ elementos, anchoMm, altoMm, margenMm, producto }), [elementos, anchoMm, altoMm, margenMm, producto]);
  const mensajesProblema = [...new Set(problemas.map((problema) => problema.mensaje))];
  const erroresDiseno = [...new Set(problemas.filter((problema) => problema.nivel === "error").map((problema) => problema.mensaje))];
  const codigoImpresion = producto.codigoUniversal || producto.clave;
  const margenPx = margenMm * ESCALA;

  useEffect(() => {
    const barras = crearImagenCodigo("barras", producto), qr = crearImagenCodigo("qr", producto);
    void Promise.all([barras.imagen.decode(), qr.imagen.decode()]).then(() => { setImagenes({ barras: barras.imagen, qr: qr.imagen }); setUrls({ barras: barras.url, qr: qr.url }); });
  }, [producto]);
  useEffect(() => {
    if (!vistaGrande) return;
    const cerrar = (evento: KeyboardEvent) => { if (evento.key === "Escape") setVistaGrande(false); };
    window.addEventListener("keydown", cerrar); return () => window.removeEventListener("keydown", cerrar);
  }, [vistaGrande]);

  const ajustarElementos = (nuevoAnchoMm: number, nuevoAltoMm: number, nuevoMargenMm: number) => {
    const limiteAncho = Math.max(20, (nuevoAnchoMm - nuevoMargenMm * 2) * ESCALA), limiteAlto = Math.max(12, (nuevoAltoMm - nuevoMargenMm * 2) * ESCALA), margen = nuevoMargenMm * ESCALA;
    elementos.forEach((elemento) => {
      const nuevoAncho = Math.min(elemento.ancho, limiteAncho), nuevoAlto = Math.min(elemento.alto, limiteAlto);
      redimensionar(elemento.id, nuevoAncho, nuevoAlto);
      mover(elemento.id, Math.min(Math.max(elemento.x, margen), nuevoAnchoMm * ESCALA - margen - nuevoAncho), Math.min(Math.max(elemento.y, margen), nuevoAltoMm * ESCALA - margen - nuevoAlto));
    });
  };
  const interceptarImpresionInvalida = (evento: React.MouseEvent<HTMLDivElement>) => {
    const boton = (evento.target as HTMLElement).closest("button");
    if (!boton?.textContent?.trim().startsWith("Imprimir") || erroresDiseno.length === 0) return;
    evento.preventDefault();
    evento.stopPropagation();
    setPanelMovil("diseno");
  };
  const estiloPagina = useMemo(() => `@media print { @page { size: ${anchoMm}mm ${altoMm}mm; margin: 0; } body > *:not(#zona-impresion) { display: none !important; } #zona-impresion { display: block !important; margin: 0; padding: 0; } .etiqueta-imprimible { width: ${anchoMm}mm; height: ${altoMm}mm; page-break-after: always; break-after: page; overflow: hidden; position: relative; background: white; } .etiqueta-imprimible:last-child { page-break-after: auto; break-after: auto; } }`, [anchoMm, altoMm]);
  const zonaImpresion = <div id="zona-impresion" className="hidden">{Array.from({ length: cantidad }, (_, indice) => <div key={indice} className="etiqueta-imprimible">{elementos.map((elemento) => elemento.tipo === "barras" || elemento.tipo === "qr" ? <img key={elemento.id} src={urls[elemento.tipo]} alt="" style={{ position: "absolute", left: `${elemento.x / ESCALA}mm`, top: `${elemento.y / ESCALA}mm`, width: `${elemento.ancho / ESCALA}mm`, height: `${elemento.alto / ESCALA}mm` }} /> : <span key={elemento.id} style={{ position: "absolute", left: `${elemento.x / ESCALA}mm`, top: `${elemento.y / ESCALA}mm`, width: `${elemento.ancho / ESCALA}mm`, height: `${elemento.alto / ESCALA}mm`, fontSize: `${elemento.tamanoFuente / ESCALA}mm`, lineHeight: 1, fontFamily: elemento.tipo === "clave" || elemento.tipo === "codigo" ? "monospace" : "sans-serif", fontWeight: elemento.tipo === "modelo" ? 700 : 400, overflow: "hidden" }}>{textoElemento(elemento.tipo, producto)}</span>)}</div>)}</div>;
  const panelVistaGrande = seleccionado && <aside className="fixed bottom-5 right-5 z-[110] w-[min(18rem,calc(100vw-2.5rem))] rounded-[2rem] border border-white/70 bg-[var(--surface)]/95 p-5 shadow-2xl backdrop-blur-xl sm:bottom-auto sm:top-28"><h3 className="font-semibold">Editar elemento seleccionado</h3><label className="mt-3 block text-sm">Ancho: {(seleccionado.ancho / ESCALA).toFixed(1)} mm<input type="range" min="20" max={Math.max(20, anchoMm * ESCALA - margenPx * 2)} value={seleccionado.ancho} onChange={(evento) => { const ancho = Number(evento.target.value); redimensionar(seleccionado.id, ancho, seleccionado.alto); mover(seleccionado.id, Math.min(seleccionado.x, anchoMm * ESCALA - margenPx - ancho), seleccionado.y); }} className="mt-1 w-full accent-[var(--primary)]" /></label><label className="mt-3 block text-sm">Alto: {(seleccionado.alto / ESCALA).toFixed(1)} mm<input type="range" min="12" max={Math.max(12, altoMm * ESCALA - margenPx * 2)} value={seleccionado.alto} onChange={(evento) => { const alto = Number(evento.target.value); redimensionar(seleccionado.id, seleccionado.ancho, alto); mover(seleccionado.id, seleccionado.x, Math.min(seleccionado.y, altoMm * ESCALA - margenPx - alto)); }} className="mt-1 w-full accent-[var(--primary)]" /></label>{seleccionado.tipo !== "barras" && seleccionado.tipo !== "qr" && <label className="mt-3 block text-sm">Texto: {seleccionado.tamanoFuente}px<input type="range" min="8" max="30" value={seleccionado.tamanoFuente} onChange={(evento) => cambiarFuente(seleccionado.id, Number(evento.target.value))} className="mt-1 w-full accent-[var(--primary)]" /></label>}<button type="button" onClick={eliminarSeleccionado} className="mt-4 w-full rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-[var(--error)]"><i className="bx bx-trash mr-2" />Quitar elemento</button></aside>;
  const estilosEditor = `
    @media (max-width: 1535px) {
      .editor-etiquetas > :nth-child(n+3):nth-child(-n+6) { display: none; }
      .editor-etiquetas[data-panel="campos"] > :nth-child(4),
      .editor-etiquetas[data-panel="diseno"] > :nth-child(5),
      .editor-etiquetas[data-panel="diseno"] > :nth-child(6),
      .editor-etiquetas[data-panel="imprimir"] > :nth-child(3),
      .editor-etiquetas[data-panel="imprimir"] > :nth-child(6) { display: block; }
      .editor-etiquetas[data-panel="diseno"] > :nth-child(6) > section:nth-child(2) { display: none; }
      .editor-etiquetas[data-panel="imprimir"] > :nth-child(6) > section:nth-child(1) { display: none; }
    }
    @media (min-width: 1536px) {
      .editor-etiquetas > :nth-child(4), .editor-etiquetas > :nth-child(5), .editor-etiquetas > :nth-child(6) { border: 0 !important; border-radius: 0 !important; background: transparent !important; box-shadow: none !important; }
      .editor-etiquetas > :nth-child(4) { border-right: 1px solid rgb(255 255 255 / 60%) !important; }
      .editor-etiquetas > :nth-child(6) { border-left: 1px solid rgb(255 255 255 / 60%) !important; padding: 1rem; }
      .editor-etiquetas > :nth-child(6) > section, .editor-etiquetas > .panel-qz > section { border: 0 !important; background: transparent !important; box-shadow: none !important; }
      .editor-etiquetas > :nth-child(6) > section + section { border-top: 1px solid rgb(255 255 255 / 60%) !important; border-radius: 0 !important; }
    }
  `;

  return <div data-panel={panelMovil} onClickCapture={interceptarImpresionInvalida} className="editor-etiquetas grid gap-4 overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/35 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl sm:p-5 2xl:grid-cols-[16rem_minmax(0,1fr)_19rem] 2xl:gap-0">
    <nav aria-label="Herramientas del editor" className="sticky top-20 z-30 col-span-full grid grid-cols-3 gap-1 rounded-[1.5rem] border border-white/70 bg-[var(--surface)]/90 p-1.5 shadow-lg backdrop-blur-xl 2xl:hidden">{panelesMoviles.map((panel) => <button key={panel.id} type="button" onClick={() => setPanelMovil(panel.id)} aria-pressed={panelMovil === panel.id} className={`flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-semibold sm:flex-row sm:justify-center sm:text-sm ${panelMovil === panel.id ? "bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] text-white shadow" : "text-[var(--on-surface-variant)]"}`}><i className={`bx ${panel.icono} text-xl`} /><span className="truncate">{panel.etiqueta}</span></button>)}</nav>
    {problemas.length > 0 ? <div role="alert" className="col-span-full rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-[var(--error)]"><div className="flex items-start gap-3"><i className="bx bx-error-circle mt-0.5 text-2xl" /><div><strong>Revisa el diseño antes de imprimir</strong><ul className="mt-1 list-disc space-y-1 pl-5">{mensajesProblema.map((mensaje) => <li key={mensaje}>{mensaje}</li>)}</ul><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => { organizar(); setPanelMovil("diseno"); }} className="rounded-full bg-[var(--error)] px-4 py-2 font-semibold text-white"><i className="bx bx-grid-alt mr-2" />Organizar automáticamente</button><button type="button" onClick={() => setPanelMovil("diseno")} className="rounded-full bg-red-100 px-4 py-2 font-semibold">Ver elementos marcados</button></div></div></div></div> : elementos.length > 0 ? <div className="col-span-full flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800"><i className="bx bx-check-circle text-xl" />Diseño sin superposiciones y dentro del margen.</div> : <div className="col-span-full flex items-center gap-2 rounded-full bg-white/55 px-4 py-2 text-sm text-[var(--on-surface-variant)]"><i className="bx bx-info-circle text-xl" />Agrega campos para comenzar el diseño.</div>}
    <div className="panel-qz 2xl:col-span-3 2xl:order-last 2xl:border-t 2xl:border-white/60 2xl:p-4"><ImpresionDirecta producto={producto} cantidad={cantidad} erroresDiseno={erroresDiseno} /></div>
    <aside className="rounded-[2.5rem] border border-white/60 bg-white/40 p-5 backdrop-blur-xl"><h2 className="text-xl font-semibold">Campos disponibles</h2><p className="mt-1 text-sm text-[var(--on-surface-variant)]">Agrega un campo y arrástralo dentro de la etiqueta.</p><div className="mt-5 grid gap-2">{campos.map((campo) => { const agregado = elementos.some((elemento) => elemento.tipo === campo.tipo); return <button key={campo.tipo} type="button" disabled={agregado} onClick={() => agregar(campo.tipo)} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left font-medium ${agregado ? "bg-purple-100 text-[var(--primary)]" : "bg-white/55 hover:bg-white"}`}><i className={`bx ${campo.icono} text-xl text-[var(--primary)]`} />{campo.etiqueta}<span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold">{agregado ? <><i className="bx bx-check" />Agregado</> : <i className="bx bx-plus text-lg" />}</span></button>; })}</div>{elementos.length > 0 && <div className="mt-6 border-t border-white/60 pt-5"><h3 className="font-semibold">Elementos agregados</h3><div className="mt-3 space-y-2">{elementos.map((elemento) => { const campo = campos.find((opcion) => opcion.tipo === elemento.tipo); return <div key={elemento.id} className={`flex items-center gap-2 rounded-2xl px-3 py-2 ${elemento.id === seleccionadoId ? "bg-purple-100" : "bg-white/45"}`}><button type="button" onClick={() => seleccionar(elemento.id)} className="min-w-0 flex-1 truncate text-left text-sm font-medium"><i className={`bx ${campo?.icono} mr-2 text-[var(--primary)]`} />{campo?.etiqueta}</button><button type="button" onClick={() => eliminar(elemento.id)} aria-label={`Quitar ${campo?.etiqueta}`} className="grid size-8 shrink-0 place-items-center rounded-full bg-red-100 text-[var(--error)]"><i className="bx bx-x" /></button></div>; })}</div></div>}</aside>

    <section className="min-w-0 rounded-[2.5rem] border border-white/60 bg-white/40 p-5 backdrop-blur-xl sm:p-7"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Vista previa</h2><p className="text-sm text-[var(--on-surface-variant)]">La línea punteada marca el margen imprimible.</p></div><div className="flex gap-2"><button type="button" onClick={() => setVistaGrande(true)} className="rounded-full bg-purple-100 px-4 py-2 text-sm font-semibold text-[var(--primary)]"><i className="bx bx-expand mr-2" />Vista grande</button><button type="button" onClick={reiniciar} className="rounded-full bg-white/60 px-4 py-2 text-sm font-semibold"><i className="bx bx-reset mr-2" />Restablecer</button></div></div><div className="overflow-auto rounded-[2rem] bg-[var(--surface-container-high)] p-6"><div className="mx-auto w-max bg-white shadow-xl"><LienzoEtiqueta factor={1} producto={producto} imagenes={imagenes} /></div></div><p className="mt-4 text-center text-xs text-[var(--on-surface-variant)]">Vista a escala · medidas finales {anchoMm} × {altoMm} mm · margen {margenMm} mm</p></section>

    <aside className="space-y-5"><section className="rounded-[2.5rem] border border-white/60 bg-white/40 p-5 backdrop-blur-xl"><h2 className="text-xl font-semibold">Configuración</h2><label className="mt-4 block text-sm font-semibold">Tamaño de etiqueta<select value={`${anchoMm}x${altoMm}`} onChange={(evento) => { const [ancho, alto] = evento.target.value.split("x").map(Number); cambiarTamano(ancho, alto); ajustarElementos(ancho, alto, margenMm); }} className="mt-2 w-full rounded-full bg-white/70 px-4 py-3"><option value="50x25">50 × 25 mm</option><option value="60x40">60 × 40 mm</option><option value="100x50">100 × 50 mm</option></select></label><label className="mt-4 block text-sm font-semibold">Margen seguro: {margenMm} mm<input type="range" min="0" max={Math.max(0, Math.min(anchoMm, altoMm) / 4)} step="0.5" value={margenMm} onChange={(evento) => { const margen = Number(evento.target.value); cambiarMargen(margen); ajustarElementos(anchoMm, altoMm, margen); }} className="mt-2 w-full accent-[var(--primary)]" /></label>{seleccionado && <div className="mt-5 border-t border-white/60 pt-5"><h3 className="font-semibold">Tamaño del elemento</h3><label className="mt-3 block text-sm">Ancho: {(seleccionado.ancho / ESCALA).toFixed(1)} mm<input type="range" min="20" max={Math.max(20, anchoMm * ESCALA - margenPx * 2)} value={seleccionado.ancho} onChange={(evento) => { const ancho = Number(evento.target.value); redimensionar(seleccionado.id, ancho, seleccionado.alto); mover(seleccionado.id, Math.min(seleccionado.x, anchoMm * ESCALA - margenPx - ancho), seleccionado.y); }} className="mt-1 w-full accent-[var(--primary)]" /></label><label className="mt-3 block text-sm">Alto: {(seleccionado.alto / ESCALA).toFixed(1)} mm<input type="range" min="12" max={Math.max(12, altoMm * ESCALA - margenPx * 2)} value={seleccionado.alto} onChange={(evento) => { const alto = Number(evento.target.value); redimensionar(seleccionado.id, seleccionado.ancho, alto); mover(seleccionado.id, seleccionado.x, Math.min(seleccionado.y, altoMm * ESCALA - margenPx - alto)); }} className="mt-1 w-full accent-[var(--primary)]" /></label>{seleccionado.tipo !== "barras" && seleccionado.tipo !== "qr" && <label className="mt-3 block text-sm">Texto: {seleccionado.tamanoFuente}px<input type="range" min="8" max="30" value={seleccionado.tamanoFuente} onChange={(evento) => cambiarFuente(seleccionado.id, Number(evento.target.value))} className="mt-1 w-full accent-[var(--primary)]" /></label>}<button type="button" onClick={eliminarSeleccionado} className="mt-4 w-full rounded-full bg-red-100 px-4 py-2 font-semibold text-[var(--error)]"><i className="bx bx-trash mr-2" />Quitar elemento</button></div>}</section><section className="rounded-[2.5rem] border border-white/60 bg-white/40 p-5 backdrop-blur-xl"><h2 className="text-xl font-semibold">Impresión</h2><p className="mt-2 text-sm text-[var(--on-surface-variant)]">Código impreso: <span className="font-mono">{codigoImpresion}</span></p><label className="mt-4 block text-sm font-semibold">Cantidad de etiquetas<input type="number" min="1" max="100" value={cantidad} onChange={(evento) => setCantidad(Math.min(100, Math.max(1, Number(evento.target.value) || 1)))} className="mt-2 w-full rounded-full bg-white/70 px-4 py-3" /></label><button type="button" disabled={!elementos.length} onClick={() => window.print()} className="mt-4 w-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"><i className="bx bx-printer mr-2" />Imprimir {cantidad}</button><p className="mt-3 text-xs text-[var(--on-surface-variant)]">Usa escala 100 %, sin márgenes adicionales y la impresora térmica.</p></section></aside>

    {vistaGrande && <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--surface)]/95 p-4 backdrop-blur-xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="titulo-vista-grande"><header className="mb-5 flex items-center justify-between gap-4"><div><h2 id="titulo-vista-grande" className="text-2xl font-bold">Vista grande de la etiqueta</h2><p className="text-sm text-[var(--on-surface-variant)]">Arrastra los campos; usa el panel de configuración para cambiar sus dimensiones.</p></div><button type="button" onClick={() => setVistaGrande(false)} aria-label="Cerrar vista grande" className="grid size-12 place-items-center rounded-full bg-white text-2xl shadow"><i className="bx bx-x" /></button></header><div className="grid min-h-0 flex-1 place-items-center overflow-auto rounded-[2.5rem] bg-[var(--surface-container-high)] p-8"><div className="bg-white shadow-2xl"><LienzoEtiqueta factor={1.65} producto={producto} imagenes={imagenes} /></div></div><p className="mt-4 text-center text-sm text-[var(--on-surface-variant)]">Área punteada: margen seguro de {margenMm} mm · Presiona Esc para cerrar</p></div>}
    {vistaGrande && panelVistaGrande}
    <style>{estiloPagina}{estilosEditor}</style>{typeof document !== "undefined" && createPortal(zonaImpresion, document.body)}
  </div>;
}
