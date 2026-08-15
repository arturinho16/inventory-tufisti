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

## Código universal y GTIN

- El código universal interno se deriva de la combinación de Clave, clave de Línea y clave de Marca, incorpora dígito verificador y debe ser único dentro de TUFIS.
- El código interno no se presentará como GTIN oficial ni como identificador global registrado.
- Un GTIN oficial solamente se almacena cuando fue asignado por GS1 al propietario de la marca; la interfaz valida su longitud y dígito verificador.
- Los códigos universales no sustituyen a `Clave` como identificador interno visible del producto.

## Etiquetas e impresión

- Las etiquetas se definen en milímetros y deben conservar dimensiones físicas al imprimir.
- El usuario elige explícitamente los campos y la cantidad de copias.
- Los códigos de barras y QR se generan localmente a partir de los datos persistidos del producto.
- La primera etapa usa el diálogo de impresión del sistema; la impresión silenciosa o directa requerirá un puente local autorizado.
- La impresión directa usa QZ Tray con autorización visible mientras no exista autenticación de usuarios y firma segura en servidor.
- Nunca incluir certificados privados o claves de firma de impresión en el código del navegador.

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

## Estudio de imágenes comerciales con IA

TUFIS incluirá un módulo para generar imágenes comerciales de cristales templados
a partir de una o más fotografías reales del producto. La fotografía original es
siempre la fuente visual de verdad. La IA no debe inventar o alterar el contorno,
las proporciones, perforaciones, bordes, transparencia, color, empaque, marca o
accesorios del cristal.

- El usuario selecciona un producto existente y puede usar su imagen o cargar
  hasta tres referencias: frontal, lateral e instalada o alineada sobre el teléfono.
- El sistema crea una imagen maestra para revisión antes de producir el lote.
- El lote estándar contiene nueve variantes independientes y se presenta en una
  cuadrícula de tres columnas por tres filas en escritorio.
- Cada variante puede aprobarse, rechazarse, descargarse o regenerarse sin volver
  a procesar el lote completo.
- Ninguna imagen generada se considera exacta ni publicable hasta recibir
  aprobación humana explícita.
- Las imágenes aprobadas se guardan mediante la abstracción de almacenamiento de
  imágenes; PostgreSQL conserva metadatos, estados, instrucciones y auditoría, no
  los archivos binarios.
- La generación se ejecuta como trabajo de servidor persistente. Puede continuar
  si el navegador se cierra y debe exponer progreso, error y reintento.
- Las credenciales del proveedor de IA permanecen exclusivamente en el servidor.
- La primera etapa permite revisar y descargar. No modifica publicaciones de
  Mercado Libre.

Para Mercado Libre, el sistema prepara imágenes cuadradas RGB de 1200 × 1200 px,
JPG o PNG y hasta 10 MB. La imagen principal debe usar fondo blanco digitalizado,
mostrar únicamente el producto, carecer de texto, logotipos, marcas de agua y
datos de contacto, y representar exactamente el artículo ofrecido. Antes de una
futura asociación se consulta el máximo permitido por categoría y se ejecuta el
diagnóstico de imágenes de Mercado Libre. Una falla temporal del diagnóstico no
autoriza la publicación automática y debe mostrarse al usuario.

## Respaldo y restauración del inventario

Inventario es el único punto de acceso visible para crear y restaurar respaldos
portátiles. Un respaldo completo incluye todos los productos, aun cuando no
tengan ficha técnica, sus imágenes locales, líneas, marcas, tipos de producto,
formas personalizadas y fichas técnicas existentes. Los respaldos filtrados usan
el mismo formato versionado e incluyen las dependencias necesarias.

La restauración permite elegir recursos, marcas y líneas, conservar o reemplazar
existencias e imágenes y fusionar o reemplazar el inventario. Antes de un
reemplazo completo se crea automáticamente otro respaldo y se exige confirmación
explícita. El archivo valida integridad y nunca incluye variables de entorno,
contraseñas, tokens, claves privadas ni configuración del servidor.

Las programaciones se administran únicamente en Configuración > Respaldos. Se
ejecutan en servidor aunque el navegador esté cerrado, usan la zona horaria
`America/Mexico_City`, guardan los archivos fuera de `public` y aplican retención
sin eliminar la copia válida más reciente. El nombre de cada archivo incluye la
fecha y hora completa hasta milisegundos.

### Etapa 2: estrategia 3-2-1

La segunda etapa de respaldos debe cumplir la regla 3-2-1:

