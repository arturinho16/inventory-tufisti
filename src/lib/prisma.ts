import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });

const clienteEnCacheEsActual = globalPrisma.prisma && "formaPantallaPersonalizada" in globalPrisma.prisma;

export const prisma = clienteEnCacheEsActual ? globalPrisma.prisma! : new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalPrisma.prisma = prisma;
