import { obtenerCuentaMercadoLibre } from "@/lib/mercadolibre/consultas";
import { NavegacionSidebar } from "./navegacion-sidebar";

export async function Sidebar() {
  const cuenta = await obtenerCuentaMercadoLibre();
  return <NavegacionSidebar cuenta={cuenta} />;
}

