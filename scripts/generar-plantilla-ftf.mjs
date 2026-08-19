import ExcelJS from "exceljs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const origen = path.join(process.cwd(), "referencias", "fichaABC", "ftf_nuevo_producto.xlsx");
const destino = path.join(process.cwd(), "public", "plantillas", "ftf_nuevo_producto.xlsx");
const libro = new ExcelJS.Workbook();
await libro.xlsx.readFile(origen);
const datos = libro.worksheets[0];
datos.name = "Productos FTF";
datos.getRow(1).values = ["Clave", "Descripcion", "linea", "existencia", "Color", "Tipo de producto", "Marca", "Modelo", "imagenurl", "Tamaño en pantalla", "almacenubicacion", "cuentaasociada", "marketplace", "URL FTF"];
datos.views = [{ state: "frozen", ySplit: 1 }];
datos.autoFilter = { from: "A1", to: "N1" };
datos.getRow(1).height = 28;
datos.getRow(1).eachCell((celda) => { celda.font = { bold: true, color: { argb: "FFFFFFFF" } }; celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6750A4" } }; celda.alignment = { vertical: "middle", horizontal: "center" }; });
[14, 38, 30, 12, 16, 26, 18, 28, 52, 20, 24, 24, 20, 55].forEach((ancho, indice) => { datos.getColumn(indice + 1).width = ancho; });
let instrucciones = libro.getWorksheet("Instrucciones") ?? libro.addWorksheet("Instrucciones");
instrucciones.spliceRows(1, instrucciones.rowCount);
const lineas = [
  ["PLANTILLA PARA CREAR PRODUCTOS Y SU FTF"],
  ["No cambies los encabezados de la hoja Productos FTF."],
  ["Todos los campos salvo URL FTF son obligatorios. Clave debe ser única y no existir en el sistema."],
  ["Línea, Tipo de producto, Marca, almacén, cuenta y marketplace deben coincidir con los catálogos del sistema."],
  ["Tamaño en pantalla se captura en pulgadas y se usa para validar la ficha encontrada."],
  ["imagenurl debe ser una dirección HTTP/HTTPS directa a una imagen JPG, PNG o WebP."],
  ["El modo Excel busca la FTF automáticamente por marca, modelo y diagonal."],
  ["URL FTF es opcional. Si se captura, se valida esa ficha antes de intentar la búsqueda automática."],
  ["Primero valida el archivo. Sólo el botón de confirmación crea productos."],
  ["Si no se encuentra una coincidencia segura, la fila queda en Revisión y no se crea."],
  ["Para una Clave que ya existe, usa Complementar por URL."],
];
instrucciones.addRows(lineas);
instrucciones.getColumn(1).width = 115;
instrucciones.getRow(1).height = 30;
instrucciones.getRow(1).getCell(1).font = { bold: true, size: 16, color: { argb: "FF6750A4" } };
for (let fila = 2; fila <= instrucciones.rowCount; fila++) instrucciones.getRow(fila).getCell(1).alignment = { wrapText: true, vertical: "top" };
await mkdir(path.dirname(destino), { recursive: true });
await libro.xlsx.writeFile(destino);
console.log(destino);
