# Juego de Daniel

Juego arcade de naves hecho con HTML, CSS y JavaScript. No necesita instalar dependencias ni tener conexión a internet.

## Cómo iniciar

1. Abre la carpeta del proyecto.
2. Abre `index.html` en un navegador moderno.
3. También puedes abrir la carpeta en Visual Studio Code y ejecutar `index.html` con una extensión como Live Server.

## Como jugar

- **Mover la nave:** usa las flechas izquierda y derecha del teclado.
- **En móvil o pantalla táctil:** toca o mantén el dedo en el lado izquierdo o derecho de la nave para moverla en esa dirección.
- **Disparar:** la nave dispara automáticamente.
- **Sonido:** pulsa el botón del altavoz para activar o silenciar los efectos.
- **Reiniciar:** pulsa **REINICIAR** para volver al nivel 1 y poner la puntuación en cero.

Destruye a todos los enemigos de cada oleada para avanzar. Los enemigos laterales se mueven en diagonal. Hay 10 niveles; la cantidad y velocidad de los enemigos aumenta progresivamente. Si un enemigo alcanza la nave o baja hasta su altura, termina la partida.

Cada enemigo eliminado suma 10 puntos. Al completar el nivel 10, ganas la partida.

## Archivos

- `index.html`: estructura de la página y controles.
- `style.css`: estilos y presentación adaptable.
- `script.js`: movimiento, enemigos, puntuación, niveles y sonidos.
