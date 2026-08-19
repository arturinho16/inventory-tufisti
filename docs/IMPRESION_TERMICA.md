# Impresión térmica directa

## Flujo implementado

El editor de etiquetas conserva la impresión estándar del navegador y ofrece impresión directa mediante QZ Tray 2.2:

1. QZ Tray debe estar instalado y abierto en la computadora que tiene acceso a la impresora.
2. El usuario conecta TUFIS con QZ desde el módulo de etiquetas.
3. TUFIS consulta las impresoras instaladas en el sistema operativo.
4. El usuario confirma impresora, lenguaje y resolución.
5. TUFIS convierte el diseño actual a comandos crudos y QZ los entrega a la cola elegida.

## Perfiles

- `ZPL`: impresoras Zebra y equipos configurados con emulación ZPL.
- `EPL`: impresoras Eltron/Zebra antiguas y equipos configurados con emulación EPL.
- `TSPL`: impresoras TSC, Xprinter y equipos configurados con TSPL o TSPL-EZ.

La marca comercial no garantiza el lenguaje activo. Siempre se debe comprobar el manual y la configuración del modelo real.

## Resolución y calibración

El usuario puede elegir 203, 300 o 600 DPI. Posiciones y tamaños se convierten desde milímetros a puntos. Antes de producción se debe imprimir una etiqueta de prueba para verificar:

- tamaño físico;
- orientación;
- separación o marca negra;
- desplazamiento horizontal y vertical;
- densidad y velocidad;
- legibilidad del código.

## Seguridad y firma

La integración actual usa autorización visible de QZ Tray. No expone claves privadas en el navegador ni crea un firmador público sin autenticación.

Para impresión silenciosa se requiere:

- certificado digital de QZ Tray;
- clave privada PKCS#8 de 2048 bits almacenada únicamente en el servidor;
- firma SHA-512 de cada solicitud;
- autenticación y autorización en el endpoint de firma;
- registro de usuario, impresora y trabajo enviado.

La impresión silenciosa no debe activarse hasta que TUFIS tenga autenticación de usuarios.
