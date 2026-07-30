"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { eliminarProducto } from "@/actions/productos";
import type { ProductoInventario } from "@/types/producto";
const estado = (n: number) => n <= 20 ? "bg-red-500" : n <= 400 ? "bg-amber-500" : "bg-emerald-500";

export function TablaInventario({ productos }: { productos: ProductoInventario[] }) {
  const [eliminados, setEliminados] = useState<string[]>([]);
  const [productoAEliminar, setProductoAEliminar] = useState<ProductoInventario | null>(null);
  const [pasoConfirmacion, setPasoConfirmacion] = useState<1 | 2>(1);

  const visibles = productos.filter((producto) => !eliminados.includes(producto.id));

  const cerrarConfirmacion = () => {
    setProductoAEliminar(null);
    setPasoConfirmacion(1);
  };
  const eliminar = async () => {
    if (!productoAEliminar) return;
    await eliminarProducto(productoAEliminar.id);
    setEliminados((actuales) => [...actuales, productoAEliminar.id]);
    cerrarConfirmacion();
  };

  if (!visibles.length) return <div className="grid min-h-72 place-items-center p-8 text-center"><div><i className="bx bx-search-alt text-5xl text-[var(--outline)]" /><h2 className="mt-3 text-xl font-semibold">No encontramos productos</h2><p className="text-[var(--on-surface-variant)]">Prueba con otros filtros.</p></div></div>;
  const titulos = ["Imagen", "Clave", "Descripción", "Línea", "Existencia", "Modelo", "Marca", "Color", "Clave MLFull", "Código universal", "Acciones"];
  return <>
    <div className="overflow-x-auto"><table className="w-full min-w-[1360px] text-left"><thead className="bg-[var(--surface-container-high)]/90 font-mono text-xs uppercase tracking-wider text-[var(--on-surface-variant)]"><tr>{titulos.map(t => <th key={t} className="px-4 py-4 font-medium">{t}</th>)}</tr></thead><tbody>{visibles.map(p => <tr key={p.id} className="border-t border-white/50 hover:bg-white/35"><td className="px-4 py-3"><div className="relative grid size-12 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 text-2xl text-[var(--primary)]">{p.imagenUrl ? <Image unoptimized fill sizes="48px" src={p.imagenUrl} alt={`Imagen de ${p.descripcion}`} className="object-cover" /> : <i className={`bx ${p.tipoProducto === "Teléfono" ? "bx-mobile-alt" : "bx-shape-square"}`} />}</div></td><td className="px-4 py-3 font-mono text-sm font-semibold text-[var(--primary)]">{p.clave}</td><td className="max-w-56 px-4 py-3 font-semibold">{p.descripcion}</td><td className="px-4 py-3"><span className="rounded-full bg-slate-200/50 px-3 py-1 text-sm">{p.linea}</span></td><td className="px-4 py-3"><span className="inline-flex items-center gap-2 font-semibold"><span className={`size-2 rounded-full ${estado(p.existencia)}`} />{p.existencia.toLocaleString("es-MX")}</span></td><td className="px-4 py-3">{p.modelo}</td><td className="px-4 py-3">{p.marca}</td><td className="px-4 py-3">{p.color}</td><td className="px-4 py-3 font-mono text-sm">{p.claveMLFull}</td><td className="px-4 py-3 font-mono text-sm">{p.codigoUniversal}</td><td className="px-4 py-3"><div className="flex gap-2"><Link href={`/productos/${p.id}/editar`} aria-label={`Editar ${p.clave}`} title="Editar producto" className="grid size-11 place-items-center rounded-full bg-purple-100 text-xl text-[var(--primary)] hover:bg-purple-200"><i className="bx bx-edit-alt" /></Link><button type="button" onClick={() => { setProductoAEliminar(p); setPasoConfirmacion(1); }} aria-label={`Eliminar ${p.clave}`} title="Eliminar producto" className="grid size-11 place-items-center rounded-full bg-red-100 text-xl text-[var(--error)] hover:bg-red-200"><i className="bx bx-trash" /></button></div></td></tr>)}</tbody></table></div>
    {productoAEliminar && <div className="fixed inset-0 z-[100] grid place-items-center bg-[var(--on-surface)]/30 p-4 backdrop-blur-md" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) cerrarConfirmacion(); }}><section role="alertdialog" aria-modal="true" aria-labelledby="titulo-eliminar" className="w-full max-w-lg rounded-[2.5rem] border border-white/60 bg-[var(--surface)] p-7 shadow-2xl sm:p-9"><span className="grid size-14 place-items-center rounded-full bg-red-100 text-3xl text-[var(--error)]"><i className="bx bx-trash" /></span><h2 id="titulo-eliminar" className="mt-5 text-2xl font-bold">{pasoConfirmacion === 1 ? "¿Eliminar este producto?" : "Confirmación final"}</h2><p className="mt-3 text-[var(--on-surface-variant)]">{pasoConfirmacion === 1 ? <>Se eliminará <strong>{productoAEliminar.clave}</strong>. Esta acción afectará el inventario.</> : <>Confirma nuevamente que deseas eliminar definitivamente <strong>{productoAEliminar.clave}</strong>.</>}</p><div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={cerrarConfirmacion} className="rounded-full border border-[var(--outline-variant)] bg-white/60 px-5 py-3 font-semibold">Cancelar</button>{pasoConfirmacion === 1 ? <button type="button" onClick={() => setPasoConfirmacion(2)} className="rounded-full bg-red-100 px-5 py-3 font-semibold text-[var(--error)]">Continuar</button> : <button type="button" onClick={eliminar} className="rounded-full bg-[var(--error)] px-5 py-3 font-semibold text-white">Sí, eliminar definitivamente</button>}</div></section></div>}
  </>;
}
