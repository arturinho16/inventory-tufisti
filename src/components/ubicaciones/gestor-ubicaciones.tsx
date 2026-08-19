"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { guardarUbicacion } from "@/actions/ubicaciones";
import { ImagenProducto } from "@/components/productos/imagen-producto";
import { MARKETPLACES } from "@/lib/marketplaces";

type UbicacionInicial = { id: string; almacen: string; cuentaAsociada: string; marketplace: string; imagenUrl: string | null; actualizadoEn: number };
const vacia = { almacen: "", cuentaAsociada: "", marketplace: "", imagenUrl: "" };

export function GestorUbicaciones({ ubicacionInicial }: { ubicacionInicial: UbicacionInicial | null }) {
  const archivo = useRef<HTMLInputElement>(null);
  const temporal = useRef<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const [mensaje, setMensaje] = useState("");
  const [arrastrando, setArrastrando] = useState(false);
  const [archivoImagen, setArchivoImagen] = useState<File>();
  const [datos, setDatos] = useState(ubicacionInicial ? { almacen: ubicacionInicial.almacen, cuentaAsociada: ubicacionInicial.cuentaAsociada, marketplace: ubicacionInicial.marketplace, imagenUrl: ubicacionInicial.imagenUrl ?? "" } : vacia);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(ubicacionInicial?.imagenUrl ? `${ubicacionInicial.imagenUrl}?v=${ubicacionInicial.actualizadoEn}` : null);

  useEffect(() => () => { if (temporal.current) URL.revokeObjectURL(temporal.current); }, []);

  const seleccionarImagen = (entrada?: File) => {
    if (!entrada || !entrada.type.startsWith("image/")) return;
    if (temporal.current) URL.revokeObjectURL(temporal.current);
    temporal.current = URL.createObjectURL(entrada);
    setArchivoImagen(entrada); setVistaPrevia(temporal.current);
    setDatos(actual => ({ ...actual, imagenUrl: "" }));
  };
  const quitarImagen = () => {
    if (temporal.current) URL.revokeObjectURL(temporal.current);
    temporal.current = null; setArchivoImagen(undefined); setVistaPrevia(null);
    setDatos(actual => ({ ...actual, imagenUrl: "" }));
    if (archivo.current) archivo.current.value = "";
  };
  const guardar = (formData: FormData) => iniciar(async () => {
    try {
      setMensaje("");
      if (archivoImagen) formData.set("imagen", archivoImagen);
      await guardarUbicacion(formData, ubicacionInicial?.id);
      if (ubicacionInicial) window.location.assign("/ubicaciones/registradas");
      else { setDatos(vacia); quitarImagen(); setMensaje("Ubicación guardada correctamente."); }
    } catch (error) { setMensaje(error instanceof Error ? error.message : "No fue posible guardar."); }
  });
  const campo = "w-full rounded-2xl border border-white/60 bg-white/60 px-4 py-3 outline-none focus:ring-2 focus:ring-purple-400/50";

  return <form action={guardar} className="mx-auto max-w-5xl rounded-[2.5rem] border border-white/60 bg-white/40 p-5 backdrop-blur-xl sm:p-8">
    <div><h2 className="text-xl font-semibold">{ubicacionInicial ? "Editar ubicación" : "Nueva ubicación"}</h2><p className="mt-1 text-sm text-[var(--on-surface-variant)]">Registra una cuenta y el lugar donde opera.</p></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-semibold">Almacén / Ubicación<input required name="almacen" value={datos.almacen} onChange={evento => setDatos(actual => ({ ...actual, almacen: evento.target.value }))} placeholder="Ej. Bodega principal" className={`mt-2 ${campo}`} /></label>
      <label className="block text-sm font-semibold">Cuenta asociada<input required name="cuentaAsociada" value={datos.cuentaAsociada} onChange={evento => setDatos(actual => ({ ...actual, cuentaAsociada: evento.target.value }))} placeholder="Ej. Cuenta México" className={`mt-2 ${campo}`} /></label>
      <label className="block text-sm font-semibold sm:col-span-2">Marketplace<select required name="marketplace" value={datos.marketplace} onChange={evento => setDatos(actual => ({ ...actual, marketplace: evento.target.value }))} className={`mt-2 ${campo}`}><option value="" disabled>Seleccionar marketplace…</option>{Object.entries(MARKETPLACES).map(([valor, marketplace]) => <option key={valor} value={valor}>{marketplace.abreviatura} · {marketplace.nombre}</option>)}</select></label>
    </div>
    <section className="mx-auto mt-6 max-w-2xl rounded-[2rem] border border-white/60 bg-white/35 p-5">
      <h3 className="text-center font-semibold">Imagen o logo</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center">
        <button type="button" onClick={() => archivo.current?.click()} onDragEnter={evento => { evento.preventDefault(); setArrastrando(true); }} onDragOver={evento => { evento.preventDefault(); setArrastrando(true); }} onDragLeave={() => setArrastrando(false)} onDrop={evento => { evento.preventDefault(); setArrastrando(false); seleccionarImagen(evento.dataTransfer.files?.[0]); }} className={`relative mx-auto grid size-36 place-items-center overflow-hidden rounded-[1.5rem] border-2 border-dashed bg-white/45 transition ${arrastrando ? "border-[var(--primary)] bg-purple-50" : "border-[var(--outline-variant)]"}`} aria-label="Seleccionar o soltar imagen">
          {vistaPrevia ? <ImagenProducto url={vistaPrevia} descripcion={datos.almacen || "ubicación"} sizes="144px" icono="bx-store" /> : <div className="text-center text-[var(--on-surface-variant)]"><i className="bx bx-image-add text-4xl" /><p className="mt-1 text-xs">Arrastra o selecciona</p></div>}
        </button>
        <div className="min-w-0">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-3 text-sm font-semibold"><i className="bx bx-upload" />Cargar imagen<input ref={archivo} name="imagen" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className="sr-only" onChange={evento => seleccionarImagen(evento.target.files?.[0])} /></label>
          {vistaPrevia && <button type="button" onClick={quitarImagen} className="mt-1 w-full rounded-full px-4 py-2 text-sm text-[var(--error)] hover:bg-red-50">Quitar imagen</button>}
          <div className="my-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-[var(--on-surface-variant)]"><span className="h-px flex-1 bg-[var(--outline-variant)]" />o enlace<span className="h-px flex-1 bg-[var(--outline-variant)]" /></div>
          <input name="imagenUrl" type="url" value={datos.imagenUrl} onChange={evento => { if (temporal.current) URL.revokeObjectURL(temporal.current); temporal.current = null; setArchivoImagen(undefined); setDatos(actual => ({ ...actual, imagenUrl: evento.target.value })); setVistaPrevia(evento.target.value || null); if (archivo.current) archivo.current.value = ""; }} placeholder="https://ejemplo.com/logo.webp" className={`${campo} py-2.5 text-sm`} />
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-[var(--on-surface-variant)]">Arrastra y suelta o selecciona JPG, PNG o WebP · máximo 5 MB.</p>
    </section>
    <div className="mx-auto mt-6 max-w-2xl"><button disabled={pendiente} className="w-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] px-5 py-3 font-bold text-white disabled:opacity-60">{pendiente ? "Guardando…" : ubicacionInicial ? "Guardar cambios" : "Agregar ubicación"}</button>{mensaje && <p role="status" className="mt-3 rounded-2xl bg-white/60 p-3 text-center text-sm">{mensaje}</p>}</div>
  </form>;
}
