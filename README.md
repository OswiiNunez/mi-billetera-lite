# Mi Billetera Lite

PWA para registrar gastos diarios. HTML, CSS y JavaScript nativos, IndexedDB y Service Worker. No requiere instalar paquetes ni servicios externos; los gastos permanecen en el navegador.

## Ejecutar en Expo Go (Android o iPhone)

La adaptacion nativa vive en `mobile/` y reutiliza la logica de importes de `finance.js`. La PWA original sigue disponible sin cambios en su forma de inicio.

1. Instala Expo Go en tu celular, actualizado y compatible con el SDK indicado en `package.json`.
2. Usa una version de Node.js compatible con ese SDK de Expo e instala las dependencias con `npm install`.
3. Conecta el celular y la computadora a la misma red Wi-Fi.
4. Ejecuta `npm run mobile` y escanea el QR que aparece en la terminal. En Android usa Expo Go; en iPhone, la camara.
5. Si Windows solicita acceso de red para Node.js, permite solo redes privadas. Si la red bloquea conexiones locales, puedes intentar `npm run mobile -- --tunnel`; Expo puede solicitar instalar el soporte de tunel.

La version movil incluye registro, cinco categorias, historial reciente primero, total, resumen por categoria, busqueda, filtros y eliminacion con deshacer. Usa AsyncStorage local: sus gastos no se sincronizan con IndexedDB ni con otros dispositivos. Reinstalar Expo Go o borrar sus datos puede eliminar el historial.

Los datos se guardan sin servidor externo. Para cargar el proyecto en Expo Go necesitas alcanzar el servidor de desarrollo; no se garantiza reabrirlo en frio sin Metro. Para una app nativa independiente hay que generar e instalar una compilacion de produccion. Esta version Expo no reemplaza los entregables PWA (manifest, Service Worker y hosting HTTPS) de la practica.

## Ejecutar en Windows

Haz doble clic en **Iniciar.cmd** y abre **http://localhost:8000**. Mantén abierta la terminal mientras pruebas el servidor.

También puedes ejecutar desde esta carpeta:

```powershell
node server.mjs
```

O usar Python 3:

```powershell
python server.py
```

Abre la misma dirección, `http://localhost:8000`. No abras `index.html` directamente con `file://`: los Service Workers requieren HTTPS o localhost. Node.js 18+ o Python 3 son alternativas para servir los mismos archivos; la aplicación no necesita backend.

## Uso

1. Escribe el concepto, monto mayor a cero y categoría: Comida, Transporte, Servicios, Ocio u Otros.
2. Pulsa **Guardar gasto**. El historial muestra primero el registro más reciente y el total se actualiza.
3. Busca por concepto o filtra por categoría. El total superior siempre representa todos los registros.
4. Puedes eliminar un registro y pulsar **Deshacer** durante 10 segundos.
5. Pulsa **Instalar app**. Cuando el navegador ofrece el diálogo nativo, úsalo; en otros casos se muestran las instrucciones correspondientes. En modo instalado la app se abre en su propia ventana.

## Funcionamiento offline y datos

- La primera visita con conexión prepara el App Shell: HTML, CSS, módulos JS, manifest e íconos.
- `sw.js` implementa **Cache First / Network Fallback**. `install` precarga el App Shell, `activate` elimina versiones antiguas de la caché de esta app y `fetch` sirve los recursos desde caché antes de usar la red.
- Los gastos se guardan con **IndexedDB**, separados de la caché del Service Worker. Guardar sin red no crea solicitudes a servidores.
- Los montos se almacenan en centavos enteros para evitar errores de coma flotante.
- La fecha y el cálculo de “hoy” usan la zona horaria del dispositivo.
- Los datos pertenecen al origen del navegador (protocolo + host + puerto). Cambiar de puerto/navegador/dispositivo no traslada los registros. Borrar los datos del sitio o usar un perfil temporal puede eliminarlos. No hay sincronización ni respaldo en la nube.
- Al cambiar recursos estáticos, incrementa `CACHE_NAME` en `sw.js`. Una actualización se activa al cerrar las pestañas de la versión anterior y volver a abrir la app.

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
| `tests/` | Pruebas de importes y ciclo del Service Worker |

## Comprobar los criterios de la práctica

1. **Instalación:** abre en Chrome o Edge desde localhost o HTTPS, espera a que el modo offline esté listo e instala desde el botón o menú del navegador. Comprueba la ventana standalone.
2. **Manifest y Service Worker:** DevTools → Application → Manifest: revisa nombre, display, start_url e íconos. En Service Workers comprueba `activated` y que controla la página. En Cache Storage debe aparecer `mi-billetera-lite-shell-v2`.
3. **Sin conexión:** después de la primera carga, DevTools → Network → Offline. Recarga normalmente (F5): la app debe conservar estilos y funcionamiento. Mantén desmarcado “Bypass for network” en Service Workers.
4. **Persistencia offline:** agrega “Taxis” por $150 en Transporte sin red. Recarga, cierra y vuelve a abrir la misma URL en el mismo perfil. El registro debe permanecer y el total debe incluir $150.
5. **Responsive:** comprueba 360 px y escritorio: formulario legible, sin desplazamiento horizontal y controles accesibles por teclado.
6. **Validaciones:** comprueba concepto vacío, monto 0/negativo/más de 2 decimales, categoría faltante y concepto con símbolos. Nunca se deben ejecutar etiquetas HTML capturadas.

La categoría PWA de Lighthouse fue retirada en las versiones actuales de Chrome. Si no aparece en tu DevTools, verifica los puntos anteriores en Application y usa Lighthouse para rendimiento, accesibilidad y buenas prácticas. No se adjunta un badge o puntuación que no se haya medido.

Pruebas automáticas (Node.js 18+):

```powershell
npm test
```

## Publicar para la entrega

El proyecto se entrega local. La creación de un repositorio GitHub y una URL pública requieren tu cuenta y un destino de publicación; no están creados por los archivos locales.

Para **GitHub Pages**, crea un repositorio, sube los archivos de esta carpeta y en **Settings → Pages** selecciona **Deploy from a branch**, rama `main`, carpeta `/(root)`. Abre la URL HTTPS que te proporcione GitHub. No subas datos personales; la aplicación no incluye gastos precargados. Los paths relativos permiten alojarla bajo el nombre del repositorio.

En otro hosting estático, publica `index.html`, `styles.css`, `app.js`, `finance.js`, `db.js`, `sw.js`, `manifest.json` y la carpeta `icons/` en el mismo directorio y habilita HTTPS. El servidor debe entregar `.js` como JavaScript y el manifest como JSON.

## Referencias técnicas

- [Uso de Service Workers — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)
- [Caché en PWAs — MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching)
- [Auditorías PWA y aviso de retirada — Chrome](https://developer.chrome.com/docs/lighthouse/pwa/service-worker/)
