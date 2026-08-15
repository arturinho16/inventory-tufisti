# Arquitectura inicial

## Estructura prevista

```text
src/
├── app/
│   ├── (sistema)/
│   │   ├── inventario/
│   │   ├── productos/nuevo/
│   │   ├── codigos-universales/
│   │   ├── etiquetas/
│   │   ├── configuracion/respaldos/
│   │   ├── configuracion/
│   │   ├── automatizacion/importar/
│   │   ├── automatizacion/imagenes/
│   │   └── paralelo/
│   │       ├── buscar/
│   │       ├── nuevo/
│   │       └── registros/
│   ├── api/
│   │   └── imagenes/
│   └── layout.tsx
├── actions/
├── components/
│   ├── catalogos/
│   ├── inventario/
│   ├── layout/
│   ├── productos/
│   ├── smart-match/
│   ├── etiquetas/
│   ├── importaciones/
│   ├── imagenes-ia/
│   ├── respaldos/
│   └── ui/
├── lib/
│   ├── etiquetas/
│   ├── imagenes/
│   ├── imagenes-ia/
│   ├── openai/
│   ├── respaldos/
│   ├── smart-match/
│   └── validaciones/
├── stores/
│   └── editor-etiquetas.ts
└── types/
prisma/
├── migrations/
└── seed/
public/
└── imagenes/productos/
tests/
├── integration/
└── unit/
```

## Límites de responsabilidad

- `app`: rutas, layouts, carga inicial y composición.
- `actions`: mutaciones del servidor y autorización futura.
- `components/ui`: primitivas visuales compartidas.
- `components/*`: componentes propios de cada dominio.
- `lib/validaciones`: esquemas de entrada reutilizables.
- `lib/smart-match`: algoritmo puro, pesos, tolerancias y explicaciones.
- `lib/imagenes`: abstracción de almacenamiento de imágenes.
- `lib/imagenes-ia`: proveedor de generación, plantillas de escenas, validación
  de referencias y preparación de archivos comerciales. El dominio no dependerá
  directamente de un modelo específico.
- El estudio de imágenes registra en PostgreSQL proyectos, referencias, variantes,
  instrucciones, estados, errores, aprobaciones y auditoría. Los binarios se
  guardan mediante `lib/imagenes`.
- Un trabajador separado procesa las generaciones de forma persistente e
  idempotente. Cada variante es un trabajo independiente con reintentos acotados,
  de modo que regenerar una imagen no repita las otras ocho.
- La clave del proveedor de generación nunca se expone al navegador. Los archivos
  fuente y generados se validan por tipo, dimensiones y tamaño antes de persistir.
- La asociación futura con Mercado Libre será una operación separada y explícita;
  antes conservará las imágenes anteriores, consultará límites de categoría y
  guardará el resultado del diagnóstico y de cada solicitud.
- `lib/respaldos`: formato portátil versionado, comprobación de integridad y
  restauración selectiva del dominio de inventario. Nunca incluye secretos,
  tokens ni configuración del servidor.
- El programador de respaldos se ejecuta como servicio separado de la aplicación,
  consulta un endpoint interno autenticado cada minuto y almacena los archivos
  en un volumen persistente privado compartido únicamente con el servidor web.
- El programador de Mercado Libre se ejecuta como otro servicio separado. Llama
  cada quince minutos a un endpoint interno autenticado para reconciliar ventas
  recientes y solicita una reconciliación completa diaria a las 03:00, hora de
  `America/Mexico_City`.
- El adaptador local descarga o recibe JPG, PNG y WebP, valida el contenido y
  persiste en `public/imagenes/productos` usando el nombre `Clave-modelo`.
- `stores`: exclusivamente estado efímero de interfaz.
- `prisma`: esquema, migraciones y datos semilla.
- `tests/unit`: fórmula y reglas puras.
- `tests/integration`: persistencia, consultas y flujos completos.

## Orden de construcción

1. Inicializar Next.js y dependencias.
2. Configurar tokens, fuentes y Boxicons.
3. Crear Prisma y el modelo de datos.
4. Implementar layout, navegación y ripple.
5. Implementar inventario.
6. Implementar alta de producto e imágenes.
7. Implementar línea y marca.
8. Implementar especificaciones técnicas.
9. Implementar registros del paralelo.
10. Implementar y probar Smart Match.
11. Verificar responsive, accesibilidad y rendimiento.
# Integraciones externas

La conexión inicial con Mercado Libre se define en `docs/INTEGRACION_MERCADO_LIBRE.md`. OAuth, intercambio y renovación de tokens se ejecutan exclusivamente en el servidor; los tokens persistidos permanecen cifrados.

