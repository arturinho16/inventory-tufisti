# Alcance de las seis pantallas

## 1. Inventario general

Ruta prevista: `/inventario`.

Columnas:

- Imagen.
- Clave.
- Descripción.
- Línea.
- Existencia.
- Modelo.
- Marca.
- Color.
- Clave MLFull.
- Código universal.
- Ubicaciones y marketplaces, con al menos una selección obligatoria.

Incluye búsqueda por clave, descripción, modelo, código universal y Clave MLFull;
filtros múltiples de aplicación inmediata por línea, marca, modelo, tipo y tamaño
de pantalla en pulgadas; orden; paginación; exportación y configuración de
columnas. La búsqueda y paginación se ejecutan en servidor.

La cabecera concentra el módulo único de respaldos del inventario. Permite crear
un archivo completo o filtrado por marca, línea y presencia de ficha técnica,
incluyendo productos sin ficha e imágenes locales. El mismo archivo admite una
restauración total o selectiva de productos, imágenes, fichas y catálogos. Las
dependencias de los productos seleccionados se incluyen automáticamente. Antes
de reemplazar todo el inventario se genera un respaldo automático y se exige una
confirmación explícita.

Referencia: `wiki/tufis_inventario_general/`.

## 2. Nuevo producto

Ruta prevista: `/productos/nuevo`.

Campos:

- Imagen.
- Clave.
- Descripción.
- Tipo de producto.
- Línea.
- Existencia.
- Modelo.
- Marca.
- Color.
- Clave MLFull.
- Código universal.

Línea y marca son selectores con acceso al modal de catálogo. Al crear un producto
de la línea `Cristal templado para celular`, después de guardarlo se redirige
siempre al registro de parámetros de pantalla.

Una imagen cargada o indicada mediante URL se copia al almacenamiento local con
un nombre legible derivado de `Clave-modelo`. La base de datos conserva la ruta
local para que el producto no dependa de la disponibilidad del sitio externo.

Referencia: `wiki/tufis_nuevo_producto/`.

## 3. Alta de línea y marca

Componente modal reutilizable, accesible desde Producto, Registro técnico y
Catálogos.

Alta de línea:

- Clave.
- Nombre.

Alta de marca:

- Clave.
- Nombre.

Los formularios son independientes. Crear uno no obliga a completar el otro. El
nuevo valor se selecciona automáticamente en el formulario que abrió el modal.

La pantalla de catálogos también permite crear tipos de producto mediante Clave y
Nombre. Las líneas, marcas y tipos creados quedan disponibles en el formulario de
producto. Estas altas se realizan desde Catálogos, no desde Nuevo producto.

Referencia: `wiki/tufis_alta_de_l_nea_y_marca/`.

## 4. Registro técnico de pantalla

Ruta prevista: `/paralelo/nuevo`.

Identificación:

- Producto e imagen.
- Clave.
- Modelo.
- Línea.
- Marca.
- Tipo de producto.

Parámetros:

- Tecnología.
- Tipo o forma de pantalla.
- Diagonal en milímetros y pulgadas.
- Ancho del display en milímetros.
- Alto del display en milímetros.
- Aspect ratio.
- Resolución.
- Densidad en ppi.
- Profundidad de color.
- Área del display en porcentaje.
- Cristal frontal.
- Frecuencia de refresco en Hz.

Referencia: `wiki/tufis_registro_t_cnico_de_pantalla/`.

## 5. Find Perfect Glass

Ruta prevista: `/paralelo/buscar`.

El usuario introduce un modelo reciente. El sistema toma como objetivo la ficha
técnica de un cristal templado registrado para ese modelo y la compara contra
cristales templados con existencia. Devuelve las cinco mejores sugerencias
ordenadas por porcentaje de similitud. No requiere productos de tipo teléfono.
El mismo modelo buscado nunca aparece entre las sugerencias.

Debe mostrar por candidato:

- Imágenes y claves.
- Datos del cristal y existencia.
- Porcentaje.
- Dimensiones lado a lado.
- Diferencias en milímetros.
- Coincidencias.
- Incompatibilidades explícitas.
- Estado y acción de detalle.

