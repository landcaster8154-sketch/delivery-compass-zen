# Empaquetado Android (autorradio) — Mis Rutas de Reparto

La app ya es una PWA offline: manifest (`public/manifest.webmanifest`), iconos
192/512, orientación `landscape`, `display: fullscreen`, service worker
(`public/sw.js`) y todo el estado operativo en LocalStorage/IndexedDB.

> Aquí **no** se genera un APK binario firmado: este entorno no tiene Android
> SDK/Gradle ni claves de firma. Abajo está el procedimiento exacto y los
> artefactos necesarios para obtenerlo.

## Artefactos ya disponibles en el repositorio

| Artefacto | Ruta |
| --- | --- |
| Manifest PWA | `public/manifest.webmanifest` |
| Iconos | `public/icon-192.png`, `public/icon-512.png` |
| Service worker offline | `public/sw.js` |
| URL publicada | la URL de publicación del proyecto |

## Opción A — TWA con Bubblewrap (recomendada)

Requisitos locales: Node 18+, JDK 17, Android SDK (Build Tools + Platform 34).

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://TU-DOMINIO/manifest.webmanifest
# orientación: landscape · display: fullscreen · aplicar "offline first"
bubblewrap build          # genera app-release-signed.apk y app-release-bundle.aab
```

Firma: Bubblewrap crea/usa un keystore (`android.keystore`). Guarda el keystore
y sus contraseñas: son necesarios para cualquier actualización.

Para que no aparezca la barra de Chrome, publica el fichero de Digital Asset
Links en `https://TU-DOMINIO/.well-known/assetlinks.json` con el SHA-256 del
certificado (`bubblewrap fingerprint`).

## Opción B — Capacitor (app 100% embebida, sin depender del dominio)

```bash
npm i @capacitor/core @capacitor/android && npm i -D @capacitor/cli
npx cap init "Mis Rutas de Reparto" com.tuempresa.rutas --web-dir=dist/client
npm run build && npx cap add android && npx cap sync
npx cap open android      # Android Studio → Build > Generate Signed Bundle/APK
```

En `android/app/src/main/AndroidManifest.xml`, fija la actividad en horizontal
y sin giro:

```xml
<activity
    android:name=".MainActivity"
    android:screenOrientation="sensorLandscape"
    android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode" />
```

## Ajustes recomendados para autorradio

- Pantalla siempre encendida: `@capacitor-community/keep-awake` o
  `android:keepScreenOn="true"` en la vista raíz.
- Modo inmersivo (sin barras del sistema) para la vista de conducción.
- Instalar como app de inicio/kiosco si el autorradio lo permite.

## Comprobación offline antes de empaquetar

1. `npm run build && npm run preview`
2. Cargar la app una vez, activar modo avión y recargar: debe abrir con los
   datos guardados y sin pantalla en blanco.
