import { mkdir } from "node:fs/promises";
import ExcelJS from "exceljs";

const libro = new ExcelJS.Workbook();
libro.creator = "TUFIS";
libro.created = new Date();
libro.modified = new Date();

const manifest = libro.addWorksheet("Manifest", { views: [{ state: "frozen", ySplit: 1 }] });
manifest.columns = [
  { header: "Clave", key: "clave", width: 15 }, { header: "Marca", key: "marca", width: 20 },
  { header: "Modelo", key: "modelo", width: 32 }, { header: "Carpeta", key: "carpeta", width: 48 },
  { header: "Ruta DF", key: "rutaDF", width: 60 }, { header: "Ruta SES", key: "rutaSES", width: 60 },
  { header: "Fuente", key: "fuente", width: 28 }, { header: "Observaciones", key: "observaciones", width: 42 },
];
manifest.addRows([
  { clave: "030716", marca: "Realme", modelo: "Realme GT 8 Pro", carpeta: "realme/030716__realme-gt-8-pro", rutaDF: "realme/030716__realme-gt-8-pro/DF.png", rutaSES: "realme/030716__realme-gt-8-pro/SES.png", fuente: "DeviceSpecifications", observaciones: "Ejemplo; sustituye o elimina esta fila." },
  { clave: "EJEMPLO-2", marca: "Honor", modelo: "Honor 600", carpeta: "honor/EJEMPLO-2__honor-600", rutaDF: "honor/EJEMPLO-2__honor-600/DF.png", rutaSES: "honor/EJEMPLO-2__honor-600/SES.png", fuente: "DeviceSpecifications", observaciones: "Usa la Clave real registrada en TUFIS." },
]);
manifest.autoFilter = { from: "A1", to: "H1" };
manifest.getRow(1).height = 28;
manifest.getRow(1).eachCell((celda) => { celda.font = { bold: true, color: { argb: "FFFFFFFF" } }; celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6B38D4" } }; celda.alignment = { vertical: "middle" }; });
for (let fila = 2; fila <= 501; fila++) {
  for (const columna of [1, 2, 3, 4, 5, 6]) manifest.getCell(fila, columna).dataValidation = { type: "textLength", operator: "greaterThan", formulae: [0], allowBlank: false, showErrorMessage: true, errorTitle: "Dato obligatorio", error: "Completa este campo antes de crear el ZIP." };
}

const instrucciones = libro.addWorksheet("Instrucciones");
instrucciones.columns = [{ key: "seccion", width: 26 }, { key: "detalle", width: 110 }];
instrucciones.addRows([
  ["OBJETIVO", "Relacionar cada producto de TUFIS con dos capturas: DF (Diseño físico) y SES (Sensores)."],
  ["NOMBRE DEL ZIP", "capa-b-marca-AAAA-MM-DD.zip"],
  ["CARPETA", "marca-normalizada/CLAVE__modelo-normalizado"],
  ["ARCHIVO DF", "DF.png, DF.jpg, DF.jpeg o DF.webp. Contiene exclusivamente la sección Diseño físico."],
  ["ARCHIVO SES", "SES.png, SES.jpg, SES.jpeg o SES.webp. Contiene exclusivamente la sección Sensores."],
  ["CLAVE", "Debe coincidir exactamente con la Clave visible del producto en TUFIS."],
  ["NORMALIZACIÓN", "Usa minúsculas, guiones en lugar de espacios y omite acentos, ñ y caracteres especiales en nombres de carpetas."],
  ["UNA MARCA", "Cada ZIP debe contener únicamente modelos de la marca seleccionada en la pantalla de migración."],
  ["VALIDACIÓN", "TUFIS validará archivos, Claves, rutas, duplicados y formatos antes de consumir OpenAI."],
  ["REVISIÓN", "El análisis de IA nunca se guardará automáticamente; todos los campos deberán revisarse y confirmarse."],
  ["ESTRUCTURA", "manifest.xlsx + carpeta de marca + una carpeta por Clave/modelo + DF y SES."],
]);
instrucciones.getColumn(2).alignment = { wrapText: true, vertical: "top" };
instrucciones.getColumn(1).font = { bold: true, color: { argb: "FF5516BE" } };
instrucciones.eachRow((fila) => { fila.height = 34; });

const catalogos = libro.addWorksheet("Catálogos");
catalogos.columns = [{ header: "Código", key: "codigo", width: 18 }, { header: "Nombre", key: "nombre", width: 32 }, { header: "Descripción", key: "descripcion", width: 80 }];
catalogos.addRows([
  { codigo: "DF", nombre: "Diseño físico", descripcion: "Captura de ancho, alto, grosor, peso, volumen, colores, materiales y certificaciones." },
  { codigo: "SES", nombre: "Sensores", descripcion: "Captura de lista de sensores y detalle de huella óptica, ultrasónica u otra." },
  { codigo: "A", nombre: "Ficha técnica A", descripcion: "Datos actuales de pantalla." },
  { codigo: "B", nombre: "Ficha técnica B", descripcion: "Diseño físico y sensores obtenidos de DF y SES." },
  { codigo: "C", nombre: "Ficha técnica C", descripcion: "Geometría física medida del protector real." },
]);
catalogos.getRow(1).eachCell((celda) => { celda.font = { bold: true, color: { argb: "FFFFFFFF" } }; celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6B38D4" } }; });
catalogos.getColumn(3).alignment = { wrapText: true };

await mkdir("referencias", { recursive: true });
await mkdir("public/plantillas", { recursive: true });
await libro.xlsx.writeFile("referencias/plantilla-migracion-fichas-b.xlsx");
await libro.xlsx.writeFile("public/plantillas/plantilla-migracion-fichas-b.xlsx");
console.log("Plantillas XLSX generadas correctamente.");
