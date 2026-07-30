"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { guardarProducto } from "@/actions/productos";

const esquemaProducto = z.object({
  clave: z.string().trim().min(2, "La clave debe tener al menos 2 caracteres"),
  descripcion: z.string().trim().min(3, "Escribe una descripción"),
  linea: z.string().min(1, "Selecciona una línea"),
  existencia: z.number().int().min(0, "La existencia no puede ser negativa"),
  modelo: z.string().trim().min(1, "Escribe el modelo"),
  marca: z.string().min(1, "Selecciona una marca"),
  color: z.string(),
  claveMLFull: z.string(),
  codigoUniversal: z.string(),
  tipoProducto: z.string().min(1, "Selecciona un tipo de producto"),
  imagenUrl: z.union([z.literal(""), z.string().url("Escribe un enlace de imagen válido")]),
});
type DatosProducto = z.infer<typeof esquemaProducto>;

interface OpcionCatalogo { id: string; clave: string; nombre: string; categoria?: "TELEFONO" | "CRISTAL_TEMPLADO" | "OTRO"; }

export function FormularioProducto({ datosIniciales, modo = "crear", productoId, lineas, marcas, tiposProducto }: { datosIniciales?: Partial<DatosProducto>; modo?: "crear" | "editar"; productoId?: string; lineas: OpcionCatalogo[]; marcas: OpcionCatalogo[]; tiposProducto: OpcionCatalogo[] }) {
  const [imagen, setImagen] = useState<string>();
  const [archivoImagen, setArchivoImagen] = useState<File>();
  const imagenTemporal = useRef<string | undefined>(undefined);
  const [nombreImagen, setNombreImagen] = useState("");
  const [errorServidor, setErrorServidor] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting }, control } = useForm<DatosProducto>({
    resolver: zodResolver(esquemaProducto),
    defaultValues: { existencia: 0, color: "", claveMLFull: "", codigoUniversal: "", imagenUrl: "", tipoProducto: tiposProducto.find((tipo) => tipo.clave === "OTRO")?.id ?? "", ...datosIniciales },
  });
  const tipo = useWatch({ control, name: "tipoProducto" });
  const imagenPorUrl = useWatch({ control, name: "imagenUrl" });
  const campo = "w-full rounded-2xl border border-white/60 bg-white/55 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-purple-400/50";

  useEffect(() => () => { if (imagenTemporal.current) URL.revokeObjectURL(imagenTemporal.current); }, []);
  const seleccionarImagen = (archivo?: File) => {
    if (!archivo) return;
    if (imagenTemporal.current) URL.revokeObjectURL(imagenTemporal.current);
    imagenTemporal.current = URL.createObjectURL(archivo);
    setArchivoImagen(archivo); setImagen(imagenTemporal.current); setNombreImagen(archivo.name);
  };
  const quitarImagen = () => { if (imagenTemporal.current) URL.revokeObjectURL(imagenTemporal.current); imagenTemporal.current = undefined; setArchivoImagen(undefined); setImagen(undefined); setNombreImagen(""); };
  const enviar = async (datos: DatosProducto) => {
    setErrorServidor("");
    setMensajeExito("");
    try {
      const imagen = new FormData();
      if (archivoImagen) imagen.set("archivo", archivoImagen);
      const producto = await guardarProducto({ clave: datos.clave, descripcion: datos.descripcion, lineaId: datos.linea, existencia: datos.existencia, modelo: datos.modelo, marcaId: datos.marca, color: datos.color, claveMLFull: datos.claveMLFull, codigoUniversal: datos.codigoUniversal, tipoProductoId: datos.tipoProducto, imagenUrl: datos.imagenUrl }, imagen, productoId);
      if (!producto.guardado) throw new Error("No fue posible comprobar el producto guardado.");
      const categoriaTipo = tiposProducto.find((opcion) => opcion.id === datos.tipoProducto)?.categoria;
      const requierePantalla = !productoId && (categoriaTipo === "TELEFONO" || categoriaTipo === "CRISTAL_TEMPLADO");
      setMensajeExito(productoId ? "Producto actualizado correctamente" : "Producto guardado correctamente");
      window.setTimeout(() => window.location.assign(requierePantalla ? `/paralelo/nuevo?productoId=${producto.id}` : "/inventario"), 1200);
    } catch (causa) {
      setErrorServidor(causa instanceof Error ? causa.message : "No fue posible guardar el producto.");
    }
  };
  return (
      <form onSubmit={handleSubmit(enviar)} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-[2.5rem] border border-white/60 bg-white/40 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl sm:p-8">
          <h2 className="mb-2 flex items-center gap-3 text-2xl font-semibold"><i className="bx bx-info-circle text-[var(--primary)]" />Información del producto</h2>
          <p className="mb-7 text-sm text-[var(--on-surface-variant)]">Los campos aparecen en el mismo orden utilizado por el inventario.</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <Campo numero="1" etiqueta="Clave" error={errors.clave?.message}><input {...register("clave")} placeholder="Ej. CR-S23U-01" className={campo} /></Campo>
            <Campo numero="2" etiqueta="Descripción" error={errors.descripcion?.message}><input {...register("descripcion")} placeholder="Ej. Cristal templado Galaxy S23 Ultra" className={campo} /></Campo>
            <Campo numero="3" etiqueta="Línea" error={errors.linea?.message}><SelectorCatalogo registro={register("linea")} opciones={lineas} texto="Seleccionar línea..." clase={campo} /></Campo>
            <Campo numero="4" etiqueta="Existencias" error={errors.existencia?.message}><input type="number" min="0" {...register("existencia", { valueAsNumber: true })} className={campo} /></Campo>
            <Campo numero="5" etiqueta="Modelo" error={errors.modelo?.message}><input {...register("modelo")} placeholder="Ej. Galaxy S23 Ultra" className={campo} /></Campo>
            <Campo numero="6" etiqueta="Marca" error={errors.marca?.message}><SelectorCatalogo registro={register("marca")} opciones={marcas} texto="Seleccionar marca..." clase={campo} /></Campo>
            <Campo numero="7" etiqueta="Color"><input {...register("color")} placeholder="Ej. Transparente" className={campo} /></Campo>
            <Campo numero="8" etiqueta="Clave ML-Full"><input {...register("claveMLFull")} placeholder="Ej. MLM000000" className={campo} /></Campo>
            <Campo numero="9" etiqueta="Código universal" clase="sm:col-span-2"><input {...register("codigoUniversal")} placeholder="UPC o EAN" className={campo} /></Campo>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[2.5rem] border border-white/60 bg-white/40 p-6 backdrop-blur-xl">
            <h2 className="mb-4 text-xl font-semibold">Tipo de producto</h2>
            <p className="mb-4 text-sm text-[var(--on-surface-variant)]">Define si participa como teléfono o cristal en Smart Match; no sustituye a la línea.</p>
            <SelectorCatalogo registro={register("tipoProducto")} opciones={tiposProducto} texto="Seleccionar tipo..." clase={campo} />
            {errors.tipoProducto?.message && <span className="mt-1 block text-sm text-[var(--error)]">{errors.tipoProducto.message}</span>}
          </section>
          <section className="rounded-[2.5rem] border border-white/60 bg-white/40 p-6 backdrop-blur-xl">
            <h2 className="mb-5 text-xl font-semibold">Imagen del producto</h2>
            <div className="relative grid aspect-square place-items-center overflow-hidden rounded-[2rem] border border-dashed border-[var(--outline-variant)] bg-white/35">{imagen || imagenPorUrl ? <Image unoptimized fill src={imagen || imagenPorUrl} alt="Vista previa del producto" className="object-cover" /> : <div className="text-center text-[var(--on-surface-variant)]"><i className="bx bx-image-add text-5xl" /><p className="mt-2">Selecciona una imagen</p></div>}</div>
            <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-full border border-white/60 bg-white/60 px-4 py-3 font-semibold hover:bg-white"><i className="bx bx-upload" />{nombreImagen || "Cargar JPG, PNG o WebP"}<input id="imagen-producto" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className="sr-only" onChange={(evento) => seleccionarImagen(evento.target.files?.[0])} /></label>
            {imagen && <button type="button" onClick={quitarImagen} className="mt-2 w-full rounded-full px-4 py-2 text-[var(--error)] hover:bg-red-50">Quitar imagen</button>}
            <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wider text-[var(--on-surface-variant)]"><span className="h-px flex-1 bg-[var(--outline-variant)]" />o usa un enlace<span className="h-px flex-1 bg-[var(--outline-variant)]" /></div>
            <input type="url" {...register("imagenUrl")} placeholder="https://ejemplo.com/imagen.webp" className={campo} />
            {errors.imagenUrl?.message && <span className="mt-1 block text-sm text-[var(--error)]">{errors.imagenUrl.message}</span>}
            <p className="mt-2 text-xs text-[var(--on-surface-variant)]">Si seleccionas un archivo, tendrá prioridad sobre el enlace. Máximo 5 MB.</p>
          </section>
          {errorServidor && <p role="alert" className="rounded-2xl bg-red-100 p-4 text-[var(--error)]">{errorServidor}</p>}
          {mensajeExito && <p role="status" className="rounded-2xl bg-emerald-100 p-4 font-semibold text-emerald-800"><i className="bx bx-check-circle mr-2" />{mensajeExito}</p>}
          <button disabled={isSubmitting || Boolean(mensajeExito)} className="w-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] px-6 py-4 font-bold text-white shadow-lg hover:brightness-110 disabled:opacity-60">{isSubmitting ? "Guardando..." : modo === "editar" ? "Guardar cambios" : tiposProducto.find((opcion) => opcion.id === tipo)?.categoria === "TELEFONO" || tiposProducto.find((opcion) => opcion.id === tipo)?.categoria === "CRISTAL_TEMPLADO" ? "Guardar y registrar pantalla" : "Guardar producto"}</button>
        </aside>
      </form>
  );
}

