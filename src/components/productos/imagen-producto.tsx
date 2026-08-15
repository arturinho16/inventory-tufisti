import Image from "next/image";

export function ImagenProducto({ url, descripcion, sizes, icono = "bx-package" }: { url?: string | null; descripcion: string; sizes: string; icono?: string }) {
  const [ruta, consulta] = url?.split("?") ?? [];
  const origen = ruta?.startsWith("/imagenes/productos/") ? `/api/imagenes/productos/${encodeURIComponent(ruta.slice("/imagenes/productos/".length))}${consulta ? `?${consulta}` : ""}` : url;
  return url
    ? <Image unoptimized fill sizes={sizes} src={origen!} alt={`Imagen de ${descripcion}`} className="bg-[var(--surface-container-lowest)] object-contain p-[10%]" />
    : <i aria-hidden="true" className={`bx ${icono}`} />;
}
