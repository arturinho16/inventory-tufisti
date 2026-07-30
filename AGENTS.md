# Instrucciones del proyecto TUFIS

Antes de diseñar, implementar o modificar cualquier módulo, leer en este orden:

1. `docs/REGLAS_PROYECTO.md`
2. `docs/MODELO_Y_SMART_MATCH.md`
3. `docs/PANTALLAS.md`
4. `docs/ARQUITECTURA.md`
5. `wiki/liquid_neo_soft/DESIGN.md`

Los documentos de `docs/` son la fuente funcional canónica. Los HTML y PNG de
`wiki/` son referencias visuales, no código de producción. Si una referencia de
`wiki/` contradice una regla de `docs/`, prevalece la regla de `docs/`.

Reglas obligatorias:

- Toda la interfaz debe estar en español.
- Usar Next.js App Router, TypeScript, Tailwind CSS, Zustand, Prisma y PostgreSQL.
- Usar únicamente `Clave`; no crear ni mostrar campos llamados SKU.
- Todos los productos deben admitir una imagen.
- Los cristales templados también son productos y participan en Smart Match.
- La prioridad técnica es la rapidez de búsqueda, filtrado y comparación.
- No inventar colores, geometrías o tipografías fuera del sistema de diseño.
- Usar Boxicons Light/Thin; reemplazar Material Symbols de las referencias.
- Mantener componentes reutilizables, accesibles y completamente responsivos.

