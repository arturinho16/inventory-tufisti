# Integración con Mercado Libre

## Etapa 0: conexión segura

La primera entrega conecta una o más cuentas vendedoras mediante OAuth 2.0 de servidor con PKCE. La URI de retorno canónica es `https://360core.tufisti.net/api/mercadolibre/callback` y debe coincidir exactamente con la registrada en Mercado Libre.

- El navegador nunca recibe `client_secret`, `access_token` ni `refresh_token`.
- Los tokens se cifran en reposo con AES-256-GCM usando `MERCADOLIBRE_TOKEN_ENCRYPTION_KEY`.
- Cada autorización usa `state` de un solo uso, vence en diez minutos y se valida por hash.
- El access token se renueva poco antes de expirar. El refresh token nuevo reemplaza atómicamente al anterior.
- Desconectar elimina del sistema todos los tokens de la cuenta.
- Los errores nunca deben incluir credenciales ni encabezados de autorización.

Esta etapa no modifica existencias ni importa ventas. La sincronización de pedidos, publicaciones y movimientos se diseñará después de validar la conexión y sus reglas funcionales.

## Etapa 0.1: consulta de la cuenta

Después de conectar una cuenta, el menú muestra su apodo y permite consultar en
modo de solo lectura:

- Publicaciones del vendedor.
- Compras obtenidas mediante Orders v2.
- Envíos asociados a las órdenes consultadas.
- Productos de la cuenta, paginados de 15 en 15.

Esta etapa consulta la información vigente directamente en Mercado Libre. No
persiste copias de ventas, no relaciona publicaciones mediante `claveMLFull` y no
incrementa, descuenta ni reserva existencias. Las reglas de sincronización del
inventario se definirán en una etapa posterior.

## Etapa 0.2: catálogo local de lectura

El usuario puede solicitar una sincronización manual de productos. TUFIS utiliza
exclusivamente consultas `GET` y guarda localmente los campos necesarios para
búsqueda y conciliación: publicación, variación, User Product ID, Inventory ID,
código externo del vendedor, existencia informada, GTIN oficial, marca, modelo,
logística, imágenes, enlace, condición y estado.

El código externo `SELLER_SKU` se presenta como `Código ML`; no sustituye a
`Clave` ni introduce SKU como identificador del dominio TUFIS. Cada imagen
principal se descarga al almacenamiento local en su resolución disponible y se
rechaza si supera 3 MB.

La logística se resume como `L` para operación local y `F` para Fulfillment. La
coincidencia inicial con inventario es solamente una sugerencia cuando Código ML
y Clave son idénticos. No vincula registros automáticamente ni modifica ninguna
existencia. La consulta detallada del stock Full mediante `inventory_id` y las
reglas de abastecimiento se implementan por separado.

## Etapa 0.3: notificaciones de lectura

La URL canónica de notificaciones es
`https://360core.tufisti.net/api/integraciones/ml/notificaciones`. Recibe los
temas `items` y `orders_v2`, confirma la recepción inmediatamente y procesa el
aviso en segundo plano. El `application_id` debe coincidir con el Client ID y el
`user_id` debe pertenecer a una cuenta conectada.

El contenido recibido nunca se toma como fuente de verdad. TUFIS consulta por
`GET` el recurso indicado, registra cada aviso de forma idempotente y actualiza
solamente su copia local. Las ventas y partidas se persisten para análisis por
periodo y asociación por publicación y variación. No se ejecutan escrituras
contra Mercado Libre ni se altera el inventario interno de TUFIS.

## Etapa 0.4: reconciliación automática

Un servicio independiente ejecuta cada quince minutos una reconciliación de las
ventas modificadas durante los treinta minutos anteriores. La ventana solapada
tolera retrasos temporales y vuelve a consultar por `GET` cada orden y las
publicaciones afectadas. Las operaciones son idempotentes y una ejecución nueva
se omite mientras exista otra en curso.

Todos los días a las 03:00, zona `America/Mexico_City`, se ejecuta una
reconciliación completa del catálogo para recuperar cambios de publicaciones que
no hayan llegado mediante notificaciones. El proceso continúa siendo de solo
lectura y no modifica existencias de TUFIS ni recursos de Mercado Libre.