function SelectorCatalogo({ registro, opciones, texto, clase }: { registro: ReturnType<ReturnType<typeof useForm<DatosProducto>>["register"]>; opciones: OpcionCatalogo[]; texto: string; clase: string }) {
  const selector = useRef<HTMLSelectElement | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const normalizar = (valor: string) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-MX");
  const seleccionar = (textoBusqueda: string, elemento = selector.current) => {
    if (!elemento || !textoBusqueda.trim()) return;
    const termino = normalizar(textoBusqueda.trim());
    const coincidencia = opciones.find((opcion) => normalizar(opcion.nombre).startsWith(termino))
      ?? opciones.find((opcion) => normalizar(opcion.nombre).includes(termino))
      ?? opciones.find((opcion) => normalizar(opcion.clave).startsWith(termino))
      ?? opciones.find((opcion) => normalizar(opcion.clave).includes(termino));
    if (coincidencia) {
      elemento.value = coincidencia.id;
      elemento.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };
  return <div className="space-y-2">
    {opciones.length > 15 && <label className="relative block"><span className="sr-only">Buscar opción</span><i className="bx bx-search pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)]" /><input value={busqueda} onChange={(evento) => { setBusqueda(evento.target.value); seleccionar(evento.target.value); }} onKeyDown={(evento) => { if (evento.key === "Enter") { evento.preventDefault(); selector.current?.focus(); } }} placeholder="Buscar por nombre o clave..." className="w-full rounded-full border border-white/60 bg-white/70 py-3 pl-11 pr-4 outline-none focus:ring-2 focus:ring-purple-400/50" /></label>}
    <select {...registro} ref={(elemento) => { selector.current = elemento; registro.ref(elemento); }} onKeyDown={(evento) => { if (evento.key.length === 1 && /[\p{L}\p{N}]/u.test(evento.key)) { evento.preventDefault(); seleccionar(evento.key, evento.currentTarget); } }} className={clase}><option value="">{texto}</option>{opciones.map((opcion) => <option key={opcion.id} value={opcion.id}>{opcion.clave} · {opcion.nombre}</option>)}</select>
  </div>;
}

function Campo({ numero, etiqueta, error, clase = "", children }: { numero: string; etiqueta: string; error?: string; clase?: string; children: React.ReactNode }) {
  return <label className={`block ${clase}`}><span className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[var(--on-surface-variant)]"><span className="grid size-5 place-items-center rounded-full bg-purple-100 text-[10px] text-[var(--primary)]">{numero}</span>{etiqueta}</span>{children}{error && <span className="mt-1 block text-sm text-[var(--error)]">{error}</span>}</label>;
}
