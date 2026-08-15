# Clientes y carga de CSF

## Alcance

El módulo permitirá crear, consultar, editar y desactivar clientes. El alta puede
ser manual o partir de una Constancia de Situación Fiscal (CSF), denominada CIF
en el proyecto de referencia.

## Campos del cliente

Datos obligatorios acordados para el flujo comercial y fiscal:

- RFC.
- Nombre, denominación o razón social.
- Código postal fiscal.
- Régimen fiscal.
- Uso de CFDI predeterminado.
- Correo electrónico, obligatorio por regla comercial de TUFIS.

El teléfono queda pendiente de confirmación como obligatorio u opcional.

Datos adicionales, inicialmente opcionales y dentro de una sección que puede
mostrarse u ocultarse:

- Calle.
- Número exterior.
- Número interior.
- Colonia.
- Municipio o alcaldía.
- Localidad o ciudad, pendiente de confirmar por el campo `colonia` repetido en
  la solicitud original.
- Estado.
- País.

## Reglas

- El RFC debe ser único y normalizarse antes de validar duplicidad.
- El nombre fiscal debe conservarse como aparece en la CSF.
- El uso de CFDI debe ser compatible con el régimen fiscal y tipo de persona.
- Un cliente con cotizaciones o facturas no se elimina físicamente; se desactiva.
- Los listados, búsquedas y paginación se resuelven en el servidor.
- Se debe conservar auditoría de creación, modificación y desactivación.

## Flujo de carga de CSF

```text
Seleccionar PDF
      ↓
Validar tipo, contenido y tamaño
      ↓
Extraer texto nativo y leer QR
      ↓
Aplicar OCR local si el PDF es una imagen
      ↓
Identificar secciones y extraer campos
      ↓
Asignar confianza y advertencias por campo
      ↓
Mostrar vista editable de validación
      ↓
Confirmar y guardar
```

La extracción nunca guarda automáticamente un cliente. El usuario debe revisar
y confirmar los datos.

## Resultado de extracción

Cada campo debe indicar:

- Valor encontrado.
- Fuente: texto, QR u OCR.
- Nivel de confianza.
- Advertencia cuando sea dudoso.
- Estado faltante cuando no pudo extraerse.

OpenAI puede evaluarse posteriormente como respaldo opcional para documentos
difíciles, pero no será la primera estrategia.

## Auditoría del parser anterior

No se reutiliza el parser de
`referencias/facturacion-electronica-mexico-main/src/app/api/clients/parse-cif/route.ts`.
Sus principales problemas son:

- Asocia etiquetas con la siguiente línea sin delimitar correctamente el campo.
- Reconstruye calles mediante un diccionario fijo.
- Puede confundir el lugar de emisión con el domicilio fiscal.
- Falla con estados y municipios compuestos.
- El catálogo de regímenes es incompleto.
- No utiliza QR ni OCR.
- No valida suficientemente el archivo.
- Registra información fiscal en los logs.

Sí se conserva la experiencia funcional `subir → revisar → editar → confirmar`.

