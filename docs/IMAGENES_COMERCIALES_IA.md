# Imágenes comerciales de cristales templados con IA

## Objetivo

Crear una biblioteca de imágenes comerciales a partir de fotografías reales de
un cristal templado, reduciendo la edición manual sin representar características
que el producto no posee. Los resultados se preparan para revisión y eventual uso
en Mercado Libre, pero la primera etapa no modifica publicaciones.

## Fuente visual y fidelidad

La imagen original es la fuente de verdad. Se acepta una referencia y se
recomiendan tres: frontal, lateral e instalada o alineada sobre el teléfono. Antes
de generar, el usuario confirma tipo de cristal, color del borde, transparencia,
perforaciones, compatibilidad y disponibilidad de empaque.

La IA no puede inventar marcas, textos, empaques, accesorios, cámaras,
perforaciones ni propiedades técnicas. Cuando una característica no pueda
determinarse, se solicita confirmación o se omite de la escena. Todas las imágenes
requieren aprobación humana individual.

## Lote estándar

El proyecto crea primero una imagen maestra aprobable. Después genera nueve
trabajos independientes:

1. Producto aislado con fondo blanco digitalizado.
2. Vista frontal elevada.
3. Vista a 45 grados.
4. Vista lateral que muestre grosor y borde.
5. Acercamiento a perforaciones y recortes.
6. Alineación sobre el teléfono compatible.
7. Producto sobre mesa técnica limpia.
8. Escena de instalación con una mano.
9. Composición con teléfono y empaque, solo si existen esas referencias.

Cada trabajo conserva referencia al producto, fuentes, plantilla, instrucciones,
proveedor, modelo, estado, intentos, archivo, aprobación, error y fechas. Se puede
regenerar individualmente.

## Estados

- Borrador.
- Analizando referencias.
- Esperando aprobación de imagen maestra.
- En cola.
- Generando.
- Generada.
- Aprobada.
- Rechazada.
- Error.

## Preparación para Mercado Libre

Los archivos de salida serán JPG o PNG RGB, cuadrados, de 1200 × 1200 px y no
mayores a 10 MB. La imagen principal muestra solamente el producto sobre fondo
blanco, sin texto, logos, marcas de agua ni contacto. Debe ocupar visualmente el
espacio disponible sin recortes engañosos.

TUFIS genera nueve recursos, pero solo permite seleccionar para una publicación
la cantidad admitida por su categoría. Antes de una integración de escritura se
deberá ejecutar el diagnóstico oficial de imágenes, mostrar sus observaciones y
pedir confirmación explícita. El fallo del diagnóstico no se interpreta como una
validación exitosa.

## Etapas

### Etapa 1

Selección de producto, carga de referencias, generación persistente, revisión
3 × 3, regeneración individual, aprobación y descarga.

### Etapa 2

Validación mediante el diagnóstico de Mercado Libre, consulta del máximo de
imágenes por categoría y preparación de una selección ordenada.

### Etapa 3

Asociación explícita con una publicación. Antes de reemplazar imágenes conserva
el listado vigente, solicita confirmación, registra auditoría y permite recuperar
la selección anterior cuando la API lo admita.

## Criterios de aceptación de la primera etapa

- El navegador puede cerrarse sin cancelar trabajos persistidos.
- Un error en una variante no invalida las demás.
- Se distingue siempre una imagen original de una generada.
- Ningún archivo se publica automáticamente.
- El usuario puede aprobar, rechazar, regenerar y descargar por separado.
- Las credenciales y prompts internos del servidor no se entregan al navegador.
- La interfaz completa está en español, es accesible y responsiva.
