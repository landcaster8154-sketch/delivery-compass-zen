# Compatibilidad visual de Música en Chrome/WebView antiguo

## Objetivo
Mantener el panel panorámico de Música y toda su lógica actual, añadiendo una capa CSS de respaldo que conserve contraste y legibilidad cuando el navegador no interprete correctamente transparencias, mezclas de color, variables complejas o efectos modernos.

## Cambios
- Añadir colores hexadecimales sólidos de respaldo para las tres zonas: biblioteca/lista, carátula y controles.
- Reforzar bordes, separadores, filas, tarjetas y controles con `#2A2F3D` o un sólido equivalente antes de los valores modernos.
- Asegurar texto secundario y metadatos con respaldo `#94A3B8`.
- Definir estados sólidos y distinguibles para canción activa, hover, foco, pulsación, botones de reproducción y controles activados.
- Mantener los estilos modernos después de cada fallback para navegadores actuales, sin cambiar tamaños, columnas ni breakpoints.
- Fijar el overlay de carátula en negro puro `#000000`, cubriendo toda la aplicación, con imagen contenida y cierre táctil existente.

## Verificación
- Revisar Música a 1280×720 y en formato móvil: tres columnas sin desbordamiento en horizontal y adaptación vertical intacta.
- Abrir la carátula a pantalla completa y comprobar negro puro, cobertura total y cierre al tocar.
- Ejecutar las comprobaciones de tipos y la compilación final.

## Alcance técnico
Solo se modificarán la presentación de `MusicaTab` y sus reglas globales asociadas. IndexedDB, lectura ID3, reproducción persistente, posición, cola y navegación no se alterarán.