Una forma diferente no elimina el candidato; se muestra como advertencia y reduce
la puntuación.

Referencia: `wiki/tufis_b_squeda_inteligente_match/`.

## 6. Registros del paralelo visual

Ruta prevista: `/paralelo/registros`.

Cada tarjeta muestra únicamente:

- Imagen.
- Clave.
- Descripción.

Incluye búsqueda por clave, modelo o descripción; filtros múltiples de aplicación inmediata por marca, modelo y diagonal en pulgadas;
paginación y acción de detalle. Las especificaciones completas se consultan en el
detalle, no directamente en la tarjeta.

El filtro de tamaño incorpora búsqueda dentro de sus opciones. Todos los
desplegables se cierran después de marcar o desmarcar una opción para no cubrir
los resultados actualizados.

Referencia: `wiki/tufis_registros_de_paralelo_visual/`.

## 7. Creación código universal

Ruta prevista: `/codigos-universales`.

Permite buscar productos y:

- Generar un código universal interno numérico basado en Clave, clave de Línea y clave de Marca.
- Validar y registrar un GTIN oficial de 8, 12, 13 o 14 dígitos.
- Distinguir claramente los códigos internos de los GTIN oficiales.
- Evitar códigos duplicados entre productos.

El código interno incluye dígito verificador, pero no se presenta como GTIN registrado globalmente.

## 8. Diseño e impresión de etiquetas

Antes de imprimir, el editor valida que todos los elementos permanezcan dentro
del margen seguro, no se superpongan y que los códigos conserven un tamaño
legible. Los campos con error se marcan en rojo y la impresión directa se
bloquea hasta corregirlos. Los textos que no caben en su caja muestran una
advertencia de posible recorte.

Ruta prevista: `/etiquetas`.

Permite buscar y seleccionar un producto sin cargar todo el inventario en el navegador. El editor ofrece:

- Tamaños físicos de etiqueta predefinidos en milímetros.
- Campos de modelo, Clave, descripción, código universal, línea y marca.
- Código de barras EAN-13 cuando corresponda o Code 128 para valores alfanuméricos.
- Código QR.
- Posicionamiento de campos mediante arrastre.
- Ajuste de ancho, alto y tamaño de texto, además de eliminación de elementos.
- Vista grande editable sin sustituir la vista previa principal.
- Margen seguro configurable en milímetros que limita el arrastre y evita contenido fuera del área imprimible.
- Cantidad de copias y vista previa antes de imprimir.
- Impresión mediante el diálogo del sistema con escala de 100 % y sin márgenes.
- Conexión local con QZ Tray, descubrimiento de impresoras y envío directo mediante ZPL, EPL o TSPL.
- Selección de resolución entre 203, 300 y 600 DPI.

El estado no guardado del editor es temporal y se administra con Zustand.

En móvil el editor se organiza como espacio de trabajo por herramientas: Campos, Diseño y ajustes, e Imprimir. Solo se muestra el panel activo para evitar desplazamientos extensos y controles dispersos. En escritorio se utiliza una superficie maestra con columnas y divisores internos.

## 9. Importación por lotes

Ruta prevista: `/automatizacion/importar`.

El usuario carga un Excel `.xlsx` y un ZIP con las fichas técnicas. El flujo se divide en cuatro pasos:

1. Cargar y validar columnas, Claves, catálogos, rutas e imágenes sin consumir OpenAI ni modificar PostgreSQL.
2. Analizar las fichas únicamente cuando no existan errores bloqueantes.
3. Revisar y modificar los datos técnicos extraídos.
4. Confirmar la creación o actualización transaccional de productos y especificaciones.

Los errores indican fila, Clave, modelo y corrección requerida. Las Claves existentes se presentan como advertencia y se actualizan de manera idempotente. Los archivos temporales confirmados se eliminan y los lotes abandonados caducan después de siete días.

## 10. Estudio de imágenes con IA

Ruta prevista: `/automatizacion/imagenes`.

Permite seleccionar un cristal templado existente, usar su imagen o cargar hasta
tres fotografías de referencia y producir un lote comercial sin editar
manualmente cada composición. El flujo se divide en cuatro pasos:

