"use client";

import JSZip from "jszip";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Catalogo = { clave: string; nombre: string };
type Resumen = { cantidades: Record<string, number>; completo: boolean; marcas: Catalogo[]; lineas: Catalogo[] };
const recursos = [
  ["productos", "Productos y todos sus campos"], ["imagenes", "Imágenes locales"], ["especificaciones-pantalla", "Fichas técnicas de cristales"],
  ["lineas", "Líneas"], ["marcas", "Marcas"], ["tipos-producto", "Tipos de producto"], ["formas-pantalla", "Formas de pantalla personalizadas"],
] as const;

function SelectorMultiple({ etiqueta, opciones, valor, cambiar }: { etiqueta: string; opciones: Catalogo[]; valor: string[]; cambiar: (v: string[]) => void }) {
  return <label className="grid gap-2 text-sm font-semibold"><span>{etiqueta}</span><select multiple value={valor} onChange={(e) => cambiar(Array.from(e.currentTarget.selectedOptions, o => o.value))} className="min-h-32 rounded-2xl border border-white/60 bg-white/65 p-3 font-normal"><option value="" disabled>Usa Ctrl o ⌘ para seleccionar varias</option>{opciones.map(o => <option key={o.clave} value={o.clave}>{o.nombre}</option>)}</select></label>;
}

