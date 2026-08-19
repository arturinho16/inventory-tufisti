# Modelo de dominio y Smart Match

## Producto

Campos previstos:

- `id`.
- `clave`, obligatoria y única.
- `descripcion`.
- `imagenUrl`.
- `imagenNombre`.
- `imagenMimeType`.
- `imagenTamano`.
- `existencia`, entero no negativo.
- `modelo`.
- `color`.
- `claveMLFull`.
- `codigoUniversal`.
- `tipoProductoId`, relación obligatoria con el catálogo de tipos de producto.
- `lineaId`.
- `marcaId`.
- `ubicaciones`, relación obligatoria de una o más ubicaciones comerciales.
- Fechas de creación y actualización.

## Ubicación comercial

Cada ubicación define `almacen`, `cuentaAsociada`, `marketplace` e imagen o logo
opcional. Los marketplaces iniciales son Mercado Libre, Amazon, Walmart,
TiendaNube y ClaroShop. Un producto se relaciona con una o varias ubicaciones y
puede participar en todos los marketplaces disponibles. Las ubicaciones pueden
editarse; su imagen admite archivo o URL, se copia al almacenamiento local y se
muestra ajustada como miniatura sin deformarse.

`codigoUniversal` puede contener un código interno generado por TUFIS o un GTIN oficial capturado. El código interno se construye de forma determinista a partir de Clave, clave de Línea y clave de Marca. Un número interno nunca se identifica como GTIN oficial.

## Tipo de producto

- `id`.
- `clave`, obligatoria y única.
- `nombre`, obligatorio.
- `categoria`: teléfono, cristal templado u otro. Los tipos creados por el usuario
  comienzan en la categoría `otro` hasta que se configure su comportamiento.
- Fechas de creación y actualización.

El catálogo puede ampliarse sin modificar el esquema de la base de datos. La
categoría técnica determina la participación del producto en Smart Match.

## Línea

- `id`.
- `clave`, obligatoria y única.
- `nombre`, obligatorio.
- Fechas de creación y actualización.

No se debe eliminar una línea con productos asociados sin reasignación o una
confirmación explícita acorde con las reglas de negocio.

## Marca

- `id`.
- `clave`, obligatoria y única.
- `nombre`, obligatorio.
- Fechas de creación y actualización.

Se aplican las mismas restricciones referenciales que para Línea.

## Especificación de pantalla

Una especificación se vincula con un producto. Teléfonos y cristales templados
pueden tenerla. Campos previstos:

- `id`.
- `productoId`, único.
- `clave`.
- `modelo`.
- `lineaId`.
- `marcaId`.
- `tecnologia`.
- `tipoFormaPantalla`.
- `diagonalMm`.
- `diagonalPulgadas`.
- `anchoDisplayMm`.
- `altoDisplayMm`.
- `aspectRatio`.
- `resolucionAnchoPx`.
- `resolucionAltoPx`.
- `densidadPpi`.
- `profundidadColor`.
- `areaDisplayPorcentaje`.
- `cristalFrontal`.
- `refrescoHz`.
- Fechas de creación y actualización.

Clave, modelo, línea y marca se muestran dentro del flujo de especificaciones.
Al seleccionar un producto deben precargarse. Las relaciones son la fuente de
verdad y se debe evitar divergencia entre Producto y EspecificacionPantalla.

## Reglas de unidades

- Ancho y alto se almacenan en milímetros.
- La diagonal admite milímetros y pulgadas; una unidad puede calcularse desde la otra.
- El área del display se maneja exclusivamente como porcentaje.
- `areaDisplayPorcentaje` acepta decimales entre 0 y 100.
- La resolución se persiste como ancho y alto numéricos.
- La frecuencia se almacena en Hz.

## Tipo o forma de pantalla

Opciones iniciales:

- Plana.
- Curva.
- 2.5D.
- 3D.
- Flexible.
- Plegable.
- Otro.

Debe ser ampliable. Si se selecciona Otro, la interfaz permitirá describir la
forma. Una diferencia de forma no excluye automáticamente un candidato de Smart
Match, pero debe reducir la puntuación y mostrarse como incompatibilidad explícita.

## Objetivo de Smart Match

Al introducir un modelo reciente, encontrar los cristales templados que ya existen
en inventario y que más se aproximan a su pantalla. La ficha técnica de un cristal
templado registrado para el modelo buscado funciona como referencia, aunque no
tenga existencia. No se requieren productos de tipo teléfono.

Smart Match compara datos técnicos. No requiere una relación manual previa entre
un teléfono y un cristal.

## Selección de candidatos

El modelo buscado debe:

- Ser un producto tipo cristal templado usado como referencia.
- Tener una EspecificacionPantalla válida.
- Puede tener existencia cero, porque aporta las medidas objetivo.

Los candidatos deben:

- Ser productos tipo cristal templado.
- Tener existencia mayor que cero.
- Tener una EspecificacionPantalla válida.

