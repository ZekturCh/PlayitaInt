# Club Marea

Una playa de caricatura que convierte a las personas frente a la cámara en personajes 3D. El cuerpo baila, se desvanece y la cabeza continúa bailando en el aire.

## Ejecutar en local

Necesitas Node.js 22.12 o posterior.

```sh
npm ci
npm run dev
```

Abre la dirección que muestra Vite. Usa **Ver baile demo** para reproducir la secuencia completa. Para probar con tu rostro, elige **Activar cámara**, concede el permiso y mira al frente durante uno o dos segundos. **Desactivar cámara** detiene el video y retira los personajes capturados.

## Cómo funciona

- Canvas dibuja la playa, el oleaje y las palmeras. Three.js anima el cuerpo y la cabeza por separado.
- MediaPipe detecta hasta dos caras. La aplicación sigue sus posiciones entre fotogramas y puntúa los recortes por nitidez, luz, tamaño y ángulo. Un rostro que permanezca visible se captura una vez, hasta que salga de cuadro.
- El recorte se aplica como textura a la cabeza 3D. La app procesa el video en el navegador, conserva temporalmente los recortes en memoria y libera cada textura cuando termina el baile.
- Para una instalación, prueba la distancia y la iluminación con la cámara real. Los cruces rápidos, las oclusiones y el contraluz pueden afectar la captura. Ubica la cámara cerca del centro de la pantalla y deja una zona de participación iluminada.

## Compilar

```sh
npm run build
npm run preview
```

La compilación queda en `dist/`. Puedes alojarla en un servidor estático. La cámara requiere HTTPS o localhost y permiso del navegador. El modelo de detección y el código WebAssembly se sirven con la aplicación.

Modelo de rostro de [MediaPipe Face Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker).
