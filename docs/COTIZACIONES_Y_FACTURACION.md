# Cotizaciones y facturación

## Cotizaciones

Una cotización contiene:

- Serie y folio únicos.
- Cliente.
- Fecha y vigencia.
- Moneda y tipo de cambio.
- Condiciones comerciales y notas.
- Partidas de productos.
- Cantidad, precio, descuento e impuestos por partida.
- Subtotal, descuentos, impuestos y total.
- Historial de estados y envíos.

Estados iniciales:

```text
BORRADOR → ENVIADA → ACEPTADA → CONVERTIDA
                   ↘ RECHAZADA
                   ↘ VENCIDA
```

También puede existir el estado `CANCELADA` conforme a las reglas que se definan.

## Partidas como instantánea histórica

Cada partida conserva los datos aplicados al crearla:

- Producto y Clave.
- Descripción comercial.
- Precio unitario.
- Descuento.
- Datos fiscales SAT.
- Impuestos.

Los cambios posteriores del catálogo no modifican documentos históricos.

## Conversión a factura

La conversión se ejecuta en el servidor y de forma transaccional:

1. Validar que la cotización pueda convertirse.
2. Crear una factura en estado `BORRADOR`.
3. Copiar cliente, partidas, montos y datos fiscales.
4. Relacionar factura y cotización.
5. Permitir una revisión fiscal final.
6. Timbrar solamente mediante una acción explícita.
7. Marcar la cotización como `CONVERTIDA` cuando el resultado sea consistente.

Una falla del PAC no convierte la cotización ni elimina el borrador recuperable.

## Factura

Estados mínimos:

- `BORRADOR`.
- `EN_PROCESO`.
- `TIMBRADA`.
- `ERROR_TIMBRADO`.
- `CANCELACION_PENDIENTE`.
- `CANCELADA`.

El sistema debe impedir editar los datos fiscales de una factura timbrada.

## Cálculos

- Todos los cálculos definitivos se realizan y validan en el servidor.
- Se utilizan decimales seguros; no se depende de aritmética binaria con `Number`
  para resultados monetarios.
- Los redondeos se centralizan y se prueban.
- Las partidas y totales deben coincidir antes de generar el XML.

## PDF y correo

- La cotización y la factura tienen plantillas separadas.
- Los PDF se generan en el servidor.
- La factura timbrada se envía con XML y PDF.
- Se registra destinatario, fecha, estado, error e intentos.
- No se acepta un PDF Base64 producido por el navegador como fuente definitiva.
- Los textos introducidos por usuarios se escapan antes de formar correos HTML.

## Piezas reutilizables del proyecto anterior

Se adapta la intención de los modelos `Cotizacion`, `ConceptoCotizacion`,
`Factura` y `ConceptoFactura`, así como la relación entre cotización y factura.
No se copian sin cambios porque requieren validaciones, transiciones controladas,
cálculo decimal, paginación en servidor y auditoría.