Smart Match nunca compara ni exige productos de tipo teléfono. El modelo usado
como referencia se excluye siempre de los resultados, incluso cuando existan
varios productos con el mismo nombre de modelo. Las sugerencias deben ser
únicamente modelos alternativos.

Se mostrarán como máximo cinco sugerencias. Si hay menos de cinco candidatos
válidos, se muestran los disponibles.

## Comparación y puntuación

Pesos iniciales, configurables y centralizados:

| Criterio | Peso |
|---|---:|
| Ancho del display | 25% |
| Alto del display | 25% |
| Diagonal | 15% |
| Tipo o forma | 15% |
| Aspect ratio | 10% |
| Área del display | 5% |
| Cristal frontal o tecnología relacionada | 5% |

La puntuación final estará limitada al intervalo 0–100. La fórmula concreta y las
tolerancias deben implementarse como funciones puras, probadas y explicables.
Los pesos podrán ajustarse con datos reales sin modificar los componentes visuales.

## Diferencias e incompatibilidades

Nunca ocultar automáticamente un cristal solo porque la forma sea diferente.
Debe aparecer si queda entre los cinco candidatos mejor puntuados, mostrando:

- Campos coincidentes.
- Campos que se aproximan.
- Campos incompatibles.
- Diferencia de ancho en milímetros.
- Diferencia de alto en milímetros.
- Porcentaje de similitud total.
- Advertencias textuales.

Ejemplo: si las dimensiones son iguales pero el teléfono es curvo y el cristal es
plano, el resultado puede aparecer, pero nunca como coincidencia perfecta. Debe
decir: `La forma no coincide: pantalla curva y cristal plano`.

Estados iniciales:

- 90–100%: alta compatibilidad.
- 75–89%: compatibilidad probable.
- 50–74%: requiere revisión.
- 0–49%: baja compatibilidad.

Además del porcentaje, mostrar uno de estos estados:

- Compatible.
- Compatible con observaciones.
- No recomendado.

El color nunca será la única forma de comunicar el estado.

## Orden de resultados

Orden principal: porcentaje descendente. En caso de empate:

1. Menor diferencia absoluta de ancho.
2. Menor diferencia absoluta de alto.
3. Misma forma de pantalla.
4. Mayor existencia.

## Respuesta de Find Perfect Glass

Cada sugerencia debe incluir:

- Posición entre las cinco sugerencias.
- Imagen del teléfono buscado y del cristal.
- Clave de ambos productos.
- Descripción, modelo, línea y marca del cristal.
- Existencia del cristal.
- Porcentaje de similitud.
- Dimensiones comparadas.
- Diferencias milimétricas.
- Coincidencias.
- Incompatibilidades y advertencias.
- Acción para abrir el producto.

La tolerancia debe ser configuración de dominio, no un número incrustado en JSX.

## Ficha Técnica Full y convivencia con A/B/C — 13 de agosto de 2026

`FichaTecnicaFull` pertenece uno a uno a `Producto`. Almacena la fuente y todas
las secciones como JSON estructurado para no perder campos desconocidos o
repetidos. Sus metadatos mínimos son URL, proveedor, marca fuente, modelo fuente,
diagonal fuente, diferencia de diagonal, resultado de validación, número de
secciones y fechas.

La FTF concentra Display, Design/DF y Sensors/SES. Los datos antiguos A y B se
preservan y pueden complementar la presentación mientras se migra al registro
unificado; un valor existente nunca debe reemplazarse silenciosamente por un valor
vacío o menos específico. La Ficha C no forma parte de la FTF y sigue siendo el
análisis físico independiente del cristal templado.

Paralelo Visual presenta una sola ficha técnica unificada en dos páginas. El
resumen reúne identidad, Display, Design y Sensors, conservando la medición física
del cristal como bloque independiente. La segunda página muestra, sin descartar
campos repetidos o desconocidos, todas las secciones restantes de la FTF. Los
títulos y etiquetas conocidos se presentan en español y los valores técnicos se
conservan exactamente como fueron extraídos de la fuente.

Smart Match mantiene las dimensiones, forma, proporción y área como señales
prioritarias. Cuando referencia y candidato disponen de FTF, también compara cada
campo compartido de sus secciones estructuradas y añade una señal suplementaria
de detalle con peso centralizado. El resultado debe indicar cuántos campos tienen
similitud alta y cuántos requieren revisión; los campos ausentes en uno de los dos
productos no se califican como coincidencia ni se sustituyen con valores inventados.

Las FTF descargadas que no puedan asociarse automáticamente se conservan en una
bandeja persistente de pendientes con su identidad fuente, URL y todas sus
secciones. El operador busca el producto destino por Clave, marca o modelo y
revisa la comparación antes de asociar. Una coincidencia válida se confirma de
forma ordinaria; una identidad que no cumpla los umbrales exige una segunda
confirmación explícita bajo responsabilidad del operador. La decisión y su
diagnóstico quedan auditados, y nunca se reemplaza una FTF existente desde esta
bandeja.

