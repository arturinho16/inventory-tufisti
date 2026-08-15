"use client";

import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useRef, useState } from "react";

interface OpcionFiltro {
  valor: string;
  etiqueta: string;
}

export function FormularioFiltros({ children, className }: { children: ReactNode; className: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const parametros = new URLSearchParams();
    new FormData(evento.currentTarget).forEach((valor, clave) => {
      if (typeof valor === "string" && valor.trim()) parametros.append(clave, valor);
    });
    const consulta = parametros.toString();
    router.replace(consulta ? `${pathname}?${consulta}` : pathname, { scroll: false });
  };
  return <form className={`relative z-40 ${className}`} onSubmit={enviar}>{children}</form>;
}

export function GrupoChecks({
  nombre,
  etiqueta,
  opciones,
  seleccionados,
  buscable = false,
  exclusivo = false,
}: {
  nombre: string;
  etiqueta: string;
  opciones: OpcionFiltro[];
  seleccionados: string[];
  buscable?: boolean;
  exclusivo?: boolean;
}) {
  const [busqueda, setBusqueda] = useState("");
  const normalizar = (valor: string) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-MX");
  const visibles = busqueda.trim() ? opciones.filter((opcion) => normalizar(opcion.etiqueta).includes(normalizar(busqueda.trim()))) : opciones;
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-full border border-white/60 bg-white/55 px-4 py-3 font-medium outline-none focus-visible:ring-2 focus-visible:ring-purple-400/50">
        <span>{etiqueta}{seleccionados.length ? ` (${seleccionados.length})` : ""}</span>
        <i className="bx bx-chevron-down text-xl transition-transform group-open:rotate-180" />
      </summary>
      <fieldset className="absolute left-0 top-[calc(100%+0.5rem)] z-30 max-h-72 min-w-full overflow-y-auto rounded-3xl border border-white/70 bg-[var(--surface)]/95 p-3 shadow-xl backdrop-blur-xl">
        <legend className="sr-only">{etiqueta}</legend>
        {buscable && <label className="relative mb-2 block"><span className="sr-only">Buscar en {etiqueta.toLocaleLowerCase("es-MX")}</span><i className="bx bx-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--outline)]" /><input type="search" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} onKeyDown={(evento) => { if (evento.key === "Enter") evento.preventDefault(); }} placeholder="Escribe el tamaño..." className="w-full min-w-52 rounded-full border border-white/70 bg-white/70 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-purple-400/50" /></label>}
        {visibles.length ? visibles.map((opcion) => (
          <label key={opcion.valor} className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 hover:bg-white/70">
            <input
              type="checkbox"
              name={nombre}
              value={opcion.valor}
              defaultChecked={seleccionados.includes(opcion.valor)}
              className="size-4 accent-[var(--primary)]"
              onChange={(evento) => {
                const formulario = evento.currentTarget.form;
                if (exclusivo && evento.currentTarget.checked) {
                  formulario?.querySelectorAll<HTMLInputElement>(`input[name="${nombre}"]`).forEach((casilla) => {
                    if (casilla !== evento.currentTarget) casilla.checked = false;
                  });
                }
                evento.currentTarget.closest("details")?.removeAttribute("open");
                formulario?.requestSubmit();
              }}
            />
            <span className="whitespace-nowrap text-sm">{opcion.etiqueta}</span>
          </label>
        )) : <p className="px-3 py-2 text-sm text-[var(--on-surface-variant)]">Sin coincidencias</p>}
      </fieldset>
    </details>
  );
}

export function BusquedaEnVivo({ nombre = "buscar", valor, placeholder }: { nombre?: string; valor: string; placeholder: string }) {
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  return <input
    name={nombre}
    defaultValue={valor}
    placeholder={placeholder}
    autoComplete="off"
    onChange={(evento) => {
      if (temporizador.current) clearTimeout(temporizador.current);
      const formulario = evento.currentTarget.form;
      temporizador.current = setTimeout(() => formulario?.requestSubmit(), 250);
    }}
    className="w-full rounded-full border border-white/60 bg-white/55 py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-purple-400/50"
  />;
}

export function BotonLimpiarFiltros({ total }: { total: number }) {
  if (total < 2) return null;
  return <button type="button" onClick={(evento) => {
    const formulario = evento.currentTarget.form;
    formulario?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked').forEach((casilla) => { casilla.checked = false; });
    formulario?.requestSubmit();
  }} className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--outline-variant)] bg-white/60 px-5 py-3 font-semibold text-[var(--on-surface-variant)] hover:bg-white"><i className="bx bx-filter-alt" />Borrar filtros</button>;
}

export function FiltroUltimasAgregadas({ activo }: { activo: boolean }) {
  return <label className="flex cursor-pointer items-center justify-center gap-3 rounded-full border border-white/60 bg-white/55 px-4 py-3 font-medium">
    <input type="checkbox" name="recientes" value="1" defaultChecked={activo} onChange={(evento) => evento.currentTarget.form?.requestSubmit()} className="size-4 accent-[var(--primary)]" />
    <span className="whitespace-nowrap">U.Agregadas</span>
  </label>;
}

export function FiltrosInventario({
  busqueda,
  lineas,
  marcas,
  modelos,
  tipos,
  tamanos,
  recientes,
  opcionesLineas,
  opcionesMarcas,
  opcionesModelos,
  opcionesTipos,
  opcionesTamanos,
}: {
  busqueda: string;
  lineas: string[];
  marcas: string[];
  modelos: string[];
  tipos: string[];
  tamanos: string[];
  recientes: boolean;
  opcionesLineas: string[];
  opcionesMarcas: string[];
  opcionesModelos: string[];
  opcionesTipos: string[];
  opcionesTamanos: string[];
}) {
  const comoOpciones = (valores: string[]) => valores.map((valor) => ({ valor, etiqueta: valor }));

  return (
    <FormularioFiltros className="grid gap-3 border-b border-white/60 p-4 sm:grid-cols-2 xl:grid-cols-4 xl:p-6 2xl:grid-cols-[minmax(11rem,0.8fr)_repeat(6,minmax(7.25rem,0.55fr))_auto]">
      <label className="relative">
        <span className="sr-only">Buscar productos</span>
        <i className="bx bx-search absolute left-4 top-1/2 -translate-y-1/2 text-xl text-[var(--outline)]" />
        <BusquedaEnVivo valor={busqueda} placeholder="Buscar por clave, modelo o código..." />
      </label>
      <GrupoChecks nombre="linea" etiqueta="Líneas" opciones={comoOpciones(opcionesLineas)} seleccionados={lineas} />
      <GrupoChecks nombre="marca" etiqueta="Marcas" opciones={comoOpciones(opcionesMarcas)} seleccionados={marcas} />
      <GrupoChecks nombre="modelo" etiqueta="Modelos" opciones={comoOpciones(opcionesModelos)} seleccionados={modelos} />
      <GrupoChecks nombre="tipo" etiqueta="Tipos" opciones={comoOpciones(opcionesTipos)} seleccionados={tipos} />
      <GrupoChecks nombre="tamano" etiqueta="T/Pantalla" opciones={opcionesTamanos.map((valor) => ({ valor, etiqueta: `${valor} pulgadas` }))} seleccionados={tamanos} buscable />
      <FiltroUltimasAgregadas activo={recientes} />
      <BotonLimpiarFiltros total={lineas.length + marcas.length + modelos.length + tipos.length + tamanos.length + Number(recientes)} />
    </FormularioFiltros>
  );
}
