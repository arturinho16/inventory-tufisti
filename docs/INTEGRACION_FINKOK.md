# Integración fiscal con Finkok

## Alcance

Finkok será el primer Proveedor Autorizado de Certificación integrado. La
implementación comenzará en ambiente de demostración y permanecerá desacoplada
del dominio mediante un adaptador.

```ts
interface ProveedorCertificacion {
  timbrar(documento: CfdiFirmado): Promise<ResultadoTimbrado>;
  cancelar(solicitud: SolicitudCancelacion): Promise<ResultadoCancelacion>;
  consultar(uuid: string): Promise<EstadoFiscal>;
}
```

## Componentes reutilizables

Del proyecto `referencias/facturacion-electronica-mexico-main/` se adaptarán:

- Resolución de endpoints de demostración y producción.
- Comunicación SOAP con Finkok.
- Conversión y lectura del CSD.
- Obtención del número de certificado.
- Generación del sello SHA-256.
- Construcción inicial del XML CFDI 4.0.
- Lectura del UUID y XML timbrado.
- Registro del uso de timbres.
- Base de generación de PDF y QR.

Estas piezas deben auditarse, probarse y desacoplarse antes de usarlas.

## Seguridad obligatoria

- Los nombres de campos que contienen `Encrypted` no bastan: los valores deben
  cifrarse realmente antes de persistirlos.
- Base64 no se considera cifrado.
- La llave maestra vive exclusivamente como secreto de Dokploy.
- Certificados, llaves y contraseñas nunca se devuelven al navegador.
- Las cargas de CSD y FIEL validan vigencia, RFC, correspondencia y contraseña.
- SMTP y PAC utilizan validación TLS estricta.
- No se registran secretos ni documentos fiscales completos en logs.
- Las pantallas muestran estado y vigencia, no el contenido sensible.

El CSD se utiliza para firmar CFDI. La FIEL se reserva para los servicios que la
requieran, como ciertos flujos de descarga, y no se mezcla con el sellado normal.

## Flujo de timbrado

```text
Factura en borrador
       ↓
Validaciones comerciales y fiscales
       ↓
Generar XML conforme a CFDI vigente
       ↓
Validar estructura y totales
       ↓
Generar cadena original y sello con CSD
       ↓
Enviar a Finkok con clave de idempotencia local
       ↓
Interpretar respuesta e incidencias
       ↓
Persistir UUID, XML, estado y auditoría
       ↓
Generar PDF y habilitar envío
```

## Cancelación

La pantalla solicita el motivo SAT y, cuando corresponda, el UUID sustituto. No
se reutiliza la cancelación anterior con el motivo `02` fijo. Una respuesta de
solicitud aceptada no se confunde con una cancelación concluida; el estado se
consulta y actualiza explícitamente.

## Verificación antes de producción

- Pruebas unitarias de XML, cadena original, firma y redondeo.
- Casos de integración con Finkok demo.
- Reintentos sin duplicar timbres.
- Validación contra esquemas y catálogos vigentes.
- Pruebas de timeout y respuestas incompletas.
- Pruebas de permisos, cifrado y ausencia de secretos en logs.
- Respaldo y recuperación de XML timbrados.

