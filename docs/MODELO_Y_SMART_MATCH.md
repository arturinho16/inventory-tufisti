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
- Fechas de creación y actualización.

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

Al introducir el modelo de un teléfono, encontrar los cristales templados que ya
existen en inventario y que más se aproximan a su pantalla. Esto permite reutilizar
stock originalmente registrado para otros modelos.

Smart Match compara datos técnicos. No requiere una relación manual previa entre
un teléfono y un cristal.

## Selección de candidatos

El modelo buscado debe:

- Ser un producto tipo teléfono.
- Tener una EspecificacionPantalla válida.

Los candidatos deben:

- Ser productos tipo cristal templado.
- Tener existencia mayor que cero.
- Tener una EspecificacionPantalla válida.

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