## Arquitectura FTF e importación persistente — 13 de agosto de 2026

- `lib/ftf/extraer-url.ts` adapta las fuentes admitidas a secciones y campos FTF
  sin reducir la ficha a un diccionario plano.
- `lib/ftf/buscar.ts` localiza candidatos por marca y modelo y confirma la
  diagonal antes de aceptar una coincidencia automática. Consulta primero el
  proveedor Scrapling de DeviceSpecifications y usa SmartGSM como fallback.
- `lib/ftf/validar.ts` concentra la normalización y las reglas de identidad; las
  tolerancias no se duplican en componentes.
- `lib/ftf/persistir.ts` guarda la FTF y su URL fuente.
- `actions/importacion-ftf.ts` valida archivos, confirma la cola y atiende
  revalidaciones con URL manual exclusivamente en servidor.
- `lib/ftf/procesar-cola.ts` reclama registros, crea productos y FTF de forma
  transaccional, registra cada intento y recupera trabajos interrumpidos.
- `api/tareas/importaciones-ftf` es un endpoint interno autenticado. El servicio
  `programador-ftf` lo consulta sin depender del navegador.
- `ImportacionFtfLote`, `ImportacionFtfRegistro` e `ImportacionFtfIntento` son la
  fuente de verdad del seguimiento, la cola y la auditoría. Los archivos
  temporales no son necesarios para reanudar un lote confirmado.
- Las consultas de seguimiento están limitadas, ordenadas e indexadas por estado,
  marca, diagonal, Clave y lote para conservar búsquedas rápidas.
- Las migraciones `20260813210000_ficha_tecnica_full` y
  `20260813223000_seguimiento_importacion_ftf` introducen este dominio; la
  migración `20260813233000_cola_intentos_ftf` agrega la cola reanudable y el
  historial inmutable de intentos.

El proveedor DeviceSpecifications aplica 120 segundos de espera por defecto,
reintenta únicamente fallos transitorios y se detiene ante 403, 429 o
verificación humana. El operador puede configurar voluntariamente un intervalo. Se configura
con `FTF_REQUEST_INTERVAL_SECONDS`, `FTF_MAX_RETRIES`,
`FTF_RETRY_BASE_SECONDS` y `FTF_MAX_CANDIDATES`. El endpoint del trabajador se
protege con `FTF_WORKER_TOKEN`, disponible sólo en el servidor.

El volumen `html_ftf` conserva por URL los HTML válidos de modelos. Antes de una
petición externa, el proveedor busca esa copia y la reprocesa offline. Una página
HTTP 200 con título técnico válido se acepta aunque un script interno mencione
CAPTCHA; la detección de bloqueo se aplica cuando falta contenido técnico real.
Una coincidencia textual exacta abre sólo un modelo, igual que `busquedaPhone`.

`lib/ftf/normalizar-pantalla.ts` adapta exclusivamente la sección `Display` de
DeviceSpecifications y SmartGSM al contrato de `EspecificacionPantalla`. Mantiene
valores ausentes como `null`, calcula sólo dimensiones geométricas deterministas y
expone faltantes obligatorios. `actions/transferencia-ftf.ts` consulta en lote las
diagonales esperadas, repite el matching en servidor y ejecuta el `upsert` sólo
después de una confirmación explícita desde la pestaña `Pasar a Paralelo`.
El servicio Scrapling puede leer una URL conocida durante Seguimiento, pero la
acción de transferencia no depende de la red. `transferirFtfAParalelo` normaliza
la FTF persistida, vuelve a validar la relación Producto–FTF y ejecuta el upsert
sólo cuando todos los campos obligatorios están presentes.

`obtenerFtfSeguimiento` carga secciones y campos bajo demanda para el visor; las
consultas de listado no transportan el JSON completo de todas las FTF.
`guardarCamposDisplayFtf` modifica exclusivamente la sección `Display`, conserva
la procedencia, recalcula faltantes y registra la edición en
`ImportacionFtfIntento`. La consulta de `listarTransferenciasFtf` excluye en el
servidor fichas incompletas o con identidad inválida, de modo que la interfaz de
`Pasar a Paralelo` no dependa de ocultarlas sólo en el navegador.

La aplicación productiva se publica mediante Docker Compose. Después de cambios
de esquema o interfaz que deban quedar visibles en el servidor, se ejecutan las
migraciones y se reconstruye el contenedor de aplicación; posteriormente se
comprueba el estado saludable y una respuesta HTTP correcta en la ruta afectada.
