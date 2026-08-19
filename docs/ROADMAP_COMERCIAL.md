# Hoja de ruta comercial

## Propósito

Este documento conserva el plan aprobado para incorporar capacidades comerciales
y fiscales a TUFIS después de integrar las ventas de Mercado Libre. No autoriza
por sí mismo a ejecutar migraciones ni a habilitar timbrado en producción.

## Decisiones aprobadas

- Existe un solo catálogo persistente de productos. No se duplican productos
  entre inventario, Smart Match y el área comercial.
- Inventario conserva una vista operativa simple, sin costos ni precios.
- Smart Match y los registros técnicos muestran especificaciones y medidas, sin
  costos ni precios.
- El catálogo comercial muestra precios, costos, impuestos y configuración SAT,
  sujeto a permisos.
- Las cotizaciones copian los datos comerciales y fiscales vigentes en sus
  partidas para conservar el historial.
- El timbrado se realiza mediante Finkok. La integración debe quedar detrás de
  un adaptador de PAC y comenzar en ambiente de demostración.
- El proyecto `referencias/facturacion-electronica-mexico-main/` es solamente
  una referencia funcional. No se incorpora como dependencia ni se copia su
  interfaz.

## Orden de implementación

| Etapa | Alcance | Estado inicial |
|---|---|---|
| 0 | Integración de ventas de Mercado Libre | Pendiente / trabajo previo |
| 1 | Reglas, modelo de datos, permisos y auditoría comercial | Pendiente |
| 2 | Clientes y carga de CSF | Pendiente |
| 3 | Datos fiscales, costos y precios de productos | Pendiente |
| 4 | Catálogo comercial | Pendiente |
| 5 | Cotizaciones, PDF y envío por correo | Pendiente |
| 6 | Conversión de cotización a borrador de factura | Pendiente |
| 7 | Configuración fiscal segura y Finkok en demostración | Pendiente |
| 8 | Timbrado, XML, PDF, correo, consulta y cancelación | Pendiente |
| 9 | Proveedores | Pendiente |
| 10 | Compras, recepciones y movimientos de inventario | Pendiente |
| 11 | Historial y políticas de costos | Pendiente |
| 12 | Pruebas integrales y habilitación controlada en producción | Pendiente |

Estados permitidos para el seguimiento: `PENDIENTE`, `EN_DISENO`,
`EN_DESARROLLO`, `EN_PRUEBAS` y `TERMINADO`.

## Flujo comercial objetivo

```text
Alta manual de cliente o carga de CSF
                    ↓
             Crear cotización
                    ↓
          Generar PDF y enviar correo
                    ↓
           Aceptar la cotización
                    ↓
       Convertirla en borrador de factura
                    ↓
          Revisar y validar datos fiscales
                    ↓
          Firmar con CSD y timbrar en PAC
                    ↓
       Guardar y enviar XML + PDF al cliente
```

Flujo de abastecimiento futuro:

```text
Proveedor → Compra → Recepción → Movimiento de inventario → Historial de costo
```

## Condiciones antes de programar cada etapa

1. Leer `AGENTS.md` y los documentos canónicos en el orden indicado.
2. Leer el documento específico del dominio que se implementará.
3. Revisar el código del sistema anterior únicamente como referencia.
4. Cerrar las decisiones abiertas de negocio de esa etapa.
5. Diseñar la migración sin duplicar productos ni perder datos existentes.
6. Implementar backend, frontend, validaciones y pruebas del mismo alcance.
7. Completar la verificación antes de iniciar la siguiente etapa.

## Decisiones abiertas

- Definir si el precio base incluye IVA.
- Definir menudeo, mayoreo o listas de precios.
- Definir la política de costo: último, promedio u otra.
- Definir si una cotización aceptada reserva existencia.
- Definir qué roles podrán consultar costos y márgenes.
- Confirmar si el teléfono del cliente será opcional.
- Confirmar si el campo repetido como `colonia` era `localidad` o `ciudad`.
- Elegir el proveedor de correo para producción.

## Punto de reanudación

Cuando concluya la integración de Mercado Libre, continuar con la primera etapa
pendiente de esta hoja de ruta. La instrucción breve para retomarla es:

> Continúa con la primera etapa pendiente de `docs/ROADMAP_COMERCIAL.md`.

