# Productos comerciales

## Decisión principal

TUFIS mantiene un solo producto como fuente de verdad. No se crearán un producto
de inventario y otro comercial. Las diferentes pantallas son proyecciones del
mismo registro y consultan únicamente los datos necesarios.

```text
                         Producto
                            │
          ┌─────────────────┼─────────────────┐
          ↓                 ↓                 ↓
     Inventario       Vista técnica     Vista comercial
```

## Inventario

La ruta `/inventario` mantiene el catálogo sencillo y no muestra montos.

- Imagen.
- Clave.
- Descripción.
- Línea.
- Marca.
- Modelo.
- Color.
- Existencia.
- Código universal.

## Vista técnica

Smart Match, los registros técnicos y el detalle técnico muestran medidas y
características sin costos ni precios.

- Imagen y Clave.
- Marca y modelo.
- Diagonal, ancho y alto.
- Forma y tecnología de pantalla.
- Resto de especificaciones disponibles.
- Existencia solamente cuando sea útil para el flujo.

## Catálogo comercial

Ruta prevista: `/comercial/productos`.

- Imagen, Clave y descripción comercial.
- Existencia disponible.
- Costo consultable según permisos.
- Precio de venta vigente.
- Precio con impuestos.
- Margen o utilidad según permisos.
- IVA e IEPS cuando aplique.
- Clave SAT de producto o servicio.
- Clave SAT de unidad.
- Unidad.
- Objeto de impuesto.
- Estado de configuración comercial.
- Fecha de actualización del precio.

Filtros previstos:

- Sin precio.
- Sin costo.
- Sin datos SAT.
- Margen bajo.
- Listos para cotizar.
- Línea, marca y tipo de producto.

## Persistencia prevista

Los campos de identidad e inventario permanecen en `Producto`. Los datos que
cambian o tienen ciclo propio se modelarán de forma separada:

```text
Producto
├── EspecificacionPantalla
├── ConfiguracionFiscalProducto
├── PrecioProducto
├── HistorialPrecio
├── HistorialCosto
└── MovimientosInventario
```

La forma final se definirá antes de la migración para evitar relaciones
innecesarias. Los precios y costos históricos no se sobrescriben.

## Estados comerciales

- `SIN_CONFIGURAR`.
- `PRECIO_PENDIENTE`.
- `DATOS_FISCALES_PENDIENTES`.
- `LISTO_PARA_COTIZAR`.
- `LISTO_PARA_FACTURAR`.

Un cristal sin información comercial puede existir, tener inventario y participar
en Smart Match. Su uso en una cotización se bloquea o solicita un precio especial,
según la política que se apruebe posteriormente.

## Seguridad y permisos

- Inventario y vistas técnicas nunca muestran costos o márgenes.
- Ventas puede consultar precios sin conocer necesariamente el costo.
- Solamente roles autorizados consultan costos, márgenes e historial.
- El servidor debe omitir columnas sensibles; no basta con ocultarlas mediante CSS.

## Restricción de identificación

`Clave` continúa siendo el único identificador interno visible. No se incorpora
el campo SKU ni el `codigoInterno` del proyecto de facturación anterior.

