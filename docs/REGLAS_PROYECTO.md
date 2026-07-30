# Reglas canónicas del proyecto TUFIS

## Objetivo

Crear un sistema de inventarios enfocado en productos tecnológicos. El primer
alcance cubre inventario, catálogos y Smart Match para reutilizar cristales
templados disponibles en stock entre diferentes modelos de teléfono.

Smart Match debe analizar las medidas y características capturadas para cada
modelo. No depende únicamente de compatibilidades registradas manualmente: debe
descubrir candidatos por comparación técnica.

## Stack obligatorio

- Next.js con App Router y TypeScript.
- Tailwind CSS.
- Zustand para estado temporal de interfaz.
- Prisma ORM.
- PostgreSQL.

Zustand no sustituye al servidor ni a la base de datos. Se usará para filtros
temporales, selección, modales y preferencias de interfaz. Los datos persistentes,
la búsqueda, el orden y la paginación deben resolverse en el servidor.

## Idioma

Todo texto visible para el usuario estará en español, incluyendo:

- Menús y submenús.
- Botones.
- Etiquetas y placeholders.
- Validaciones y mensajes de error.
- Tooltips.
- Estados vacíos y mensajes de carga.
- Encabezados y filtros.

Los nombres internos de librerías o términos técnicos pueden conservar su forma
convencional cuando no sean visibles para el usuario.

## Identificador de productos

- `Clave` es el único identificador interno visible de un producto.
- No existe el campo SKU.
- No usar la palabra SKU en modelos, formularios, búsquedas, tarjetas o tablas.
- La clave debe ser obligatoria y única.

## Productos e imágenes

Todos los productos deben permitir cargar y visualizar una imagen.

La base de datos almacenará metadatos y una referencia al archivo, no el binario
de la imagen. El diseño debe contemplar:

- Selección de archivo.
- Vista previa.
- Sustitución.
- Eliminación antes de guardar.
- Validación de formato y tamaño.
- Estado visual neutro cuando no exista imagen.
- Miniatura en inventario, búsqueda y registros cuando corresponda.

El almacenamiento podrá comenzar localmente en desarrollo, manteniendo una
abstracción que permita migrar a almacenamiento de objetos sin cambiar el dominio.

## Tipos de producto

Tipos iniciales:

- Teléfono.
- Cristal templado.
- Otro.

Los cristales templados son productos completos: tienen clave, descripción,
imagen, existencia, modelo, línea, marca y los demás identificadores aplicables.
Teléfonos y cristales pueden tener una ficha de especificaciones de pantalla.

## Rendimiento

La prioridad absoluta es buscar, filtrar por categoría/línea o marca y comparar
productos con respuesta rápida.

- No cargar todo el inventario en el navegador.
- Usar búsqueda, filtros, orden y paginación en servidor.
- Reflejar filtros relevantes en parámetros de URL.
- Crear índices para clave, descripción, modelo, línea, marca, tipo y códigos.
- Evaluar `pg_trgm` para búsquedas tolerantes en descripción y modelo.
- Evitar consultas N+1.
- Seleccionar únicamente las columnas necesarias.
- Medir el algoritmo Smart Match con volúmenes representativos.

## Diseño obligatorio

La fuente visual principal es `wiki/liquid_neo_soft/DESIGN.md`; los HTML y PNG de
las seis carpetas de `wiki/` sirven como referencia de composición.

- Estética Liquid Glass + Neo-Soft.
- Hanken Grotesk para interfaz.
- JetBrains Mono para medidas y datos técnicos.
- Tarjetas maestras con radio de 40 px.
- Controles interactivos con forma de píldora.
- Superficies de vidrio con desenfoque y borde blanco translúcido.
- Acciones primarias con gradiente morado.
- Estado activo táctil con reducción de escala.
- Efecto ripple global con duración aproximada de 600 ms.
- Iconos Boxicons en variantes Light/Thin.
- No usar Material Symbols en producción aunque aparezcan en el HTML de referencia.
- No inventar colores fuera de los tokens aprobados.

La paleta clara detallada de `wiki/liquid_neo_soft/DESIGN.md` es la base. Los
fondos oscuros se reservan para sidebar o tarjetas de foco cuando la composición
lo requiera.

## Responsividad y accesibilidad

- Mobile first.
- Móvil: cuadrícula de 4 columnas y formularios apilados.
- Tableta: cuadrícula de 8 columnas.
- Escritorio: cuadrícula de 12 columnas.
- Las tablas tendrán desplazamiento horizontal o representación en tarjetas.
- Ningún sidebar debe cubrir el contenido.
- Modales con foco contenido, cierre por teclado y etiquetas accesibles.
- No comunicar estados únicamente mediante color.
- Toda acción tendrá foco visible y nombre accesible.
- Respetar la preferencia de movimiento reducido para ripple y transiciones.

## Componentes compartidos mínimos

- `AppShell`.
- `Sidebar`.
- `BarraSuperior`.
- `NavegacionMovil`.
- `RippleProvider`.
- `GlassCard`.
- `BotonPrimario`.
- Campos y selectores de formulario.
- Selector y vista previa de imagen.
- Modal accesible.
- Barra de búsqueda y filtros.
- Tabla de datos.
- Paginación.
- Tarjeta de producto.
- Tabla de comparación.
- Indicador de compatibilidad.
- Estados de carga, error y ausencia de resultados.

## Criterio de precedencia

Cuando exista una contradicción se aplicará este orden:

1. Decisiones funcionales más recientes documentadas en `docs/`.
2. Reglas del presente documento.
3. Modelo y reglas de Smart Match.
4. Sistema visual de `wiki/liquid_neo_soft/DESIGN.md`.
5. HTML y capturas individuales de `wiki/`.

