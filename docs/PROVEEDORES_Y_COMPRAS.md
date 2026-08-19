# Proveedores y compras

## Alcance futuro

El proyecto de facturación usado como referencia no contiene un catálogo real de
proveedores ni un flujo de compras conectado al inventario. Este dominio se
construirá en TUFIS después del flujo de ventas y facturación.

## Proveedor

Campos iniciales previstos:

- RFC.
- Nombre o razón social.
- Nombre comercial.
- Persona de contacto.
- Correo y teléfono.
- Domicilio.
- Condiciones de pago.
- Estado activo o inactivo.

Un proveedor con movimientos no se elimina físicamente.

## Compra

- Serie o folio interno.
- Referencia del documento del proveedor.
- Proveedor.
- Fecha de emisión y recepción.
- Moneda y tipo de cambio.
- Partidas.
- Cantidades solicitadas y recibidas.
- Costos e impuestos.
- Totales.
- Estado e historial.

Estados iniciales:

```text
BORRADOR → ORDENADA → RECIBIDA_PARCIAL → RECIBIDA
                  ↘ CANCELADA
```

## Recepción e inventario

La recepción, no la creación de la compra, aumenta la existencia. Cada recepción
genera movimientos trazables y conserva:

- Producto y Clave.
- Cantidad.
- Costo unitario.
- Proveedor.
- Compra de origen.
- Usuario y fecha.

La política de valoración —último costo, costo promedio u otra— se aprobará antes
de implementar los cálculos.

## Facturas recibidas

La funcionalidad de facturas recibidas del proyecto anterior puede servir en una
etapa posterior para sugerir proveedores o relacionar XML con compras. No
sustituye al catálogo de proveedores ni a la recepción física de mercancía.