- Mantener al menos tres copias de la información: datos activos y dos respaldos.
- Usar al menos dos medios o sistemas de almacenamiento diferentes.
- Conservar al menos una copia fuera del servidor principal.

El volumen persistente local de la etapa 1 no se considera por sí solo una
estrategia 3-2-1. La etapa 2 añadirá un destino externo configurable, inicialmente
almacenamiento compatible con S3, Cloudflare R2, NAS mediante SFTP o un servidor
secundario. La copia externa utilizará cifrado, verificación de integridad,
reintentos, registro de última sincronización y una política de retención propia.

La interfaz distinguirá claramente entre copia local y copia externa, advertirá
cuando no exista una copia externa vigente y permitirá probar periódicamente la
lectura y restauración. Ningún respaldo externo incluirá secretos o tokens del
sistema y las credenciales del destino permanecerán fuera de los archivos de
respaldo.

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

## Expansión comercial planificada

Después de integrar las ventas de Mercado Libre, el desarrollo comercial y
fiscal continuará conforme a:

- `docs/ROADMAP_COMERCIAL.md`.
- `docs/CLIENTES_Y_CSF.md`.
- `docs/PRODUCTOS_COMERCIALES.md`.
- `docs/COTIZACIONES_Y_FACTURACION.md`.
- `docs/INTEGRACION_FINKOK.md`.
- `docs/PROVEEDORES_Y_COMPRAS.md`.

Estos documentos conservan decisiones aprobadas, pero las reglas funcionales más
recientes incorporadas a `docs/` mantienen la precedencia definida arriba.

## Decisión FTF e importaciones — 13 de agosto de 2026

La Ficha Técnica Full (`FTF`) es el registro técnico unificado del producto y
reemplaza funcionalmente las fichas técnicas A y B sin eliminar ni perder la
información ya capturada. La equivalencia vigente es:

- `Display` corresponde a la antigua Ficha Técnica A.
- `Design` corresponde a `DF` de la antigua Ficha Técnica B.
- `Sensors` corresponde a `SES` de la antigua Ficha Técnica B.
- La Ficha Técnica C continúa separada y pendiente; corresponde al análisis físico
  del cristal templado y no debe suponerse a partir de la FTF del teléfono.

La FTF conserva todas las secciones y campos entregados por la fuente, incluyendo
Memory Cards, Tracking/Positioning, Wi-Fi y Bluetooth. También conserva la URL
exacta de procedencia, proveedor, marca, modelo, diagonal y fecha de extracción.
Los valores se muestran como aparecen en la fuente: no se agregan ceros ni se
reformatea una diagonal, por ejemplo `6.7` no se presenta como `6.70`.

Existen dos operaciones distintas dentro de `Importación por lote y URL`:

1. `Complementar por URL`: para productos existentes. Admite de uno a cinco
   registros y exige Clave, marca, modelo, diagonal y URL en cada registro usado.
2. `Crear desde Excel`: para Claves nuevas. Valida la plantilla completa antes de
   solicitar confirmación, busca la FTF y sólo crea el producto cuando existe una
   coincidencia segura.

Nunca se sobrescribe un producto existente desde el modo Excel. Para complementar
uno existente se compara primero Clave y después marca, modelo y diagonal. La
tolerancia inicial de diagonal es de 0.08 pulgadas. Una variante regional sólo se
acepta cuando la marca y el modelo son compatibles y la diagonal coincide dentro
de la tolerancia.

Los resultados de importación son persistentes. Los estados obligatorios son:
`Validando`, `Validada`, `Buscando`, `No encontrada`, `Revisión`, `Importando`,
`Completada` y `Error`. Un registro no encontrado nunca desaparece ni se crea de
forma parcial: permanece disponible para revisión, captura de URL manual y nuevo
intento. Cada intento conserva mensaje, coincidencia encontrada, URL, diagonales,
contador de intentos y fecha de actualización.

### Proveedores, matching y ejecución persistente — 13 de agosto de 2026

- DeviceSpecifications es la fuente primaria de la búsqueda automática FTF.
- SmartGSM es la fuente alternativa. Sólo se consulta cuando DeviceSpecifications
  está bloqueado, falla o no entrega una coincidencia segura.
- Una ficha alternativa nunca reduce las reglas de identidad: marca normalizada,
  puntuación de modelo mínima de 95 %, igualdad de tokens críticos de variante y
  diferencia de diagonal máxima de 0.08 pulgadas.
