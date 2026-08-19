"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function GestorConexionMercadoLibre({ cuentaId }: { cuentaId?: string }) {
  const [clave, setClave] = useState(""); const [mensaje, setMensaje] = useState(""); const [ocupado, setOcupado] = useState(false); const router = useRouter();
  async function conectar() {
    setOcupado(true); setMensaje("");
    try { const respuesta = await fetch("/api/mercadolibre/autorizar", { method: "POST", headers: { "x-clave-administrativa": clave } }); const datos = await respuesta.json() as { url?: string; error?: string }; if (!respuesta.ok || !datos.url) throw new Error(datos.error ?? "No fue posible conectar."); window.location.assign(datos.url); }
    catch (error) { setMensaje(error instanceof Error ? error.message : "No fue posible conectar."); setOcupado(false); }
  }
  async function desconectar() {
    if (!cuentaId || !window.confirm("¿Desconectar la cuenta? Los tokens guardados se eliminarán del sistema.")) return; setOcupado(true); setMensaje("");
    try { const respuesta = await fetch("/api/mercadolibre/desconectar", { method: "POST", headers: { "content-type": "application/json", "x-clave-administrativa": clave }, body: JSON.stringify({ id: cuentaId }) }); const datos = await respuesta.json() as { error?: string }; if (!respuesta.ok) throw new Error(datos.error ?? "No fue posible desconectar."); router.refresh(); setMensaje("Cuenta desconectada correctamente."); }
    catch (error) { setMensaje(error instanceof Error ? error.message : "No fue posible desconectar."); } finally { setOcupado(false); }
  }
  return <div className="mt-6 space-y-4"><label className="block max-w-xl text-sm font-semibold">Clave administrativa<input type="password" autoComplete="current-password" value={clave} onChange={evento => setClave(evento.target.value)} className="mt-2 w-full rounded-full border border-white/70 bg-white/70 px-5 py-3 outline-none focus:ring-2 focus:ring-purple-400/50" placeholder="La misma clave usada para administrar respaldos" /></label><div className="flex flex-wrap gap-3"><button type="button" disabled={ocupado || !clave} onClick={conectar} className="rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] px-6 py-3 font-bold text-white shadow-lg disabled:opacity-45"><i className="bx bx-link-alt mr-2" />{cuentaId ? "Volver a conectar" : "Conectar Mercado Libre"}</button>{cuentaId && <button type="button" disabled={ocupado || !clave} onClick={desconectar} className="rounded-full bg-red-100 px-6 py-3 font-bold text-[var(--error)] disabled:opacity-45"><i className="bx bx-unlink mr-2" />Desconectar</button>}</div>{mensaje && <p role="status" className="text-sm font-semibold text-[var(--error)]">{mensaje}</p>}</div>;
}
