"use client";

import { useState } from "react";
import { analizarLote, confirmarLote, validarArchivosLote } from "@/actions/importaciones";
import { etiquetaUbicacionesImportacion } from "@/lib/importaciones/ubicaciones";

type ErrorLote = { fila: number; clave: string; modelo: string; tipo: "Error" | "Advertencia"; problema: string };
type Resultado = Awaited<ReturnType<typeof analizarLote>>["resultados"][number];
type CampoObligatorio = "tecnologia" | "diagonalMm" | "diagonalPulgadas" | "anchoDisplayMm" | "altoDisplayMm" | "aspectRatio" | "resolucionAnchoPx" | "resolucionAltoPx" | "densidadPpi" | "profundidadColor" | "areaDisplayPorcentaje";

const camposObligatorios: { campo: CampoObligatorio; etiqueta: string }[] = [
  { campo: "tecnologia", etiqueta: "Tecnología" }, { campo: "diagonalMm", etiqueta: "Diagonal mm" },
  { campo: "diagonalPulgadas", etiqueta: "Diagonal pulgadas" }, { campo: "anchoDisplayMm", etiqueta: "Ancho" },
  { campo: "altoDisplayMm", etiqueta: "Alto" }, { campo: "aspectRatio", etiqueta: "Aspect ratio" },
  { campo: "resolucionAnchoPx", etiqueta: "Resolución ancho" }, { campo: "resolucionAltoPx", etiqueta: "Resolución alto" },
  { campo: "densidadPpi", etiqueta: "PPI" }, { campo: "profundidadColor", etiqueta: "Profundidad de color" },
  { campo: "areaDisplayPorcentaje", etiqueta: "Área del display" },
];

function faltantesDe(resultado: Resultado) {
  return camposObligatorios.filter(({ campo }) => resultado.datos[campo] === null || resultado.datos[campo] === "");
}

