export function normalizarNombreLinea(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("es-MX");
}

export function requiereRegistroTecnico(nombreLinea?: string) {
  return normalizarNombreLinea(nombreLinea ?? "") === "cristal templado para celular";
}
