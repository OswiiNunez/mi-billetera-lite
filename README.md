# Mi Billetera Lite

PWA para registrar gastos diarios, con HTML, CSS y JavaScript nativos, IndexedDB y Service Worker. La PWA no requiere paquetes ni servicios externos (`npm install` solo es necesario para la versión Expo Go) y los gastos permanecen en el navegador.

## Ejecutar en Windows

Ejecutar **Iniciar.cmd** (doble clic) y abrir **http://localhost:8000**. La terminal debe permanecer abierta mientras el servidor esté en uso.

Alternativamente, desde esta carpeta:

```powershell
node server.mjs
```

Con Python 3:

```powershell
python server.py
```

La dirección es `http://localhost:8000`. `index.html` no debe abrirse directamente con `file://`, porque los Service Workers requieren HTTPS o localhost. Node.js 18+ o Python 3 son alternativas para servir los mismos archivos; la aplicación no necesita backend.

## Uso

1. Ingresar el concepto, un monto mayor a cero y una categoría: Comida, Transporte, Servicios, Ocio u Otros.
2. Pulsar **Guardar gasto**. El historial muestra primero el registro más reciente y el total se actualiza.
3. El historial permite buscar por concepto y filtrar por categoría. El total superior siempre representa todos los registros.
4. Un registro puede eliminarse y recuperarse con **Deshacer** durante 10 segundos.
5. El botón **Instalar app** abre el diálogo nativo del navegador cuando está disponible; en otros casos muestra las instrucciones correspondientes. En modo instalado la app se abre en su propia ventana.

## Funcionamiento offline y datos

- La primera visita con conexión prepara el App Shell: HTML, CSS, módulos JS, manifest e íconos.
- `sw.js` implementa **Cache First / Network Fallback**. `install` precarga el App Shell, `activate` elimina versiones antiguas de la caché de esta app y `fetch` sirve los recursos desde caché antes de usar la red.
- Los gastos se guardan con **IndexedDB**, separados de la caché del Service Worker. Guardar sin red no crea solicitudes a servidores.
- Los montos se almacenan en centavos enteros para evitar errores de coma flotante.
- La fecha y el cálculo de “hoy” usan la zona horaria del dispositivo.
- Los datos pertenecen al origen del navegador (protocolo + host + puerto). Cambiar de puerto/navegador/dispositivo no traslada los registros. Borrar los datos del sitio o usar un perfil temporal puede eliminarlos. No hay sincronización ni respaldo en la nube.
- Al cambiar recursos estáticos debe incrementarse `CACHE_NAME` en `sw.js`. La actualización se activa al cerrar las pestañas de la versión anterior y volver a abrir la app.

## Ejecutar en Expo Go (Android o iPhone)

Versión nativa opcional en `mobile/`: reutiliza `finance.js` y replica el diseño de la web. No sustituye la PWA ni sus requisitos (manifest, Service Worker y HTTPS).

1. Instalar **Expo Go** en el dispositivo móvil, en una versión compatible con el SDK indicado en `package.json` (Expo 58).
2. Usar una versión de Node.js compatible con ese SDK e instalar las dependencias con `npm install`.
3. Conectar el dispositivo móvil y la computadora a la misma red Wi-Fi.
4. Ejecutar `npm run mobile` y escanear el código QR de la terminal (en Android, desde Expo Go; en iPhone, con la cámara). Si el QR no se muestra, en Expo Go se puede elegir **Enter URL manually** e introducir la dirección `exp://…` que indica la terminal.
5. Si Windows solicita acceso de red para Node.js, permitirlo solo en redes privadas. Si la red bloquea conexiones locales, puede usarse `npm run mobile -- --tunnel`; Expo puede solicitar instalar el soporte de túnel.

Incluye registro, cinco categorías, historial reciente primero, total, resumen por categoría, búsqueda, filtro y eliminación con deshacer. Los gastos se guardan con AsyncStorage en el propio celular: no se sincronizan con la IndexedDB de la web ni con otros dispositivos, y borrar los datos de Expo Go puede eliminar el historial. No hay botón de instalación ni Service Worker en esta versión.

