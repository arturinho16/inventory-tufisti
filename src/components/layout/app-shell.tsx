import Link from "next/link";
import { RippleProvider } from "./ripple-provider";
import { Sidebar } from "./sidebar";
import { NavegacionMovil } from "./navegacion-movil";
import { PersistenciaNavegacion } from "./persistencia-navegacion";

export async function AppShell({ children }: { children: React.ReactNode }) {
  return <RippleProvider><PersistenciaNavegacion /><div className="flex min-h-screen"><Sidebar /><div className="min-w-0 flex-1">
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-white/60 bg-white/35 px-4 backdrop-blur-xl sm:px-8"><Link href="/inventario" className="flex items-center gap-2 font-bold text-[var(--primary)] lg:hidden"><i className="bx bx-cube-alt text-2xl" />TUFIS</Link><span aria-hidden="true" className="hidden lg:block" /><div className="flex items-center gap-2"><button aria-label="Notificaciones" className="grid size-10 place-items-center rounded-full hover:bg-white/60"><i className="bx bx-bell text-xl" /></button><span className="grid size-10 place-items-center rounded-full border border-white/60 bg-white/60 text-[var(--primary)]"><i className="bx bx-user text-xl" /></span></div></header>
    {children}
    <NavegacionMovil />
  </div></div></RippleProvider>;
}
