"use client";

import { useState } from "react";
import { listarTransferenciasFtf, transferirFtfAParalelo } from "@/actions/transferencia-ftf";

type Transferencias = Awaited<ReturnType<typeof listarTransferenciasFtf>>;

export function TransferenciasFtf({ inicial }: { inicial: Transferencias }) {
  const [registros, setRegistros] = useState(inicial);
  const [ocupado, setOcupado] = useState("");
  const [mensajes, setMensajes] = useState<Record<string, string>>({});
  const refrescar = async () => setRegistros(await listarTransferenciasFtf());
  const transferir = async (productoId: string) => {
    setOcupado(productoId);
    setMensajes((actuales) => ({ ...actuales, [productoId]: "Comparando Clave, modelo y diagonal de la FTF guardada…" }));
    try {
      const resultado = await transferirFtfAParalelo(productoId, false);
      setMensajes((actuales) => ({ ...actuales, [productoId]: resultado.mensaje }));
      await refrescar();
    } catch (error) {
      setMensajes((actuales) => ({ ...actuales, [productoId]: error instanceof Error ? error.message : "No fue posible pasar la FTF a Paralelo." }));
    } finally { setOcupado(""); }
  };
  const listas = registros.filter((registro) => registro.estado === "LISTA").length;
  const revision = registros.filter((registro) => registro.estado === "REVISION").length;
  const existentes = registros.filter((registro) => registro.estado === "EXISTENTE").length;
  return <section className="space-y-5">
    <div className="rounded-[2.5rem] border border-white/60 bg-white/45 p-5 backdrop-blur-xl sm:p-8">
      <h2 className="text-2xl font-semibold">Pasar FTF a Paralelo Visual</h2>
      <p className="mt-2 max-w-4xl text-[var(--on-surface-variant)]">Aquí no se ejecuta scraping ni se vuelve a abrir el enlace. Sólo se usan FTF completas guardadas previamente en Seguimiento y se comparan Clave, modelo, variante y diagonal antes de publicarlas en Paralelo Visual.</p>
      <ol className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Proceso de transferencia">
        {["1. Localizar por Clave", "2. Validar modelo", "3. Extraer diagonal", "4. Aplicar tolerancia", "5. Revisar campos", "6. Guardar sin pérdida", "7. Publicar en Paralelo"].map((paso) => <li key={paso} className="rounded-2xl bg-purple-100 px-4 py-3 text-sm font-semibold text-[var(--primary)]">{paso}</li>)}
      </ol>
      <div className="mt-6 flex flex-wrap gap-3 font-mono text-sm"><span className="rounded-full bg-emerald-100 px-4 py-2 text-emerald-900">{listas} listas</span><span className="rounded-full bg-amber-100 px-4 py-2 text-amber-900">{revision} en revisión</span><span className="rounded-full bg-purple-100 px-4 py-2 text-[var(--primary)]">{existentes} transferidas</span><button type="button" onClick={refrescar} className="rounded-full border border-purple-200 px-4 py-2 font-sans font-semibold"><i className="bx bx-refresh mr-2" />Actualizar</button></div>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">{registros.map((registro) => <article key={registro.productoId} className="rounded-[2rem] border border-white/60 bg-white/55 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-xs font-semibold text-[var(--primary)]">Clave {registro.clave}</p><h3 className="mt-1 text-xl font-bold">{registro.marca} {registro.modelo}</h3><p className="text-sm text-[var(--on-surface-variant)]">Fuente: {registro.proveedor} · {registro.modeloFuente}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${registro.estado === "LISTA" ? "bg-emerald-100 text-emerald-900" : registro.estado === "EXISTENTE" ? "bg-purple-100 text-[var(--primary)]" : "bg-amber-100 text-amber-900"}`}>{registro.estado === "LISTA" ? "Lista para transferir" : registro.estado === "EXISTENTE" ? "Ya está en Paralelo" : "Revisión requerida"}</span></div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3"><Dato titulo="Diagonal esperada" valor={registro.diagonalEsperada === null ? "—" : `${registro.diagonalEsperada} in`} /><Dato titulo="Diagonal de FTF" valor={registro.diagonalFuente === null ? "—" : `${registro.diagonalFuente} in`} /><Dato titulo="Display" valor={registro.datos.tecnologia ?? "—"} /><Dato titulo="Medidas" valor={registro.datos.anchoDisplayMm && registro.datos.altoDisplayMm ? `${registro.datos.anchoDisplayMm} × ${registro.datos.altoDisplayMm} mm` : "—"} /><Dato titulo="Resolución" valor={registro.datos.resolucionAnchoPx && registro.datos.resolucionAltoPx ? `${registro.datos.resolucionAnchoPx} × ${registro.datos.resolucionAltoPx}` : "—"} /><Dato titulo="Área" valor={registro.datos.areaDisplayPorcentaje === null ? "—" : `${registro.datos.areaDisplayPorcentaje}%`} /></dl>
      {registro.problemas.length > 0 && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="font-semibold text-amber-950">No se transferirá todavía</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-950">{registro.problemas.map((problema) => <li key={problema}>{problema}</li>)}</ul></div>}
      {registro.estado === "LISTA" && <button type="button" disabled={ocupado === registro.productoId} onClick={() => transferir(registro.productoId)} className="mt-5 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] px-5 py-2.5 font-semibold text-white disabled:opacity-50"><i className={`bx ${ocupado === registro.productoId ? "bx-loader-alt animate-spin" : "bx-check-shield"} mr-2`} />{ocupado === registro.productoId ? "Comparando y guardando…" : "Validar FTF guardada y pasar a Paralelo"}</button>}
      {registro.estado === "REVISION" && <p className="mt-5 rounded-2xl bg-white/70 p-4 text-sm font-semibold">Esta FTF debe completarse primero en Seguimiento. Pasar a Paralelo no volverá a consultar el proveedor.</p>}
      {mensajes[registro.productoId] && <p role="status" className="mt-3 w-full text-sm font-semibold">{mensajes[registro.productoId]}</p>}
    </article>)}{!registros.length && <p className="rounded-[2rem] bg-white/55 p-8 text-center text-[var(--on-surface-variant)]">No hay FTF pendientes de transferir. Las fichas que ya están en Paralelo se conservan allí y no vuelven a esta bandeja.</p>}</div>
  </section>;
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) { return <div className="rounded-2xl bg-white/70 p-3"><dt className="text-xs font-semibold text-[var(--on-surface-variant)]">{titulo}</dt><dd className="mt-1 break-words font-mono text-xs">{valor}</dd></div>; }