1. Seleccionar producto y fotografías de muestra.
2. Confirmar características visuales y las escenas solicitadas.
3. Revisar y aprobar una imagen maestra, y generar nueve variantes.
4. Revisar, aprobar, rechazar, regenerar o descargar cada resultado.

Las escenas iniciales son: producto aislado sobre fondo blanco, frontal elevada,
ángulo de 45 grados, lateral para mostrar grosor, detalle de perforaciones,
alineación sobre teléfono compatible, mesa técnica, escena de instalación y
composición con teléfono y empaque cuando esas referencias estén disponibles.
Una escena no puede incluir elementos no aportados o confirmados por el usuario.

La revisión usa una cuadrícula 3 × 3 en escritorio y tarjetas apiladas en móvil.
Cada tarjeta muestra miniatura, escena, estado, acción `+` para vista completa,
aprobar, rechazar, regenerar únicamente esa variante y descargar. También permite
elegir una imagen principal, muestra advertencias de exactitud y separa claramente
las imágenes originales de las generadas.

La primera etapa no publica ni reemplaza imágenes en Mercado Libre. Una etapa
posterior requerirá confirmación explícita, respaldo de las imágenes vigentes,
validación por categoría, diagnóstico de Mercado Libre y auditoría.

## Navegación compartida

Menú previsto:

- Automatización.
  - Importación por lotes.
  - Estudio de imágenes con IA.

- Inventario.
  - Productos.
  - Nuevo producto.
  - Líneas y marcas.
  - Creación código universal.
  - Diseño e impresión de etiquetas.
  - Ubicaciones.
- Smart Match.
  - Buscar cristal.
  - Nuevo registro técnico.
  - Registros.
- Configuración.
- Configuración > Mercado Libre: estado de la cuenta vendedora, conexión, reconexión y desconexión segura.
- Cuenta de Mercado Libre: muestra el apodo de la cuenta conectada y ofrece
  consultas de solo lectura para Publicaciones, Ventas, Envíos y Productos.
  Cada sección ocupa el área completa de trabajo y Productos muestra exactamente
  20 registros por página, distribuidos en cuatro columnas y cinco filas en
  escritorio. Su paginación agrupa diez números, permite avanzar al siguiente
  bloque y ofrece accesos directos al inicio y a la última página. Productos admite búsqueda y filtros por marca,
  logística y estado, además de ordenar conjuntamente por unidades vendidas de
  forma ascendente o descendente. Usa tarjetas compactas de altura uniforme,
  recorta visualmente los títulos largos y muestra el nombre completo mediante
  una acción de detalle. También muestra Clave ML, existencia, ventas acumuladas,
  logística L/F e imagen local. Estas vistas no vinculan productos con el inventario ni
  modifican existencias hasta que se aprueben las reglas de sincronización.
  - Panel general.
  - Respaldos.

## Respaldos programados

Ruta: `/configuracion/respaldos`.

Permite crear, editar, pausar, activar y eliminar programaciones diarias o
semanales en la zona `America/Mexico_City`. Cada programación define hora,
minuto, filtros de marca y línea, inclusión de productos con o sin ficha,
imágenes y cantidad de copias a conservar. La pantalla muestra el historial,
estado, nombre completo del archivo, fecha, tamaño y error cuando corresponda.

Los archivos se guardan fuera de `public` en un volumen persistente privado. El
nombre incorpora año, mes, día, hora, minuto, segundo y milisegundos. La
ejecución no depende del navegador: un proceso separado consulta cada minuto y
el servidor evita duplicados para la misma programación y período.

## Panel general de configuración

Ruta: `/configuracion`.

Es el punto de entrada extensible para la configuración de los módulos. Sólo
muestra módulos realmente disponibles; inicialmente enlaza a Respaldos. En
escritorio, Configuración es un submenú contraíble del sidebar, con accesos al
Panel general y a Respaldos. En móvil existe un acceso directo al Panel general.

La navegación debe ser consistente entre las seis vistas y totalmente en español.

## Importación por lote y URL — 13 de agosto de 2026

Ruta: `/automatizacion/importar-url`.

