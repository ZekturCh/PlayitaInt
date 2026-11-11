# Club Marea

Una playa de caricatura que convierte a las personas frente a la cámara en personajes 3D. El cuerpo baila, se desvanece y la cabeza continúa bailando en el aire.

## Ejecutar en local

Necesitas Node.js 22.12 o posterior.

```sh
npm ci
npm run dev
```

Abre la dirección que muestra Vite. La escena llena la ventana. Al abrirla, el navegador pide acceso a la cámara. Si concedes el permiso, mira al frente durante uno o dos segundos para aparecer en la playa. Si la cámara no está disponible, se muestra el personaje de demostración.

Atajos para operar la instalación:

- **C** activa o desactiva la cámara.
- **D** desactiva la cámara y reproduce el baile de demostración.
- **F** entra o sale de pantalla completa.

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
