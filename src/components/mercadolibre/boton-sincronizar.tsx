"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sincronizarProductosMercadoLibre } from "@/actions/mercadolibre";

export function BotonSincronizarMercadoLibre() {
  const [pendiente, iniciar] = useTransition(); const [mensaje, setMensaje] = useState(""); const router = useRouter();
  return <div className="flex flex-col items-end gap-2"><button type="button" disabled={pendiente} onClick={() => iniciar(async () => { try { setMensaje(""); const r = await sincronizarProductosMercadoLibre(); setMensaje(`${r.procesados} productos actualizados.`); router.refresh(); } catch (error) { setMensaje(error instanceof Error ? error.message : "No fue posible sincronizar."); } })} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] px-6 py-3 font-semibold text-white shadow-lg disabled:opacity-50"><i className={`bx bx-refresh ${pendiente ? "animate-spin" : ""}`} />{pendiente ? "Consultando Mercado Libre…" : "Actualizar productos"}</button>{mensaje && <p role="status" className="text-sm font-semibold text-[var(--on-surface-variant)]">{mensaje}</p>}</div>;
}