La pantalla usa el sistema Liquid Glass + Neo-Soft del resto de la aplicación y
se divide en cuatro pestañas responsivas:

- `Complementar por URL`: formulario de una a cinco filas. Cada fila exige Clave,
  marca, modelo, diagonal y URL. El avance y el resultado se muestran por producto.
- `Crear desde Excel`: descarga de plantilla, carga, validación previa, tabla de
  errores y confirmación separada para crear productos y FTF.
- `Seguimiento`: historial persistente con filtros por lote, estado, marca y
  diagonal; muestra Clave, modelo, diagonal esperada, estado textual, diagnóstico,
  coincidencia encontrada, URL fuente e intentos.

En Seguimiento, los pendientes permiten pegar o corregir una URL y revalidar el
registro. La tabla se actualiza periódicamente y dispone también de actualización
manual. Los filtros nunca deben eliminarse al ampliar esta pantalla. Ningún estado
se comunica únicamente mediante color.

Toda fila vinculada con una FTF persistida muestra la confirmación textual
`FTF descargada`, una acción circular `+` para abrir un visor accesible y una
acción `Editar`. El visor presenta proveedor, URL y todas las secciones plegables;
Display inicia abierto. El editor permite agregar o corregir los campos de
Display, muestra los faltantes restantes después de guardar y no vuelve a
consultar al proveedor.

La plantilla oficial es `public/plantillas/ftf_nuevo_producto.xlsx`. Todos sus
campos son obligatorios; Línea, Marca, Tipo de producto, almacén, cuenta asociada y
marketplace deben coincidir con los catálogos del sistema. La validación no crea
productos. La creación comienza únicamente después de la confirmación explícita.

Después de confirmar, la pantalla informa que los registros quedaron en cola y
permite abandonarla sin cancelar el proceso. Seguimiento refleja el trabajo del
servidor y conserva los intentos sin reemplazar diagnósticos anteriores. La fuente
mostrada corresponde a DeviceSpecifications o SmartGSM según la coincidencia
finalmente validada.

El paso de revisión permite corregir modelo y diagonal esperados para reiniciar
una sola fila. También permite validar una URL directa y, si el matching la
rechaza, muestra una acción separada `Aprobar bajo mi responsabilidad`. La acción
manual conserva las diferencias y queda auditada; nunca se ejecuta con el mismo
botón de validación automática.

La cuarta pestaña `Pasar a Paralelo` presenta únicamente las FTF descargadas,
completas y con identidad válida como un asistente
de siete comprobaciones: localizar por Clave, validar modelo, extraer diagonal,
aplicar tolerancia, revisar campos, guardar sin pérdida y publicar en Paralelo.
Cada tarjeta muestra identidad, proveedor, diagonales y los principales datos de
Display. Distingue textualmente entre Lista y Ya está en Paralelo. Actualizar un
registro técnico existente exige una acción explícita diferente.

`Pasar a Paralelo` nunca ejecuta scraping. Las fichas completas muestran la acción
`Validar FTF guardada y pasar a Paralelo`; ésta compara identidad y diagonal usando
PostgreSQL y guarda el registro técnico. Las incompletas o con identidad inválida
no aparecen en esta pestaña: permanecen en Seguimiento, donde se muestran sus
faltantes o diferencias y pueden corregirse sin repetir el scraping.

En Seguimiento, todas las filas —incluidas las completadas— muestran el enlace
preferido editable y las acciones `Guardar enlace`, `Borrar enlace` y `Validar y
reemplazar FTF`. Borrar el enlace conserva la ficha ya extraída. Guardar sólo fija
la preferencia; la sustitución técnica ocurre con la acción de validación.

La columna `Estado técnico` es independiente del estado de proceso y muestra uno
de cuatro resultados: `Sin FTF`, `FTF incompleta`, `Lista para pasar a Paralelo`
o `Ya está en Paralelo`. Cuando la ficha está incompleta enumera los campos que
faltan, de modo que `Completada` en la cola nunca se confunda con lista técnica.
Los intentos fallidos antiguos de una Clave que posteriormente quedó completada se
muestran como `Histórico resuelto` y no incrementan el contador de pendientes.
