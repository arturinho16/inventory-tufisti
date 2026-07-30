# Arquitectura inicial

## Estructura prevista

```text
src/
├── app/
│   ├── (sistema)/
│   │   ├── inventario/
│   │   ├── productos/nuevo/
│   │   └── paralelo/
│   │       ├── buscar/
│   │       ├── nuevo/
│   │       └── registros/
│   ├── api/
│   │   └── imagenes/
│   └── layout.tsx
├── actions/
├── components/
│   ├── catalogos/
│   ├── inventario/
│   ├── layout/
│   ├── productos/
│   ├── smart-match/
│   └── ui/
├── lib/
│   ├── imagenes/
│   ├── smart-match/
│   └── validaciones/
├── stores/
└── types/
prisma/
├── migrations/
└── seed/
public/
└── imagenes/productos/
tests/
├── integration/
└── unit/
```

## Límites de responsabilidad

- `app`: rutas, layouts, carga inicial y composición.
- `actions`: mutaciones del servidor y autorización futura.
- `components/ui`: primitivas visuales compartidas.
- `components/*`: componentes propios de cada dominio.
- `lib/validaciones`: esquemas de entrada reutilizables.
- `lib/smart-match`: algoritmo puro, pesos, tolerancias y explicaciones.
- `lib/imagenes`: abstracción de almacenamiento de imágenes.
- `stores`: exclusivamente estado efímero de interfaz.
- `prisma`: esquema, migraciones y datos semilla.
- `tests/unit`: fórmula y reglas puras.
- `tests/integration`: persistencia, consultas y flujos completos.

## Orden de construcción

1. Inicializar Next.js y dependencias.
2. Configurar tokens, fuentes y Boxicons.
3. Crear Prisma y el modelo de datos.
4. Implementar layout, navegación y ripple.
5. Implementar inventario.
6. Implementar alta de producto e imágenes.
7. Implementar línea y marca.
8. Implementar especificaciones técnicas.
9. Implementar registros del paralelo.
10. Implementar y probar Smart Match.
11. Verificar responsive, accesibilidad y rendimiento.

