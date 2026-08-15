import { create } from "zustand";
import type { ElementoEtiqueta, TipoElementoEtiqueta } from "@/types/etiqueta";

interface EstadoEditorEtiquetas {
  anchoMm: number;
  altoMm: number;
  margenMm: number;
  elementos: ElementoEtiqueta[];
  seleccionadoId?: string;
  cambiarTamano: (anchoMm: number, altoMm: number) => void;
  cambiarMargen: (margenMm: number) => void;
  agregar: (tipo: TipoElementoEtiqueta) => void;
  seleccionar: (id?: string) => void;
  mover: (id: string, x: number, y: number) => void;
  cambiarFuente: (id: string, tamanoFuente: number) => void;
  redimensionar: (id: string, ancho: number, alto: number) => void;
  eliminar: (id: string) => void;
  eliminarSeleccionado: () => void;
  organizar: () => void;
  reiniciar: () => void;
}

// Plantilla legible para la etiqueta predeterminada de 50 × 25 mm con margen de 2 mm.
const crearIniciales = (): ElementoEtiqueta[] => [
  { id: "modelo-inicial", tipo: "modelo", x: 12, y: 12, ancho: 276, alto: 21, tamanoFuente: 14 },
  { id: "clave-inicial", tipo: "clave", x: 12, y: 36, ancho: 276, alto: 18, tamanoFuente: 11 },
  { id: "barras-inicial", tipo: "barras", x: 12, y: 60, ancho: 276, alto: 72, tamanoFuente: 10 },
];

const seSuperponen = (a: Pick<ElementoEtiqueta, "x" | "y" | "ancho" | "alto">, b: Pick<ElementoEtiqueta, "x" | "y" | "ancho" | "alto">) =>
  a.x < b.x + b.ancho && a.x + a.ancho > b.x && a.y < b.y + b.alto && a.y + a.alto > b.y;

function buscarEspacioLibre(elementos: ElementoEtiqueta[], ancho: number, alto: number, anchoEtiqueta: number, altoEtiqueta: number, margen: number) {
  const separacion = 6;
  for (let y = margen; y + alto <= altoEtiqueta - margen; y += separacion) {
    for (let x = margen; x + ancho <= anchoEtiqueta - margen; x += separacion) {
      const candidato = { x, y, ancho, alto };
      if (elementos.every((existente) => !seSuperponen(candidato, existente))) return { x, y };
    }
  }
  return { x: margen, y: margen };
}

export const useEditorEtiquetas = create<EstadoEditorEtiquetas>((set) => ({
  anchoMm: 50,
  altoMm: 25,
  margenMm: 2,
  elementos: crearIniciales(),
  cambiarTamano: (anchoMm, altoMm) => set({ anchoMm, altoMm }),
  cambiarMargen: (margenMm) => set({ margenMm }),
  agregar: (tipo) => set((estado) => {
    if (estado.elementos.some((elemento) => elemento.tipo === tipo)) return estado;
    const id = `${tipo}-${Date.now()}`;
    const esCodigo = tipo === "barras" || tipo === "qr";
    const margen = estado.margenMm * 6;
    const ancho = Math.min(tipo === "qr" ? 90 : esCodigo ? 180 : 250, estado.anchoMm * 6 - margen * 2);
    const alto = Math.min(tipo === "qr" ? 90 : esCodigo ? 48 : 18, estado.altoMm * 6 - margen * 2);
    const posicion = buscarEspacioLibre(estado.elementos, ancho, alto, estado.anchoMm * 6, estado.altoMm * 6, margen);
    return { elementos: [...estado.elementos, { id, tipo, ...posicion, ancho, alto, tamanoFuente: 11 }], seleccionadoId: id };
  }),
  seleccionar: (seleccionadoId) => set({ seleccionadoId }),
  mover: (id, x, y) => set((estado) => ({ elementos: estado.elementos.map((elemento) => elemento.id === id ? { ...elemento, x, y } : elemento) })),
  cambiarFuente: (id, tamanoFuente) => set((estado) => ({ elementos: estado.elementos.map((elemento) => elemento.id === id ? { ...elemento, tamanoFuente } : elemento) })),
  redimensionar: (id, ancho, alto) => set((estado) => ({ elementos: estado.elementos.map((elemento) => elemento.id === id ? { ...elemento, ancho, alto } : elemento) })),
  eliminar: (id) => set((estado) => ({ elementos: estado.elementos.filter((elemento) => elemento.id !== id), seleccionadoId: estado.seleccionadoId === id ? undefined : estado.seleccionadoId })),
  eliminarSeleccionado: () => set((estado) => ({ elementos: estado.elementos.filter((elemento) => elemento.id !== estado.seleccionadoId), seleccionadoId: undefined })),
  organizar: () => set((estado) => {
    const margen = estado.margenMm * 6;
    const organizados: ElementoEtiqueta[] = [];
    for (const elemento of estado.elementos) {
      const posicion = buscarEspacioLibre(organizados, elemento.ancho, elemento.alto, estado.anchoMm * 6, estado.altoMm * 6, margen);
      organizados.push({ ...elemento, ...posicion });
    }
    return { elementos: organizados };
  }),
  reiniciar: () => set({ anchoMm: 50, altoMm: 25, margenMm: 2, elementos: crearIniciales(), seleccionadoId: undefined }),
}));
