"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { eliminarUbicacion } from "@/actions/ubicaciones";
import { ImagenProducto } from "@/components/productos/imagen-producto";
import { datosMarketplace } from "@/lib/marketplaces";

type Ubicacion = { id: string; almacen: string; cuentaAsociada: string; marketplace: string; imagenUrl: string | null; actualizadoEn: number; productos: number };

export function ListadoUbicaciones({ ubicaciones }: { ubicaciones: Ubicacion[] }) {
  const [pendiente, iniciar] = useTransition(); const [mensaje, setMensaje] = useState("");
  const eliminar = (id: string) => iniciar(async () => { try { setMensaje(""); await eliminarUbicacion(id); } catch (error) { setMensaje(error instanceof Error ? error.message : "No fue posible eliminar."); } });
  return <>{mensaje && <p role="status" className="mb-4 rounded-2xl bg-white/60 p-3 text-sm">{mensaje}</p>}<div className="grid auto-rows-[11rem] gap-4 sm:grid-cols-2 xl:grid-cols-3">{ubicaciones.map(ubicacion => <article key={ubicacion.id} className="flex h-44 min-w-0 flex-col rounded-[2rem] border border-white/60 bg-white/40 p-4 backdrop-blur-xl"><div className="flex min-w-0 gap-3"><div className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/70 text-2xl text-[var(--primary)]"><ImagenProducto url={ubicacion.imagenUrl ? `${ubicacion.imagenUrl}?v=${ubicacion.actualizadoEn}` : null} descripcion={ubicacion.almacen} sizes="64px" icono="bx-store" /></div><div className="min-w-0 flex-1"><h2 className="line-clamp-2 min-h-10 font-semibold leading-5">{ubicacion.almacen}</h2><p className="truncate text-sm text-[var(--on-surface-variant)]">{ubicacion.cuentaAsociada}</p><span className="mt-2 inline-flex rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-[var(--primary)]"><strong>{datosMarketplace(ubicacion.marketplace).abreviatura}</strong><span className="ml-1.5">· {datosMarketplace(ubicacion.marketplace).nombre}</span></span></div></div><div className="mt-auto flex items-center justify-between"><span className="text-xs text-[var(--on-surface-variant)]">{ubicacion.productos} productos</span><div className="flex gap-2"><Link href={`/ubicaciones?editar=${ubicacion.id}`} aria-label={`Editar ${ubicacion.almacen}`} className="grid size-9 place-items-center rounded-full bg-purple-100 text-[var(--primary)]"><i className="bx bx-edit-alt" /></Link><button type="button" disabled={pendiente || ubicacion.productos > 0} onClick={() => eliminar(ubicacion.id)} aria-label={`Eliminar ${ubicacion.almacen}`} className="grid size-9 place-items-center rounded-full bg-red-100 text-[var(--error)] disabled:opacity-35"><i className="bx bx-trash" /></button></div></div></article>)}</div></>;
}