export function ImportadorLotes() {
  const [paso, setPaso] = useState(1);
  const [loteId, setLoteId] = useState("");
  const [errores, setErrores] = useState<ErrorLote[]>([]);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const faltantes = resultados.flatMap((resultado) => faltantesDe(resultado).map(({ etiqueta }) => `${resultado.fila.clave}: ${etiqueta}`));

  const validar = async (formData: FormData) => {
    setOcupado(true); setMensaje("");
    try {
      const respuesta = await validarArchivosLote(formData);
      setErrores(respuesta.errores);
      if (respuesta.valido) { setLoteId(respuesta.loteId); setPaso(2); setMensaje(`${respuesta.total} filas y fichas validadas. Ya puedes iniciar el análisis.`); }
      else setMensaje("Corrige los errores y vuelve a cargar ambos archivos.");
    } catch (error) { setMensaje(error instanceof Error ? error.message : "No fue posible validar los archivos."); }
    finally { setOcupado(false); }
  };
  const analizar = async () => {
    setOcupado(true); setMensaje("Analizando fichas; el avance se guarda automáticamente...");
    try {
      let respuesta = await analizarLote(loteId);
      while (!respuesta.completo) { setMensaje(`${respuesta.analizados} de ${respuesta.total} fichas analizadas. Continuando automáticamente...`); respuesta = await analizarLote(loteId); }
      setResultados(respuesta.resultados); setPaso(3); setMensaje(`${respuesta.total} fichas analizadas. Revisa los resultados antes de importar.`);
    } catch { setMensaje("El análisis se interrumpió, pero el avance quedó guardado. Pulsa nuevamente Analizar todas las fichas para continuar desde la última completada."); }
    finally { setOcupado(false); }
  };
  const confirmar = async () => {
    if (faltantes.length) { setMensaje(`Completa los campos obligatorios pendientes: ${faltantes.join("; ")}.`); return; }
    setOcupado(true); setMensaje("Importando productos y registros técnicos...");
    try {
      const respuesta = await confirmarLote(loteId, resultados.map(({ fila, datos }) => ({ clave: fila.clave, datos })));
      if (respuesta.error) { setMensaje(respuesta.error); return; }
      setPaso(4); setMensaje(`${respuesta.importados} productos y fichas técnicas fueron importados correctamente.`);
    } catch { setMensaje("No fue posible importar el lote. Revisa los datos e inténtalo nuevamente."); }
    finally { setOcupado(false); }
  };
  const actualizar = (clave: string, cambios: Partial<Resultado["datos"]>) => setResultados((actuales) => actuales.map((resultado) => resultado.fila.clave === clave ? { ...resultado, datos: { ...resultado.datos, ...cambios } } : resultado));
  const reiniciar = () => { setPaso(1); setLoteId(""); setErrores([]); setResultados([]); setMensaje(""); };

  return <div className="space-y-6">
    <ol className="grid gap-3 sm:grid-cols-4">{["Cargar y validar", "Analizar fichas", "Revisar", "Importar"].map((texto, indice) => <li key={texto} className={`rounded-3xl border p-4 ${paso === indice + 1 ? "border-purple-300 bg-purple-100/70" : paso > indice + 1 ? "border-emerald-200 bg-emerald-50/70" : "border-white/60 bg-white/40"}`}><span className="font-mono text-xs">PASO {indice + 1}</span><strong className="mt-1 block">{texto}</strong></li>)}</ol>
    {paso === 1 && <form action={validar} className="rounded-[2.5rem] border border-white/60 bg-white/40 p-6 backdrop-blur-xl sm:p-8"><h2 className="text-2xl font-semibold">Selecciona los archivos del lote</h2><p className="mt-2 text-[var(--on-surface-variant)]">El ZIP debe conservar las rutas indicadas en rutaImagenCompletaFC. Cada fila debe incluir almacén, cuenta asociada y marketplace. Para asignar varias ubicaciones, separa valores alineados con <span className="font-mono">|</span>. Esta validación no consume OpenAI ni modifica PostgreSQL.</p><div className="mt-6 grid gap-5 sm:grid-cols-2"><Archivo nombre="excel" etiqueta="Productos (.xlsx)" aceptar=".xlsx" /><Archivo nombre="imagenes" etiqueta="Fichas técnicas (.zip)" aceptar=".zip" /></div><button disabled={ocupado} className="mt-6 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] px-6 py-3 font-semibold text-white disabled:opacity-60">{ocupado ? "Validando..." : "Validar archivos"}</button></form>}
    {mensaje && <p role="status" className="rounded-3xl border border-white/60 bg-white/60 p-5 font-medium">{mensaje}</p>}
    {errores.length > 0 && <TablaErrores errores={errores} />}
    {paso === 2 && <section className="rounded-[2.5rem] border border-white/60 bg-white/40 p-8"><h2 className="text-2xl font-semibold">Archivos listos</h2><p className="mt-2 text-[var(--on-surface-variant)]">El siguiente paso sí consume créditos de OpenAI.</p><div className="mt-6 flex flex-wrap gap-3"><button disabled={ocupado} onClick={analizar} className="rounded-full bg-[var(--primary)] px-6 py-3 font-semibold text-white disabled:opacity-60">{ocupado ? "Analizando..." : "Analizar todas las fichas"}</button><button onClick={reiniciar} disabled={ocupado} className="rounded-full border px-6 py-3">Cambiar archivos</button></div></section>}
    {paso === 3 && <><VistaResultados resultados={resultados} actualizar={actualizar} />{faltantes.length > 0 && <section role="alert" className="rounded-3xl border border-red-200 bg-red-50/90 p-5 text-red-900"><h2 className="font-semibold">Faltan {faltantes.length} campos obligatorios</h2><p className="mt-2 text-sm">Completa los campos marcados en rojo antes de confirmar.</p></section>}<div className="flex flex-wrap justify-end gap-3"><button onClick={reiniciar} disabled={ocupado} className="rounded-full border px-6 py-3">Cancelar lote</button><button onClick={confirmar} disabled={ocupado || faltantes.length > 0} title={faltantes.length ? "Completa todos los campos obligatorios" : undefined} className="rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">{ocupado ? "Importando..." : "Confirmar importación"}</button></div></>}
    {paso === 4 && <div className="rounded-[2.5rem] border border-emerald-200 bg-emerald-50/80 p-8"><i className="bx bx-check-circle text-5xl text-emerald-700" /><h2 className="mt-3 text-2xl font-semibold">Importación terminada</h2><button onClick={reiniciar} className="mt-5 rounded-full bg-emerald-700 px-6 py-3 font-semibold text-white">Importar otro lote</button></div>}
  </div>;
}

