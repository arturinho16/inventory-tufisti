"use client";

import Link from "next/link";
import { useState } from "react";
import { actualizarCatalogo, crearCatalogo } from "@/actions/catalogos";
import { etiquetasCatalogo, rutasCatalogo, type RegistroCatalogo, type TipoCatalogo } from "@/lib/catalogos/datos-catalogos";

export function FormularioCatalogo({ tipo, registro }: { tipo: TipoCatalogo; registro?: RegistroCatalogo }) {
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");
  const etiqueta = etiquetasCatalogo[tipo].toLocaleLowerCase("es-MX");
  const volver = `/catalogos#${rutasCatalogo[tipo]}`;
  const enviar = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault(); setGuardando(true); setError(""); setMensajeExito("");
    const formulario = new FormData(evento.currentTarget);
    const datos = { clave: String(formulario.get("clave") ?? "").trim().toUpperCase(), nombre: String(formulario.get("nombre") ?? "").trim() };
    try {
      if (registro) {
        await actualizarCatalogo(tipo, registro.id, datos);
        setMensajeExito(`${etiquetasCatalogo[tipo]} actualizado correctamente`);
      } else {
        const resultado = await crearCatalogo(tipo, datos);
        if (!resultado.guardado) throw new Error("No fue posible comprobar el catálogo guardado.");
        setMensajeExito(`${etiquetasCatalogo[tipo]} creado correctamente`);
      }
      window.setTimeout(() => window.location.assign(volver), 1200);
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No fue posible guardar el registro.");
      setGuardando(false);
    }
  };
  return <form onSubmit={enviar} className="rounded-[2.5rem] border border-white/60 bg-white/40 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl sm:p-9">
    <h2 className="mb-2 text-2xl font-semibold">{registro ? "Editar" : "Crear"} {etiqueta}</h2><p className="mb-7 text-[var(--on-surface-variant)]">La información quedará disponible en los formularios de productos.</p>
    {error && <p role="alert" className="mb-5 rounded-2xl bg-red-100 p-4 text-[var(--error)]">{error}</p>}
    {mensajeExito && <p role="status" className="mb-5 rounded-2xl bg-emerald-100 p-4 font-semibold text-emerald-800"><i className="bx bx-check-circle mr-2" />{mensajeExito}</p>}
    <div className="grid gap-5 sm:grid-cols-2"><label><span className="mb-2 block font-mono text-xs uppercase tracking-wider text-[var(--on-surface-variant)]">Clave</span><input autoFocus required name="clave" defaultValue={registro?.clave} placeholder={tipo === "linea" ? "Ej. L-016" : tipo === "marca" ? "Ej. M-030" : "Ej. ACCESORIO"} className="w-full rounded-2xl border border-white/60 bg-white/70 px-5 py-4 uppercase outline-none focus:ring-2 focus:ring-purple-400/50" /></label><label><span className="mb-2 block font-mono text-xs uppercase tracking-wider text-[var(--on-surface-variant)]">Nombre</span><input required name="nombre" defaultValue={registro?.nombre} placeholder={`Nombre de ${etiqueta}`} className="w-full rounded-2xl border border-white/60 bg-white/70 px-5 py-4 outline-none focus:ring-2 focus:ring-purple-400/50" /></label></div>
    <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Link href={volver} className="rounded-full border border-[var(--outline-variant)] bg-white/60 px-6 py-3 text-center font-semibold">Cancelar</Link><button disabled={guardando} className="rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] px-6 py-3 font-semibold text-white disabled:opacity-60">{guardando ? "Guardando..." : "Guardar"}</button></div>
  </form>;
}
