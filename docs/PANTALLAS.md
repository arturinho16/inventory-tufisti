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

Incluye búsqueda por clave, descripción, modelo, código universal y Clave MLFull;
filtros por línea, marca y tipo; orden; paginación; exportación y configuración de
columnas. La búsqueda y paginación se ejecutan en servidor.

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

Línea y marca son selectores con acceso al modal de catálogo. Al crear un teléfono
o cristal templado se ofrecerá `Guardar y registrar parámetros de pantalla`.

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

El usuario introduce un modelo de teléfono. El sistema compara su ficha técnica
contra cristales templados con existencia y devuelve las cinco mejores sugerencias
ordenadas por porcentaje de similitud.

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

Incluye búsqueda por clave, modelo o descripción; filtros por tipo, línea y marca;
paginación y acción de detalle. Las especificaciones completas se consultan en el
detalle, no directamente en la tarjeta.

Referencia: `wiki/tufis_registros_de_paralelo_visual/`.

## Navegación compartida

Menú previsto:

- Inventario.
  - Productos.
  - Nuevo producto.
  - Líneas y marcas.
- Smart Match.
  - Buscar cristal.
  - Nuevo registro técnico.
  - Registros.

La navegación debe ser consistente entre las seis vistas y totalmente en español.