function Archivo({ nombre, etiqueta, aceptar }: { nombre: string; etiqueta: string; aceptar: string }) {
  return <label className="rounded-3xl border border-dashed border-purple-300 bg-white/50 p-6"><span className="block font-semibold">{etiqueta}</span><input required type="file" name={nombre} accept={aceptar} className="mt-4 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-purple-100 file:px-4 file:py-2 file:font-semibold file:text-[var(--primary)]" /></label>;
}

function TablaErrores({ errores }: { errores: ErrorLote[] }) {
  return <section className="overflow-x-auto rounded-[2rem] border border-white/60 bg-white/50 p-4"><table className="w-full min-w-[48rem] text-left text-sm"><thead><tr>{["Fila", "Clave", "Modelo", "Estado", "Problema"].map((texto) => <th key={texto} className="p-3">{texto}</th>)}</tr></thead><tbody>{errores.map((error, indice) => <tr key={`${error.fila}-${indice}`} className="border-t border-white/70"><td className="p-3">{error.fila || "—"}</td><td className="p-3 font-mono">{error.clave}</td><td className="p-3">{error.modelo}</td><td className="p-3"><span className={`rounded-full px-3 py-1 font-semibold ${error.tipo === "Error" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{error.tipo}</span></td><td className="p-3">{error.problema}</td></tr>)}</tbody></table></section>;
}

function VistaResultados({ resultados, actualizar }: { resultados: Resultado[]; actualizar: (clave: string, cambios: Partial<Resultado["datos"]>) => void }) {
  const numero = (valor: string) => valor === "" ? null : Number(valor);
  const claseCampo = (vacio: boolean, ancho = "w-24") => `${ancho} rounded-xl border bg-white/80 px-2 py-2 font-mono outline-none ${vacio ? "border-red-500 ring-2 ring-red-200" : "border-white/70 focus:ring-2 focus:ring-purple-300"}`;
  return <section className="overflow-x-auto rounded-[2rem] border border-white/60 bg-white/50 p-4"><h2 className="p-3 text-2xl font-semibold">Vista previa editable</h2><p className="px-3 pb-3 text-[var(--on-surface-variant)]">Los campos obligatorios sin información aparecen en rojo. Corrígelos antes de confirmar.</p><table className="w-full min-w-[130rem] text-left text-sm"><thead><tr>{["Clave", "Modelo", "Ubicaciones", "Tecnología", "Diagonal", "Ancho", "Alto", "Aspect ratio", "Resolución", "PPI", "Profundidad de color", "Área display", "Refresco", "Advertencias"].map((texto) => <th key={texto} className="p-3">{texto}</th>)}</tr></thead><tbody>{resultados.map(({ fila, datos }) => {
    const vacio = (campo: CampoObligatorio) => datos[campo] === null || datos[campo] === "";
    return <tr key={fila.clave} className="border-t border-white/70 align-top"><td className="p-3 font-mono">{fila.clave}</td><td className="p-3">{fila.modelo}</td><td className="max-w-80 p-3">{etiquetaUbicacionesImportacion(fila.ubicaciones)}</td>
      <td className="p-3"><input aria-label={`Tecnología ${fila.clave}`} value={datos.tecnologia ?? ""} onChange={(evento) => actualizar(fila.clave, { tecnologia: evento.target.value })} className={claseCampo(vacio("tecnologia"), "w-32")} /></td>
      <td className="p-3"><div className="flex gap-1"><input aria-label={`Diagonal en milímetros ${fila.clave}`} title="Milímetros" type="number" min="0" step="any" value={datos.diagonalMm ?? ""} onChange={(evento) => actualizar(fila.clave, { diagonalMm: numero(evento.target.value) })} className={claseCampo(vacio("diagonalMm"))} /><input aria-label={`Diagonal en pulgadas ${fila.clave}`} title="Pulgadas" type="number" min="0" step="any" value={datos.diagonalPulgadas ?? ""} onChange={(evento) => actualizar(fila.clave, { diagonalPulgadas: numero(evento.target.value) })} className={claseCampo(vacio("diagonalPulgadas"))} /></div></td>
      <td className="p-3"><input aria-label={`Ancho ${fila.clave}`} type="number" min="0" step="any" value={datos.anchoDisplayMm ?? ""} onChange={(evento) => actualizar(fila.clave, { anchoDisplayMm: numero(evento.target.value) })} className={claseCampo(vacio("anchoDisplayMm"))} /></td>
      <td className="p-3"><input aria-label={`Alto ${fila.clave}`} type="number" min="0" step="any" value={datos.altoDisplayMm ?? ""} onChange={(evento) => actualizar(fila.clave, { altoDisplayMm: numero(evento.target.value) })} className={claseCampo(vacio("altoDisplayMm"))} /></td>
      <td className="p-3"><input aria-label={`Aspect ratio ${fila.clave}`} value={datos.aspectRatio ?? ""} onChange={(evento) => actualizar(fila.clave, { aspectRatio: evento.target.value })} className={claseCampo(vacio("aspectRatio"))} /></td>
      <td className="p-3"><div className="flex gap-1"><input aria-label={`Resolución ancho ${fila.clave}`} type="number" min="1" value={datos.resolucionAnchoPx ?? ""} onChange={(evento) => actualizar(fila.clave, { resolucionAnchoPx: numero(evento.target.value) })} className={claseCampo(vacio("resolucionAnchoPx"))} /><input aria-label={`Resolución alto ${fila.clave}`} type="number" min="1" value={datos.resolucionAltoPx ?? ""} onChange={(evento) => actualizar(fila.clave, { resolucionAltoPx: numero(evento.target.value) })} className={claseCampo(vacio("resolucionAltoPx"))} /></div></td>
      <td className="p-3"><input aria-label={`Densidad ${fila.clave}`} type="number" min="1" value={datos.densidadPpi ?? ""} onChange={(evento) => actualizar(fila.clave, { densidadPpi: numero(evento.target.value) })} className={claseCampo(vacio("densidadPpi"))} /></td>
      <td className="p-3"><input aria-label={`Profundidad de color ${fila.clave}`} value={datos.profundidadColor ?? ""} onChange={(evento) => actualizar(fila.clave, { profundidadColor: evento.target.value })} className={claseCampo(vacio("profundidadColor"), "w-36")} /></td>
      <td className="p-3"><input aria-label={`Área del display ${fila.clave}`} title="Porcentaje" type="number" min="0" max="100" step="any" value={datos.areaDisplayPorcentaje ?? ""} onChange={(evento) => actualizar(fila.clave, { areaDisplayPorcentaje: numero(evento.target.value) })} className={claseCampo(vacio("areaDisplayPorcentaje"))} /></td>
      <td className="p-3"><input aria-label={`Refresco ${fila.clave}`} type="number" min="1" value={datos.refrescoHz ?? ""} onChange={(evento) => actualizar(fila.clave, { refrescoHz: numero(evento.target.value) })} className={claseCampo(false)} /></td><td className="max-w-64 p-3">{datos.advertencias.join("; ") || "Sin advertencias"}</td></tr>;
  })}</tbody></table></section>;
}