- Los tokens críticos iniciales son Pro, Pro+, Plus, Max, Mini, Lite, Ultra, Neo,
  FE, SE, XL, 5G, 4G, CE y GT.
- DeviceSpecifications usa Scrapling en un servicio separado. Las respuestas 403,
  429, captcha o challenge detienen el intento; nunca se evade la verificación.
- TUFIS aplica el mismo intervalo base de `busquedaPhone`: 120 segundos entre
  solicitudes a DeviceSpecifications. El valor puede configurarse mediante
  entorno, pero 120 es el valor productivo y predeterminado.
- Los reintentos técnicos se limitan a errores transitorios. Una respuesta de
  bloqueo o verificación humana se registra y no se intenta evadir.
- Confirmar un Excel sólo encola registros. Un trabajador persistente los procesa
  aunque el navegador se cierre y recupera trabajos interrumpidos.
- PostgreSQL es la fuente de verdad de la cola; ningún lote confirmado depende de
  un JSON o archivo temporal para reanudarse.
- Cada intento es inmutable y conserva acción, estado, proveedor, URL, mensaje,
  identidad encontrada, diagonal, metadatos y fecha.
- Los pendientes permiten corregir modelo y diagonal y reiniciar sólo esa fila.
- El Excel admite una columna opcional `URL FTF`; cuando existe, se valida esa
  fuente antes de ejecutar la búsqueda automática.
- Si una URL admitida no supera el matching, la interfaz muestra las diferencias
  y exige una segunda acción explícita de aprobación manual. Esta decisión se
  guarda como `APROBADA_MANUAL`, con diagnóstico y auditoría, y nunca se presenta
  como coincidencia automática.

### Transferencia de FTF a Paralelo Visual — 14 de agosto de 2026

- Guardar una FTF no crea silenciosamente `EspecificacionPantalla`. La pantalla de
  importación ofrece un paso separado `Pasar a Paralelo` para revisar y confirmar.
- La transferencia localiza primero el producto por Clave y vuelve a comprobar
  marca, modelo, tokens críticos de variante y diagonal máxima de 0.08 pulgadas.
- La diagonal se extrae desde `Display` aunque el metadato `diagonalFuente` haya
  quedado vacío. Nunca se toma una sección de cámara como si fuera `Display`.
- Los valores explícitos de la fuente tienen prioridad. Ancho y alto pueden
  calcularse matemáticamente desde diagonal y proporción; se identifican como
  derivados y no sustituyen una medida explícita más precisa.
- Si falta un dato obligatorio, especialmente el porcentaje de área del display,
  la ficha permanece en Revisión. No se usan ceros, promedios ni valores inventados.
- Un registro técnico existente sólo puede actualizarse mediante una confirmación
  separada y explícita. Nunca se reemplaza con valores vacíos o menos específicos.
- Todo scraping y lectura de enlaces sucede en Seguimiento. Una fila sólo puede
  abandonar ese paso como FTF completa cuando la extracción terminó realmente;
  una respuesta de captcha o verificación no se registra como ficha exitosa.
- `Pasar a Paralelo` no consulta proveedores, URLs ni catálogos. Lee únicamente la
  FTF ya persistida, confirma Clave, modelo, tokens de variante y diagonal y crea
  el registro técnico. Una FTF incompleta permanece en Seguimiento.
- Seguimiento permite editar, guardar o borrar el enlace preferido aun cuando la
  fila esté completada. Validar un enlace nuevo reemplaza la FTF sólo después del
  matching; editar o borrar el enlace por sí solo no elimina la FTF existente.
- Una URL manual de DeviceSpecifications se procesa exclusivamente con Scrapling.
  Nunca activa SmartGSM como fallback ni pierde la preferencia manual si la fuente
  responde con bloqueo o verificación.
- Cada HTML técnico obtenido correctamente se conserva en almacenamiento
  persistente. Una URL de modelo ya descargada se reprocesa desde esa copia local
  y no vuelve a consumir una solicitud externa.

## Alcance consolidado de Importación por lote y URL — 14 de agosto de 2026

La ruta canónica del submódulo es `/automatizacion/importar-url` y pertenece a
`Importación de productos`. Su interfaz se organiza en cuatro pestañas que forman
un solo flujo persistente:

1. `Complementar por URL` agrega o reemplaza la FTF de productos existentes. Cada
   operación admite de uno a cinco productos y entrega un resultado independiente
   por fila; el error de una fila no cancela las demás.