Para cargar el proyecto en Expo Go se requiere acceso al servidor de desarrollo (Metro); no se garantiza reabrirlo en frío sin él. Una app nativa independiente requiere generar e instalar una compilación de producción.

## Estructura

| Archivo | Función |
| --- | --- |
| `index.html` | Interfaz accesible y formulario |
| `styles.css` | Diseño responsive Mobile First |
| `app.js` | Interfaz, instalación, filtros y estado de conexión |
| `finance.js` | Validación, montos y resúmenes |
| `db.js` | Transacciones y persistencia IndexedDB |
| `sw.js` | App Shell y caché offline |
| `manifest.json` | Nombre, alcance relativo y `display: standalone` |
| `icons/` | PNG maskable de 192×192 y 512×512 |
| `server.mjs` / `server.py` | Servidores locales opcionales |
| `mobile/` | Versión Expo Go: pantalla, iconos, selector y almacenamiento local |
| `app.json` | Configuración de Expo |
| `package.json` | Scripts (`start`, `mobile`, `test`) y dependencias de Expo |
| `tests/` | Pruebas de importes, ciclo del Service Worker, formulario y almacenamiento móvil |

## Comprobar los criterios de la práctica

1. **Instalación:** abrir en Chrome o Edge desde localhost o HTTPS, esperar a que el modo offline esté listo e instalar desde el botón o el menú del navegador. La ventana debe abrirse en modo standalone.
2. **Manifest y Service Worker:** en DevTools → Application → Manifest se revisan nombre, display, start_url e íconos. En Service Workers debe figurar `activated` y controlar la página. En Cache Storage debe aparecer `mi-billetera-lite-shell-v2`.
3. **Sin conexión:** después de la primera carga, DevTools → Network → Offline. Tras recargar (F5), la app debe conservar estilos y funcionamiento. La opción “Bypass for network” de Service Workers debe estar desmarcada.
4. **Persistencia offline:** agregar “Taxis” por $150 en Transporte sin red, recargar, y cerrar y volver a abrir la misma URL en el mismo perfil. El registro debe permanecer y el total debe incluir $150.
5. **Responsive:** verificar 360 px y escritorio: formulario legible, sin desplazamiento horizontal y controles accesibles por teclado.
6. **Validaciones:** verificar concepto vacío, monto 0, negativo o con más de 2 decimales, categoría faltante y concepto con símbolos. Nunca deben ejecutarse etiquetas HTML capturadas.

La categoría PWA de Lighthouse fue retirada en las versiones actuales de Chrome. Si no aparece en DevTools, se verifican los puntos anteriores en Application y se usa Lighthouse para rendimiento, accesibilidad y buenas prácticas. No se adjunta ningún badge ni puntuación que no se haya medido.

Pruebas automáticas (Node.js 18+):

```powershell
npm test
```

## Publicación

Publicación recomendada con **GitHub Pages**: Settings → Pages → Deploy from a branch, rama `main`, carpeta `/(root)`. La URL HTTPS la asigna GitHub.

Para actualizar basta con hacer commit y push a `main`; si cambian recursos estáticos, debe incrementarse antes `CACHE_NAME` en `sw.js`. No deben incluirse datos personales; la aplicación no trae gastos precargados. Los paths relativos permiten alojarla bajo el nombre del repositorio.

En otro hosting estático se publican `index.html`, `styles.css`, `app.js`, `finance.js`, `db.js`, `sw.js`, `manifest.json` y la carpeta `icons/` en el mismo directorio, con HTTPS habilitado. El servidor debe entregar `.js` como JavaScript y el manifest como JSON.

## Referencias técnicas

- [Uso de Service Workers — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)
- [Caché en PWAs — MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching)
- [Auditorías PWA y aviso de retirada — Chrome](https://developer.chrome.com/docs/lighthouse/pwa/service-worker/)
