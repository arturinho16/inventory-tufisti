const url = process.env.RESPALDOS_CRON_URL || "http://aplicacion:3000/api/tareas/respaldos";
const token = process.env.RESPALDOS_CRON_TOKEN;
if (!token) throw new Error("Falta RESPALDOS_CRON_TOKEN.");

let ejecutando = false;
async function revisar() {
  if (ejecutando) return;
  ejecutando = true;
  try {
    const respuesta = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(50_000) });
    if (!respuesta.ok) throw new Error(`El servidor respondió HTTP ${respuesta.status}.`);
    const cuerpo = await respuesta.json();
    if (cuerpo.resultados?.length) console.log(`[${new Date().toISOString()}] Respaldos procesados: ${cuerpo.resultados.length}`);
  } catch (causa) { console.error(`[${new Date().toISOString()}] ${causa instanceof Error ? causa.message : "Falló la revisión."}`); }
  finally { ejecutando = false; }
}

await revisar();
setInterval(revisar, 60_000);
