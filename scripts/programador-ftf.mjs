const url = process.env.FTF_WORKER_URL || "http://aplicacion:3000/api/tareas/importaciones-ftf";
const token = process.env.FTF_WORKER_TOKEN;
if (!token) throw new Error("Falta FTF_WORKER_TOKEN.");

let ejecutando = false;
async function revisar() {
  if (ejecutando) return;
  ejecutando = true;
  try {
    const respuesta = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(290_000) });
    const cuerpo = await respuesta.json();
    if (!respuesta.ok) throw new Error(cuerpo.error || `El servidor respondió HTTP ${respuesta.status}.`);
    if (cuerpo.resultado) console.log(`[${new Date().toISOString()}] ${cuerpo.resultado.clave}: ${cuerpo.resultado.estado}`);
  } catch (error) { console.error(`[${new Date().toISOString()}] ${error instanceof Error ? error.message : "Falló el trabajador FTF."}`); }
  finally { ejecutando = false; }
}

await revisar();
setInterval(revisar, 15_000);
