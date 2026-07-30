"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { eliminarCatalogo } from "@/actions/catalogos";
import { etiquetasCatalogo, rutasCatalogo, type RegistroCatalogo, type TipoCatalogo } from "@/lib/catalogos/datos-catalogos";

const secciones: { tipo: TipoCatalogo; id: string; descripcion: string }[] = [
  { tipo: "linea", id: "lineas", descripcion: "Clasificación comercial de los productos." },
  { tipo: "marca", id: "marcas", descripcion: "Fabricantes y marcas disponibles." },
  { tipo: "tipoProducto", id: "tipos-producto", descripcion: "Tipos utilizados para inventario y Smart Match." },
];
const normalizar = (valor: string) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-MX");

export function ListadoCatalogos({ datosIniciales }: { datosIniciales: Record<TipoCatalogo, RegistroCatalogo[]> }) {
  const router = useRouter();
  const [aEliminar, setAEliminar] = useState<{ tipo: TipoCatalogo; registro: RegistroCatalogo } | null>(null);
  const [error, setError] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const [busquedas, setBusquedas] = useState<Record<TipoCatalogo, string>>({ linea: "", marca: "", tipoProducto: "" });

  const confirmarEliminacion = async () => {
    if (!aEliminar) return;
    setEliminando(true); setError("");
    try {
      await eliminarCatalogo(aEliminar.tipo, aEliminar.registro.id);
      setAEliminar(null);
      router.refresh();
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No fue posible eliminar el registro.");
    } finally { setEliminando(false); }
  };

  return <>
    <div className="space-y-8">{secciones.map(({ tipo, id, descripcion }) => {
      const titulo = tipo === "tipoProducto" ? "Tipos de producto" : `${etiquetasCatalogo[tipo]}s`;
      const ruta = rutasCatalogo[tipo];
      const termino = normalizar(busquedas[tipo].trim());
      const registros = termino ? datosIniciales[tipo].filter((registro) => normalizar(`${registro.nombre} ${registro.clave}`).includes(termino)) : datosIniciales[tipo];
      return <section id={id} key={tipo} className="scroll-mt-24 rounded-[2.5rem] border border-white/60 bg-white/40 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl sm:p-8">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-semibold">{titulo}</h2><p className="mt-1 text-[var(--on-surface-variant)]">{descripcion}</p></div><Link href={`/catalogos/${ruta}/nuevo`} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] px-5 py-3 font-semibold text-white shadow-lg hover:brightness-110"><i className="bx bx-plus text-xl" />Crear {etiquetasCatalogo[tipo].toLocaleLowerCase("es-MX")}</Link></header>
        {datosIniciales[tipo].length > 15 && <label className="relative mb-5 block"><span className="sr-only">Buscar en {titulo.toLocaleLowerCase("es-MX")}</span><i className="bx bx-search pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-xl text-[var(--on-surface-variant)]" /><input value={busquedas[tipo]} onChange={(evento) => setBusquedas((actuales) => ({ ...actuales, [tipo]: evento.target.value }))} placeholder={`Buscar ${etiquetasCatalogo[tipo].toLocaleLowerCase("es-MX")} por nombre o clave...`} className="w-full rounded-full border border-white/60 bg-white/70 py-3 pl-12 pr-5 outline-none focus:ring-2 focus:ring-purple-400/50" /></label>}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{registros.map((registro) => <article key={registro.id} className="group grid min-h-24 grid-cols-[2.5rem_minmax(0,1fr)_5.5rem] items-center gap-3 rounded-2xl border-2 border-white/60 bg-white/50 p-4 transition-[border-color,background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)] hover:bg-white/70 hover:shadow-[0_12px_30px_rgba(109,59,215,0.12)] focus-within:border-[var(--primary)] focus-within:bg-white/70"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-purple-100 font-mono text-sm font-semibold text-[var(--primary)] transition-colors group-hover:bg-[var(--primary)] group-hover:text-white" title={`Posición por ID: ${datosIniciales[tipo].findIndex((item) => item.id === registro.id) + 1}`}>{datosIniciales[tipo].findIndex((item) => item.id === registro.id) + 1}</span><div className="min-w-0 text-center"><strong className="block text-lg font-bold leading-tight text-[var(--on-surface)] sm:text-xl">{registro.nombre}</strong><span className="mt-1 block font-mono text-xs font-medium text-[var(--on-surface-variant)]">{registro.clave}</span></div><div className="flex shrink-0 justify-end gap-2"><Link href={`/catalogos/${ruta}/${registro.id}/editar`} aria-label={`Editar ${registro.nombre}`} title="Editar" className="grid size-10 place-items-center rounded-full bg-purple-100 text-xl text-[var(--primary)] hover:bg-purple-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"><i className="bx bx-edit-alt" /></Link><button type="button" onClick={() => { setAEliminar({ tipo, registro }); setError(""); }} aria-label={`Eliminar ${registro.nombre}`} title="Eliminar" className="grid size-10 place-items-center rounded-full bg-red-100 text-xl text-[var(--error)] hover:bg-red-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--error)]"><i className="bx bx-trash" /></button></div></article>)}</div>
        {!registros.length && <p role="status" className="rounded-2xl bg-white/45 p-6 text-center text-[var(--on-surface-variant)]">No se encontraron coincidencias.</p>}
      </section>;
    })}</div>
    {aEliminar && <div className="fixed inset-0 z-[100] grid place-items-center bg-[var(--on-surface)]/30 p-4 backdrop-blur-md" onMouseDown={(evento) => { if (evento.target === evento.currentTarget && !eliminando) setAEliminar(null); }}><section role="alertdialog" aria-modal="true" aria-labelledby="titulo-eliminar-catalogo" className="w-full max-w-lg rounded-[2.5rem] border border-white/60 bg-[var(--surface)] p-7 shadow-2xl"><h2 id="titulo-eliminar-catalogo" className="text-2xl font-bold">Eliminar {etiquetasCatalogo[aEliminar.tipo].toLocaleLowerCase("es-MX")}</h2><p className="mt-3 text-[var(--on-surface-variant)]">¿Confirmas que deseas eliminar <strong>{aEliminar.registro.nombre}</strong>?</p>{error && <p role="alert" className="mt-4 rounded-2xl bg-red-100 p-4 text-[var(--error)]">{error}</p>}<div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" disabled={eliminando} onClick={() => setAEliminar(null)} className="rounded-full border border-[var(--outline-variant)] px-5 py-3 font-semibold">Cancelar</button><button type="button" disabled={eliminando} onClick={confirmarEliminacion} className="rounded-full bg-[var(--error)] px-5 py-3 font-semibold text-white disabled:opacity-60">{eliminando ? "Eliminando..." : "Sí, eliminar"}</button></div></section></div>}
  </>;
}