El seguimiento se modela con un lote y sus registros. Cada registro guarda una
copia de los datos comerciales necesarios para crear el producto, estado,
diagnóstico, URL fuente, identidad encontrada, diagonal esperada y encontrada,
intentos y fecha de proceso. Esta persistencia permite retomar pendientes sin
depender de la sesión del navegador ni del archivo temporal.

Cada registro dispone de fecha de disponibilidad y bloqueo. El trabajador reclama
un registro de forma exclusiva y recupera trabajos abandonados.
`ImportacionFtfIntento` conserva cada intento por separado; los diagnósticos
anteriores nunca se sobrescriben.

La identidad FTF exige marca normalizada, similitud de modelo igual o superior a
95 %, mismos tokens críticos de variante y diferencia de diagonal menor o igual a
0.08 pulgadas. La mejor coincidencia se ordena por puntuación de modelo y después
por menor diferencia de diagonal.

DeviceSpecifications es el proveedor primario y SmartGSM el fallback automático.
La FTF conserva el proveedor realmente utilizado y su URL exacta.

La convivencia temporal con `EspecificacionPantalla` se resuelve mediante una
transferencia explícita desde la sección `Display`. Antes del `upsert` se valida
la relación por Clave, identidad de modelo y diagonal. Una FTF incompleta no se
convierte en un registro comparable: queda en revisión hasta obtener los campos
obligatorios. Las dimensiones derivadas de diagonal y proporción son cálculos
deterministas; el porcentaje de área nunca se estima cuando la fuente no lo aporta.

### Estado técnico y edición manual de FTF — 15 de agosto de 2026

La existencia de `FichaTecnicaFull` confirma que la ficha fue descargada y
persistida, pero no confirma por sí sola que esté completa ni que su identidad sea
válida. El estado técnico se calcula con tres comprobaciones independientes:

1. Existe una FTF persistida para el producto.
2. La sección `Display` contiene todos los campos obligatorios para
   `EspecificacionPantalla`.
3. Marca, modelo, tokens críticos de variante y diagonal corresponden al producto
   esperado. Para la diagonal se usa primero el valor normalizado de `Display` y
   sólo como respaldo el metadato `diagonalFuente`.

Una edición manual puede agregar o corregir campos de `Display` en la FTF
persistida. Conserva proveedor y URL originales, vuelve a calcular faltantes y
crea un `ImportacionFtfIntento` con acción `EDICION_MANUAL_FTF`. Completar campos
no aprueba una identidad diferente ni cambia silenciosamente el modelo fuente.

Los intentos fallidos anteriores a una importación completada de la misma Clave
se conservan para auditoría como históricos resueltos. No se eliminan ni se
contabilizan como pendientes activos.

## Universo técnico y asociación manual — 17 de agosto de 2026

La pertenencia a Paralelo Visual se determina desde la categoría técnica
`CRISTAL_TEMPLADO` de `Producto.tipoProducto`; `EspecificacionPantalla` deja de
ser una condición de visibilidad. La relación sigue siendo necesaria para ejecutar
la comparación de medidas, pero un cristal sin ella se muestra con estado técnico
pendiente.

`FichaTecnicaFull` continúa siendo uno a uno con `Producto`. Las fichas descargadas
sin destino seguro se almacenan en `FichaFtfPendiente` con identidad de origen,
diagonal, proveedor, URL, secciones completas, estado, diagnóstico y eventual
producto asociado. Una asociación cambia su estado y conserva la evidencia; no
elimina la fuente pendiente ni la auditoría.

La búsqueda manual consulta por Clave, marca o modelo. Por defecto excluye productos
que ya tengan `FichaTecnicaFull`, pues elegirlos implicaría reemplazar datos. Una
consulta sin resultados no demuestra que el producto no exista: puede significar
que ya tiene FTF. La interfaz debe diferenciar ambos casos y mostrar el producto y
su estado cuando sea útil para el diagnóstico, sin habilitar la asociación ordinaria.

La FTF unificada conserva un arreglo ordenado de secciones y, dentro de cada una,
  campos con múltiples valores. Este contrato no presupone un número fijo de secciones.
  El resumen visual selecciona Display, Design y Sensors; el resto permanece disponible
  en una segunda página. La Ficha C mantiene su relación independiente uno a uno con
  el producto y nunca se rellena con datos comerciales del dispositivo.

## Especificación parcial y cobertura — 18 de agosto de 2026

`EspecificacionPantalla` identifica una liberación excepcional mediante `esParcial`,
`camposOmitidos` y `metadatosCampos`. Diagonal, ancho, alto y proporción permanecen
como mínimo técnico; tecnología, resolución, densidad, profundidad de color y área
pueden ser `null`. Smart Match pondera sólo criterios presentes en ambos productos
y comunica compatibilidad y cobertura por separado.
