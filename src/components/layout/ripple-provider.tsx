"use client";
import { useEffect } from "react";

export function RippleProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const crearOnda = (evento: PointerEvent) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (!(evento.target as HTMLElement).closest("button, a, [data-ripple]")) return;
      const onda = document.createElement("span");
      onda.className = "onda-global";
      onda.style.left = `${evento.clientX}px`; onda.style.top = `${evento.clientY}px`;
      document.body.appendChild(onda); window.setTimeout(() => onda.remove(), 600);
    };
    document.addEventListener("pointerdown", crearOnda);
    return () => document.removeEventListener("pointerdown", crearOnda);
  }, []);
  return children;
}