export function GestorRespaldos({ marcas, lineas }: { marcas: Catalogo[]; lineas: Catalogo[] }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false), [vista, setVista] = useState<"crear" | "restaurar">("crear");
  const [clave, setClave] = useState(""), [ocupado, setOcupado] = useState(false), [mensaje, setMensaje] = useState(""), [error, setError] = useState("");
  const [marcasElegidas, setMarcas] = useState<string[]>([]), [lineasElegidas, setLineas] = useState<string[]>([]), [fichas, setFichas] = useState<"todos" | "con" | "sin">("todos"), [imagenes, setImagenes] = useState(true);
  const [archivo, setArchivo] = useState<File | null>(null), [resumen, setResumen] = useState<Resumen | null>(null), [seleccion, setSeleccion] = useState<string[]>(recursos.map(([id]) => id));
  const [modo, setModo] = useState<"fusionar" | "reemplazar-todo">("fusionar"), [conflicto, setConflicto] = useState<"conservar" | "actualizar">("actualizar"), [existencia, setExistencia] = useState<"conservar" | "restaurar">("conservar"), [politicaImagen, setPoliticaImagen] = useState<"conservar" | "restaurar" | "solo-faltantes">("solo-faltantes"), [confirmacion, setConfirmacion] = useState("");

  const descargar = async () => {
    setOcupado(true); setError(""); setMensaje("");
    try {
      const q = new URLSearchParams({ fichas, imagenes: imagenes ? "1" : "0" }); marcasElegidas.forEach(x => q.append("marca", x)); lineasElegidas.forEach(x => q.append("linea", x));
      const respuesta = await fetch(`/api/respaldos/inventario?${q}`, { headers: { "x-tufis-backup-key": clave } });
      if (!respuesta.ok) throw new Error((await respuesta.json()).error || "No fue posible generar el respaldo.");
      const blob = await respuesta.blob(), nombre = respuesta.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] || "tufis-inventario.tufis.zip";
      const url = URL.createObjectURL(blob), enlace = document.createElement("a"); enlace.href = url; enlace.download = nombre; enlace.click(); URL.revokeObjectURL(url); setMensaje("Respaldo generado correctamente.");
    } catch (causa) { setError(causa instanceof Error ? causa.message : "No fue posible generar el respaldo."); } finally { setOcupado(false); }
  };

  const inspeccionar = async (entrada: File | null) => {
    setArchivo(entrada); setResumen(null); setError(""); setMensaje(""); if (!entrada) return;
    try {
      const zip = await JSZip.loadAsync(await entrada.arrayBuffer(), { checkCRC32: true });
      const manifest = zip.file("manifest.json"), marcasJson = zip.file("datos/marcas.json"), lineasJson = zip.file("datos/lineas.json");
      if (!manifest || !marcasJson || !lineasJson) throw new Error("El archivo no tiene la estructura de un respaldo TUFIS.");
      const m = JSON.parse(await manifest.async("text")); if (m.formato !== "tufis-inventario" || m.version !== 1) throw new Error("La versión del respaldo no es compatible.");
      setResumen({ cantidades: m.cantidades, completo: Boolean(m.completo), marcas: JSON.parse(await marcasJson.async("text")), lineas: JSON.parse(await lineasJson.async("text")) });
      setMarcas([]); setLineas([]);
    } catch (causa) { setError(causa instanceof Error ? causa.message : "No fue posible inspeccionar el respaldo."); }
  };

  const restaurar = async () => {
    if (!archivo) return; setOcupado(true); setError(""); setMensaje("");
    try {
      const form = new FormData(); form.set("archivo", archivo); form.set("opciones", JSON.stringify({ recursos: seleccion, marcas: marcasElegidas, lineas: lineasElegidas, fichas, modo, conflicto, existencia, imagenes: politicaImagen, confirmacion }));
      const respuesta = await fetch("/api/respaldos/inventario", { method: "POST", headers: { "x-tufis-backup-key": clave }, body: form });
      const cuerpo = await respuesta.json(); if (!respuesta.ok) throw new Error(cuerpo.error || "No fue posible restaurar el respaldo.");
      setMensaje(`Restauración terminada: ${cuerpo.resultado.productos} productos, ${cuerpo.resultado.especificaciones} fichas y ${cuerpo.resultado.imagenes} imágenes.`); router.refresh();
    } catch (causa) { setError(causa instanceof Error ? causa.message : "No fue posible restaurar el respaldo."); } finally { setOcupado(false); }
  };

  return <>
    <button type="button" onClick={() => setAbierto(true)} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/70 bg-white/55 px-6 py-3 font-semibold text-[var(--primary)] backdrop-blur-xl hover:bg-white/75"><i className="bx bx-archive text-xl" />Respaldos</button>
    {abierto && <div className="fixed inset-0 z-[110] overflow-y-auto bg-[var(--on-surface)]/35 p-3 backdrop-blur-md sm:p-6"><section role="dialog" aria-modal="true" aria-labelledby="titulo-respaldos" className="mx-auto my-3 w-full max-w-5xl rounded-[2.5rem] border border-white/60 bg-[var(--surface)] p-5 shadow-2xl sm:p-8">
      <header className="flex items-start justify-between gap-4"><div><p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--primary)]">Protección de datos</p><h2 id="titulo-respaldos" className="mt-1 text-2xl font-bold sm:text-3xl">Respaldos del inventario</h2><p className="mt-2 text-sm text-[var(--on-surface-variant)]">Exporta todo el inventario o restaura únicamente los recursos que elijas.</p></div><button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar respaldos" className="grid size-11 shrink-0 place-items-center rounded-full bg-white/70"><i className="bx bx-x text-2xl" /></button></header>
      <div className="mt-6 flex gap-2 rounded-full bg-[var(--surface-container)] p-1"><button onClick={() => setVista("crear")} className={`flex-1 rounded-full px-4 py-3 font-semibold ${vista === "crear" ? "bg-[var(--primary)] text-white" : ""}`}>Nuevo respaldo</button><button onClick={() => setVista("restaurar")} className={`flex-1 rounded-full px-4 py-3 font-semibold ${vista === "restaurar" ? "bg-[var(--primary)] text-white" : ""}`}>Restaurar respaldo</button></div>
      <label className="mt-6 grid gap-2"><span className="text-sm font-semibold">Clave administrativa</span><input type="password" autoComplete="current-password" value={clave} onChange={e => setClave(e.target.value)} className="rounded-full border border-white/70 bg-white/65 px-5 py-3" placeholder="Clave para respaldos" /></label>
      {vista === "crear" ? <div className="mt-6 grid gap-5 lg:grid-cols-2"><SelectorMultiple etiqueta="Filtrar por marca (vacío incluye todas)" opciones={marcas} valor={marcasElegidas} cambiar={setMarcas} /><SelectorMultiple etiqueta="Filtrar por línea (vacío incluye todas)" opciones={lineas} valor={lineasElegidas} cambiar={setLineas} /><label className="grid gap-2 text-sm font-semibold">Productos incluidos<select value={fichas} onChange={e => setFichas(e.target.value as typeof fichas)} className="rounded-full border border-white/70 bg-white/65 px-4 py-3 font-normal"><option value="todos">Todos, tengan o no ficha técnica</option><option value="con">Sólo productos con ficha técnica</option><option value="sin">Sólo productos sin ficha técnica</option></select></label><label className="flex items-center gap-3 rounded-2xl bg-white/50 p-4 font-semibold"><input type="checkbox" checked={imagenes} onChange={e => setImagenes(e.target.checked)} className="size-5 accent-[var(--primary)]" />Incluir imágenes locales</label><button disabled={ocupado || !clave} onClick={descargar} className="rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] px-6 py-3 font-semibold text-white disabled:opacity-50 lg:col-span-2"><i className="bx bx-download mr-2" />{ocupado ? "Generando..." : "Generar y descargar respaldo"}</button></div> : <div className="mt-6 grid gap-5"><label className="grid gap-2 text-sm font-semibold"><span>Archivo TUFIS</span><input type="file" accept=".zip,.tufis,application/zip" onChange={e => inspeccionar(e.target.files?.[0] || null)} className="rounded-2xl border border-dashed border-[var(--outline-variant)] bg-white/50 p-4 font-normal" /></label>{resumen && <><div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">{Object.entries(resumen.cantidades).map(([k,v]) => <div key={k} className="rounded-2xl bg-white/55 p-3"><strong className="block text-xl text-[var(--primary)]">{v}</strong><span className="text-xs capitalize text-[var(--on-surface-variant)]">{k.replace(/([A-Z])/g," $1")}</span></div>)}</div><fieldset><legend className="mb-2 font-semibold">Qué deseas restaurar</legend><div className="grid gap-2 sm:grid-cols-2">{recursos.map(([id,etiqueta]) => <label key={id} className="flex items-center gap-3 rounded-2xl bg-white/50 p-3"><input type="checkbox" checked={seleccion.includes(id)} onChange={e => setSeleccion(s => e.target.checked ? [...s,id] : s.filter(x => x !== id))} className="size-5 accent-[var(--primary)]" />{etiqueta}</label>)}</div></fieldset><div className="grid gap-5 lg:grid-cols-2"><SelectorMultiple etiqueta="Sólo productos de estas marcas" opciones={resumen.marcas} valor={marcasElegidas} cambiar={setMarcas} /><SelectorMultiple etiqueta="Sólo productos de estas líneas" opciones={resumen.lineas} valor={lineasElegidas} cambiar={setLineas} /></div><div className="grid gap-3 md:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Modo<select value={modo} onChange={e => setModo(e.target.value as typeof modo)} className="rounded-full bg-white/65 px-4 py-3 font-normal"><option value="fusionar">Fusionar sin eliminar otros datos</option><option value="reemplazar-todo" disabled={!resumen.completo}>Reemplazar todo el inventario</option></select></label><label className="grid gap-2 text-sm font-semibold">Si la Clave ya existe<select value={conflicto} onChange={e => setConflicto(e.target.value as typeof conflicto)} className="rounded-full bg-white/65 px-4 py-3 font-normal"><option value="actualizar">Actualizar con el respaldo</option><option value="conservar">Conservar el producto actual</option></select></label><label className="grid gap-2 text-sm font-semibold">Existencias<select value={existencia} onChange={e => setExistencia(e.target.value as typeof existencia)} className="rounded-full bg-white/65 px-4 py-3 font-normal"><option value="conservar">Conservar existencia actual</option><option value="restaurar">Restaurar existencia del archivo</option></select></label><label className="grid gap-2 text-sm font-semibold">Imágenes<select value={politicaImagen} onChange={e => setPoliticaImagen(e.target.value as typeof politicaImagen)} className="rounded-full bg-white/65 px-4 py-3 font-normal"><option value="solo-faltantes">Restaurar sólo cuando falte</option><option value="restaurar">Reemplazar con el respaldo</option><option value="conservar">Conservar todas las actuales</option></select></label></div>{modo === "reemplazar-todo" && <label className="grid gap-2 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-[var(--error)]">Escribe RESTAURAR para confirmar<input value={confirmacion} onChange={e => setConfirmacion(e.target.value)} className="rounded-full border border-red-200 bg-white px-4 py-3 text-[var(--on-surface)]" /></label>}<button disabled={ocupado || !clave || !seleccion.length || (modo === "reemplazar-todo" && confirmacion !== "RESTAURAR")} onClick={restaurar} className="rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] px-6 py-3 font-semibold text-white disabled:opacity-50">{ocupado ? "Restaurando..." : "Validar y restaurar selección"}</button></>}</div>}
      {error && <p role="alert" className="mt-5 rounded-2xl bg-red-100 p-4 text-[var(--error)]">{error}</p>}{mensaje && <p role="status" className="mt-5 rounded-2xl bg-purple-100 p-4 text-[var(--primary)]">{mensaje}</p>}
    </section></div>}
  </>;
}
