"use client";

import { useCallback, useEffect, useState } from "react";
import { crearComandosTermicos, lenguajeSugerido, type LenguajeImpresora } from "@/lib/etiquetas/adaptadores-termicos";
import { useEditorEtiquetas } from "@/stores/editor-etiquetas";
import type { ProductoEtiqueta } from "@/types/etiqueta";

type EstadoConexion = "desconectado" | "conectando" | "conectado" | "error";

async function clienteQz() {
  const modulo = await import("qz-tray");
  return modulo.default;
}

export function ImpresionDirecta({ producto, cantidad, erroresDiseno = [] }: { producto: ProductoEtiqueta; cantidad: number; erroresDiseno?: string[] }) {
  const { anchoMm, altoMm, elementos } = useEditorEtiquetas();
  const [estado, setEstado] = useState<EstadoConexion>("desconectado");
  const [impresoras, setImpresoras] = useState<string[]>([]);
  const [impresora, setImpresora] = useState("");
  const [lenguaje, setLenguaje] = useState<LenguajeImpresora>("ZPL");
  const [dpi, setDpi] = useState(203);
  const [mensaje, setMensaje] = useState("");

  const actualizarImpresoras = useCallback(async (silencioso = false) => {
    try {
      const qz = await clienteQz();
      if (!qz.websocket.isActive()) { setEstado("desconectado"); return; }
      const encontradas = await qz.printers.find();
      const lista = Array.isArray(encontradas) ? encontradas : encontradas ? [encontradas] : [];
      setImpresoras(lista);
      setEstado("conectado");
      setImpresora((actual) => lista.includes(actual) ? actual : lista[0] ?? "");
      if (!silencioso) setMensaje(lista.length ? `${lista.length} impresora${lista.length === 1 ? "" : "s"} en línea.` : "QZ está conectado, pero no encontró impresoras disponibles.");
    } catch {
      setEstado("error");
      if (!silencioso) setMensaje("No fue posible actualizar las impresoras de Windows.");
    }
  }, []);

  useEffect(() => {
    if (estado !== "conectado") return;
    const intervalo = window.setInterval(() => { void actualizarImpresoras(true); }, 10000);
    return () => window.clearInterval(intervalo);
  }, [actualizarImpresoras, estado]);

  const conectar = async () => {
    setEstado("conectando"); setMensaje("");
    try {
      const qz = await clienteQz();
      if (!qz.websocket.isActive()) await qz.websocket.connect({ retries: 2, delay: 1 });
      const encontradas = await qz.printers.find();
      const lista = Array.isArray(encontradas) ? encontradas : encontradas ? [encontradas] : [];
      setImpresoras(lista); setEstado("conectado");
      if (lista[0]) { setImpresora(lista[0]); setLenguaje(lenguajeSugerido(lista[0])); }
      setMensaje(lista.length ? `${lista.length} impresora${lista.length === 1 ? "" : "s"} en línea.` : "QZ está conectado, pero no encontró impresoras disponibles.");
    } catch (causa) {
      setEstado("error"); setMensaje(causa instanceof Error ? causa.message : "No fue posible conectar con QZ Tray. Confirma que esté instalado y abierto.");
    }
  };
  const desconectar = async () => {
    try { const qz = await clienteQz(); if (qz.websocket.isActive()) await qz.websocket.disconnect(); }
    finally { setEstado("desconectado"); setMensaje("QZ Tray desconectado. La impresión directa no está disponible."); }
  };
  const imprimir = async () => {
    setMensaje("");
    try {
      if (!impresora) throw new Error("Selecciona una impresora.");
      if (erroresDiseno.length) throw new Error("Corrige los elementos fuera de margen o encimados antes de imprimir.");
      const qz = await clienteQz();
      if (!qz.websocket.isActive()) throw new Error("Conecta QZ Tray antes de imprimir.");
      const comandos = crearComandosTermicos(lenguaje, { anchoMm, altoMm, cantidad, dpi, elementos, producto });
      const configuracion = qz.configs.create(impresora, { encoding: "UTF-8" });
      await qz.print(configuracion, [{ type: "raw", format: "command", flavor: "plain", data: comandos }]);
      setMensaje(`Se enviaron ${cantidad} etiqueta${cantidad === 1 ? "" : "s"} directamente a ${impresora}.`);
    } catch (causa) { setMensaje(causa instanceof Error ? causa.message : "No fue posible enviar la etiqueta."); }
  };

  const impresoraEnLinea = estado === "conectado" && impresoras.includes(impresora);
  return <section className="rounded-[2.5rem] border border-white/60 bg-white/40 p-5 backdrop-blur-xl sm:p-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
      <div className="min-w-56 flex-1"><h2 className="flex items-center gap-3 text-xl font-semibold"><span className={`relative grid size-10 shrink-0 place-items-center rounded-full ${impresoraEnLinea ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-[var(--error)]"}`}><i className="bx bx-printer text-2xl" /><span className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-white ${impresoraEnLinea ? "bg-emerald-500" : "bg-red-500"}`} /></span>Impresión directa con QZ Tray</h2><p className="mt-1 text-sm text-[var(--on-surface-variant)]">{impresoraEnLinea ? "Impresora en línea: lista para recibir etiquetas directamente." : "Impresora fuera de línea: conecta QZ Tray y selecciona una impresora disponible."}</p></div>
      <div className="flex flex-wrap gap-2">{estado === "conectado" && <button type="button" onClick={() => void actualizarImpresoras()} className="rounded-full bg-purple-100 px-4 py-3 font-semibold text-[var(--primary)]"><i className="bx bx-refresh mr-2" />Actualizar</button>}{estado !== "conectado" ? <button type="button" disabled={estado === "conectando"} onClick={conectar} className="rounded-full bg-purple-100 px-5 py-3 font-semibold text-[var(--primary)] disabled:opacity-50"><i className="bx bx-plug mr-2" />{estado === "conectando" ? "Conectando…" : "Conectar QZ Tray"}</button> : <button type="button" onClick={desconectar} className="rounded-full bg-white/60 px-5 py-3 font-semibold"><i className="bx bx-power-off mr-2" />Desconectar</button>}</div>
    </div>
    {estado === "conectado" && <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-[minmax(16rem,1fr)_14rem_9rem_auto]">
      <label className="text-sm font-semibold">Impresora <span className={`ml-1 inline-flex items-center gap-1 text-xs ${impresoraEnLinea ? "text-emerald-700" : "text-[var(--error)]"}`}><span className={`size-2 rounded-full ${impresoraEnLinea ? "bg-emerald-500" : "bg-red-500"}`} />{impresoraEnLinea ? "En línea" : "No disponible"}</span><select value={impresora} onChange={(evento) => { setImpresora(evento.target.value); setLenguaje(lenguajeSugerido(evento.target.value)); }} className="mt-2 w-full rounded-full bg-white/70 px-4 py-3">{impresoras.length ? impresoras.map((nombre) => <option key={nombre}>{nombre}</option>) : <option value="">Sin impresoras disponibles</option>}</select></label>
      <label className="text-sm font-semibold">Perfil<select value={lenguaje} onChange={(evento) => setLenguaje(evento.target.value as LenguajeImpresora)} className="mt-2 w-full rounded-full bg-white/70 px-4 py-3"><option value="ZPL">Zebra / ZPL</option><option value="EPL">Eltron antigua / EPL</option><option value="TSPL">TSC, Xprinter / TSPL</option></select></label>
      <label className="text-sm font-semibold">Resolución<select value={dpi} onChange={(evento) => setDpi(Number(evento.target.value))} className="mt-2 w-full rounded-full bg-white/70 px-4 py-3"><option value="203">203 DPI</option><option value="300">300 DPI</option><option value="600">600 DPI</option></select></label>
      <button type="button" disabled={!impresoraEnLinea || !elementos.length || erroresDiseno.length > 0} onClick={imprimir} className="self-end rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] px-6 py-3 font-bold text-white disabled:opacity-45"><i className="bx bx-printer mr-2" />Enviar directo</button>
    </div>}
    {mensaje && <p role={estado === "error" ? "alert" : "status"} className={`mt-4 rounded-2xl p-3 text-sm ${estado === "error" ? "bg-red-100 text-[var(--error)]" : "bg-white/55 text-[var(--on-surface-variant)]"}`}>{mensaje}</p>}
    <p className="mt-4 text-xs text-[var(--on-surface-variant)]">La lista se actualiza cada 10 segundos. El perfil debe coincidir con el lenguaje configurado en la impresora. Sin certificado de firma, QZ solicitará autorización visible.</p>
  </section>;
}