2. `Crear desde Excel` crea únicamente Claves nuevas mediante la plantilla oficial
   `public/plantillas/ftf_nuevo_producto.xlsx`. La validación y la confirmación son
   acciones separadas y validar nunca crea productos ni consume el proveedor FTF.
3. `Seguimiento` es la fuente operativa para consultar lotes, resolver pendientes,
   corregir modelo o diagonal, administrar la URL preferida y consultar el historial
   de intentos. Debe conservar filtros por lote, estado, marca y diagonal, además de
   actualización manual y periódica.
4. `Pasar a Paralelo` convierte de forma explícita una FTF completa ya guardada en
   `EspecificacionPantalla`. No ejecuta scraping y no publica valores incompletos,
   inventados o menos específicos que los existentes.

La plantilla exige Clave, descripción, Línea, existencia, color, Tipo de producto,
Marca, modelo, URL de imagen, diagonal, almacén, cuenta asociada y marketplace. La
columna `URL FTF` es opcional. Los nombres de Línea, Marca y Tipo, así como la
combinación de almacén, cuenta y marketplace, deben existir en los catálogos. La
imagen externa se valida y se copia al almacenamiento administrado por TUFIS antes
de completar la creación del producto.

El estado técnico de una FTF es independiente del estado de procesamiento. La
interfaz distingue textualmente `Sin FTF`, `FTF incompleta`, `Lista para pasar a
Paralelo` y `Ya está en Paralelo`; por tanto, una fila `Completada` en la cola no se
presenta automáticamente como lista para Smart Match.

Los registros confirmados permanecen en PostgreSQL y continúan aunque el navegador
se cierre. El trabajador reclama una sola fila de forma exclusiva, recupera un
bloqueo abandonado, conserva cada intento y actualiza el estado agregado del lote.
El endpoint interno requiere `FTF_WORKER_TOKEN`; este secreto nunca se expone en el
navegador, en archivos de importación ni en respuestas visibles para el usuario.

## Criterios obligatorios de cierre y publicación FTF — 15 de agosto de 2026

El submódulo se considera en estado beta mientras no cumpla todos los criterios
siguientes. Tener la interfaz implementada o lograr que TypeScript compile no es
suficiente para declararlo listo para producción:

- Las pruebas TypeScript de identidad, variantes críticas, diagonal, normalización
  de Display y ubicaciones deben aprobarse.
- Las pruebas del proveedor Scrapling deben comprobar bloqueo inmediato ante HTTP
  403/429 o verificación humana, ausencia de evasión y reintentos limitados sólo
  para errores transitorios. Ningún despliegue se aprueba con estas pruebas fallando.
- Deben aplicarse las migraciones de `FichaTecnicaFull`, seguimiento persistente y
  cola de intentos antes de iniciar la aplicación actualizada.
- Debe ejecutarse al menos un recorrido integral controlado: validar Excel,
  confirmar lote, procesar la cola, crear producto e imagen, guardar FTF, resolver
  una fila pendiente y transferir una FTF completa a Paralelo.
- El recorrido debe incluir una FTF incompleta y verificar que permanezca bloqueada
  para Paralelo, sin ceros ni datos inferidos fuera de las reglas aprobadas.
- Deben verificarse idempotencia, Clave duplicada, recuperación de un trabajador
  interrumpido y conservación del historial de intentos.
- En Docker Compose deben quedar saludables PostgreSQL, migraciones, aplicación,
  proveedor FTF y programador FTF. Después se comprueba una respuesta HTTP correcta
  en `/automatizacion/importar-url`.
- Los cambios de código, migraciones, plantilla y documentación deben quedar
  registrados juntos en control de versiones antes de considerarse respaldados.

Al 15 de agosto de 2026 se verificaron TypeScript, ESLint, las pruebas unitarias
TypeScript y las pruebas Python del proveedor, incluidos HTTP 429 y reintento
transitorio. Docker Compose construyó la aplicación, confirmó las migraciones
contra PostgreSQL y dejó saludables la base de datos, la aplicación y el proveedor
FTF; el programador FTF también se reinició correctamente.

La prueba integral controlada confirmó creación desde la cola, persistencia y
eliminación de la imagen, FTF completa, transferencia a Paralelo, rechazo de una
FTF incompleta y recuperación de un bloqueo abandonado. Estos casos deben
permanecer automatizados y ejecutarse después de cambios futuros en el dominio.
La publicación en un servidor externo seguirá requiriendo comprobar nuevamente
las variables productivas, la salud de los contenedores y la respuesta HTTP de la
ruta después del despliegue correspondiente.
