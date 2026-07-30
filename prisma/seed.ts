import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { CategoriaProducto, PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const marcas = ["Ugreen", "Baseus", "Asus", "Honor", "OnePlus", "Oppo", "Realme", "Umidigi", "Vivo", "Xiaomi", "Google", "Huawei", "Pocophone", "8BitDo", "Eurcool", "King Vaga", "Nothing", "Apple", "Motorola", "Lenovo", "Vention", "Orico", "Nubia", "Zuidid", "Tufis-Electronic", "Infinix", "Essager", "Hagibis"];
const lineas = ["Accesorios para celular", "Accesorios para tablet", "Accesorios para cómputo", "Cristal templado para celular", "Funda para celular", "Combo CF", "Accesorios para audio y video", "Smartphone", "Accesorios para automóvil", "Accesorios para smartwatch", "Game pad y accesorios", "Mochila Backpack", "Diurex", "Funda y/o mochila para consola portátil", "Cristal templado para consola gamer"];

async function main() {
  await Promise.all(marcas.map((nombre, indice) => prisma.marca.upsert({ where: { clave: `M-${String(indice + 1).padStart(3, "0")}` }, update: { nombre }, create: { clave: `M-${String(indice + 1).padStart(3, "0")}`, nombre } })));
  await Promise.all(lineas.map((nombre, indice) => prisma.linea.upsert({ where: { clave: `L-${String(indice + 1).padStart(3, "0")}` }, update: { nombre }, create: { clave: `L-${String(indice + 1).padStart(3, "0")}`, nombre } })));
  await prisma.tipoProducto.upsert({ where: { clave: "TELEFONO" }, update: {}, create: { clave: "TELEFONO", nombre: "Teléfono", categoria: CategoriaProducto.TELEFONO } });
  await prisma.tipoProducto.upsert({ where: { clave: "CRISTAL_TEMPLADO" }, update: {}, create: { clave: "CRISTAL_TEMPLADO", nombre: "Cristal templado", categoria: CategoriaProducto.CRISTAL_TEMPLADO } });
  await prisma.tipoProducto.upsert({ where: { clave: "OTRO" }, update: {}, create: { clave: "OTRO", nombre: "Otro", categoria: CategoriaProducto.OTRO } });
}

main().finally(() => prisma.$disconnect());
