const LONGITUDES_GTIN = new Set([8, 12, 13, 14]);

export function calcularDigitoVerificador(cuerpo: string) {
  if (!/^\d+$/.test(cuerpo)) throw new Error("El cuerpo del código debe contener solo números.");
  const suma = [...cuerpo].reverse().reduce((total, digito, indice) => total + Number(digito) * (indice % 2 === 0 ? 3 : 1), 0);
  return String((10 - (suma % 10)) % 10);
}

export function esGtinValido(codigo: string) {
  const limpio = codigo.trim();
  if (!/^\d+$/.test(limpio) || !LONGITUDES_GTIN.has(limpio.length)) return false;
  return calcularDigitoVerificador(limpio.slice(0, -1)) === limpio.at(-1);
}

function huellaNumerica(valor: string) {
  const texto = valor.normalize("NFKD").toUpperCase();
  const calcular = (semilla: number) => {
    let hash = semilla;
    for (const caracter of texto) {
      hash ^= caracter.codePointAt(0) ?? 0;
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) % 100_000;
  };
  return `${calcular(2166136261).toString().padStart(5, "0")}${calcular(3339675911).toString().padStart(5, "0")}`;
}

export function crearCodigoUniversalInterno(clave: string, linea: string, marca: string) {
  const cuerpo = `29${huellaNumerica(`${clave.trim()}|${linea.trim()}|${marca.trim()}`)}`;
  return `${cuerpo}${calcularDigitoVerificador(cuerpo)}`;
}

export function esCodigoUniversalInterno(codigo: string) {
  return codigo.length === 13 && codigo.startsWith("29") && esGtinValido(codigo);
}
