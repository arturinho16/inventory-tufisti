const base = process.env.MERCADOLIBRE_CRON_URL || "http://aplicacion:3000/api/tareas/mercadolibre";
const token = process.env.RESPALDOS_CRON_TOKEN;
if (!token) throw new Error("Falta el token interno del programador.");

let ejecutando = false;
let ultimaFechaCompleta = "";

async function solicitar(modo) {
  if (ejecutando) return;
  ejecutando = true;
  try {
    const respuesta = await fetch(`${base}?modo=${modo}`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(modo === "completa" ? 14 * 60_000 : 4 * 60_000) });
    if (!respuesta.ok) throw new Error(`La reconciliación ${modo} respondió HTTP ${respuesta.status}.`);
    const cuerpo = await respuesta.json();
    console.log(`[${new Date().toISOString()}] Mercado Libre ${modo}: ${JSON.stringify(cuerpo.resultado)}`);
  } catch (error) { console.error(`[${new Date().toISOString()}] ${error instanceof Error ? error.message : "Falló la reconciliación."}`); }
  finally { ejecutando = false; }
}

function datosMexico() {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  return Object.fromEntries(partes.map(parte => [parte.type, parte.value]));
}

async function revisarCompleta() {
  const ahora = datosMexico();
  const fecha = `${ahora.year}-${ahora.month}-${ahora.day}`;
  if (ahora.hour === "03" && ultimaFechaCompleta !== fecha) { await solicitar("completa"); ultimaFechaCompleta = fecha; }
}

await solicitar("incremental");
await revisarCompleta();
setInterval(() => void solicitar("incremental"), 15 * 60_000);
setInterval(() => void revisarCompleta(), 60_000);
