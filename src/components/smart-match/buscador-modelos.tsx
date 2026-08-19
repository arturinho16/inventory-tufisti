"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";

interface Sugerencia { modelo: string; marca: string; }

export function BuscadorModelos({ inicial }: { inicial: string }) {
  const router = useRouter();
  const listaId = useId();
  const [valor, setValor] = useState(inicial);
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(-1);
  const [cargando, setCargando] = useState(false);
  const primeraCarga = useRef(true);

  useEffect(() => {
    if (primeraCarga.current) { primeraCarga.current = false; return; }
    const consulta = valor.trim();
    if (!consulta) return;
    const controlador = new AbortController();
    const temporizador = window.setTimeout(async () => {
      setCargando(true);
      try {
        const respuesta = await fetch(`/api/smart-match/modelos?q=${encodeURIComponent(consulta)}`, { signal: controlador.signal });
        if (!respuesta.ok) throw new Error();
        const datos = await respuesta.json() as { sugerencias: Sugerencia[] };
        setSugerencias(datos.sugerencias);
        setActivo(-1);
        setAbierto(true);
      } catch { if (!controlador.signal.aborted) { setSugerencias([]); setAbierto(true); } }
      finally { if (!controlador.signal.aborted) setCargando(false); }
    }, 220);
    return () => { window.clearTimeout(temporizador); controlador.abort(); };
  }, [valor]);

  const buscar = (modelo = valor) => {
    const limpio = modelo.trim();
    if (!limpio) return;
    setAbierto(false);
    router.push(`/paralelo/buscar?modelo=${encodeURIComponent(limpio)}`);
  };
  const enviar = (evento: FormEvent) => { evento.preventDefault(); buscar(activo >= 0 ? sugerencias[activo]?.modelo : valor); };

  return <form onSubmit={enviar} className="relative z-20 mb-8 flex flex-col gap-3 rounded-[2.5rem] border border-white/60 bg-white/40 p-5 backdrop-blur-xl sm:flex-row">
    <div className="relative flex-1" onBlur={(evento) => { if (!evento.currentTarget.contains(evento.relatedTarget)) setAbierto(false); }}>
      <label className="relative block"><span className="sr-only">Modelo de referencia</span><i className="bx bx-search pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-xl text-[var(--primary)]" /><input required value={valor} onFocus={() => valor.trim() && setAbierto(true)} onChange={(evento) => { const siguiente = evento.target.value; setValor(siguiente); if (!siguiente.trim()) { setSugerencias([]); setAbierto(false); setCargando(false); } }} onKeyDown={(evento) => {
        if (evento.key === "ArrowDown") { evento.preventDefault(); setAbierto(true); setActivo((actual) => Math.min(actual + 1, sugerencias.length - 1)); }
        if (evento.key === "ArrowUp") { evento.preventDefault(); setActivo((actual) => Math.max(actual - 1, -1)); }
        if (evento.key === "Escape") { setAbierto(false); setActivo(-1); }
      }} role="combobox" aria-autocomplete="list" aria-expanded={abierto} aria-controls={listaId} aria-activedescendant={activo >= 0 ? `${listaId}-${activo}` : undefined} autoComplete="off" placeholder="Ej. Oppo Reno 14" className="w-full rounded-full border border-white/60 bg-white/70 py-4 pl-12 pr-12 outline-none focus:ring-2 focus:ring-purple-400/50" />{cargando && <i className="bx bx-loader-alt absolute right-5 top-1/2 -translate-y-1/2 animate-spin text-xl text-[var(--primary)]" />}</label>
      {abierto && <ul id={listaId} role="listbox" aria-label="Modelos sugeridos" className="absolute inset-x-0 top-[calc(100%+0.5rem)] max-h-80 overflow-y-auto rounded-[1.75rem] border border-white/70 bg-[var(--surface)]/95 p-2 shadow-2xl backdrop-blur-xl">{sugerencias.length ? sugerencias.map((sugerencia, indice) => <li key={`${sugerencia.marca}-${sugerencia.modelo}`} id={`${listaId}-${indice}`} role="option" aria-selected={activo === indice}><button type="button" onMouseDown={(evento) => evento.preventDefault()} onClick={() => { setValor(sugerencia.modelo); buscar(sugerencia.modelo); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left ${activo === indice ? "bg-purple-100" : "hover:bg-white/70"}`}><i className="bx bx-mobile-alt text-xl text-[var(--primary)]" /><span><strong className="block">{sugerencia.modelo}</strong><small className="text-[var(--on-surface-variant)]">{sugerencia.marca}</small></span></button></li>) : <li className="px-4 py-3 text-sm text-[var(--on-surface-variant)]">{cargando ? "Buscando modelos..." : "No hay modelos coincidentes"}</li>}</ul>}
    </div>
    <button className="rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] px-7 py-4 font-bold text-white">Comparar cristales</button>
  </form>;
}
