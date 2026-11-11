import './style.css';
import { createBeach } from './beach.js';
import { createDancers } from './dancers.js';

const stage = document.querySelector('#stage');
const video = document.querySelector('#camera');
const cameraButton = document.querySelector('#camera-button');
const demoButton = document.querySelector('#demo-button');
const fullscreenButton = document.querySelector('#fullscreen');
const status = document.querySelector('#status');
const capturePanel = document.querySelector('#capture');
const captureLabel = document.querySelector('#capture-label');
const modeLabel = document.querySelector('#mode-label');
const modeDot = document.querySelector('#mode-dot');

const beach = createBeach(document.querySelector('#beach'));
let dancers;
try {
  dancers = createDancers(document.querySelector('#dancers'));
} catch (error) {
  console.error(error);
  cameraButton.disabled = true;
  demoButton.disabled = true;
  status.textContent = 'La escena 3D requiere WebGL. Prueba con otro navegador o equipo.';
}

let stream;
let capture;
let detector;
let pending = false;
let generation = 0;
let demoUntil = 0;
const clock = () => performance.now() / 1000;

function resize() {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  if (!width || !height) return;
  const ratio = Math.min(devicePixelRatio, 1.75);
  beach.resize(width, height, ratio);
  dancers?.resize(width, height, ratio);
}

function demo(now, idle = false) {
  dancers.clear(avatar => avatar.demo);
  dancers.add(null, now, { demo: true, idle });
  demoUntil = idle ? 0 : now + 11;
}

function stopCamera(message = 'Cámara desactivada. Puedes volver a activarla cuando quieras.') {
  generation++;
  pending = false;
  const activeStream = stream;
  stream = null;
  activeStream?.getTracks().forEach(track => track.stop());
  video.srcObject = null;
  capture?.clear();
  capture = null;
  capturePanel.hidden = true;
  modeDot.classList.remove('live');
  modeLabel.textContent = 'Modo demo';
  cameraButton.textContent = 'Activar cámara';
  dancers.clear();
  demo(clock(), true);
  status.textContent = message;
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    status.textContent = 'Abre la página en HTTPS o localhost para activar la cámara.';
    return;
  }
  const request = ++generation;
  pending = true;
  cameraButton.textContent = 'Cancelar';
  status.textContent = 'Solicitando acceso a la cámara…';

  try {
    const input = await navigator.mediaDevices.getUserMedia({
      audio: false, video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 540 } },
    });
    if (request !== generation) {
      input.getTracks().forEach(track => track.stop());
      return;
    }
    stream = input;
    for (const track of input.getVideoTracks()) {
      track.addEventListener('ended', () => {
        if (request === generation) stopCamera('Se desconectó la cámara. Puedes intentar activarla de nuevo.');
      }, { once: true });
    }
    video.srcObject = input;
    await video.play();
    if (request !== generation) return;
    status.textContent = 'Preparando el detector de rostros…';
    const { loadLandmarker, createCapture } = await import('./capture.js');
    if (request !== generation) return;
    if (!detector) {
      const loadedDetector = await loadLandmarker();
      if (request !== generation) {
        loadedDetector.close();
        return;
      }
      detector = loadedDetector;
    }
    dancers.clear();
    demoUntil = 0;
    capture = createCapture(video, detector, face => {
      if (dancers.liveCount() >= 2) return false;
      dancers.clear(avatar => avatar.demo);
      dancers.add(face, clock());
      return true;
    });
    pending = false;
    capturePanel.hidden = false;
    modeDot.classList.add('live');
    modeLabel.textContent = 'Cámara activa';
    cameraButton.textContent = 'Desactivar cámara';
  } catch (error) {
    if (request !== generation) return;
    console.error(error);
    const message = {
      NotAllowedError: 'Permite el acceso a la cámara en el navegador para participar.',
      NotFoundError: 'No encontramos una cámara conectada.',
      NotReadableError: 'La cámara está ocupada o no se pudo abrir.',
    }[error.name] ?? 'No pudimos iniciar la cámara. Vuelve a intentarlo.';
    stopCamera(message);
  }
}

if (dancers) {
  demo(clock(), true);
  cameraButton.addEventListener('click', () => {
    if (pending || stream) stopCamera();
    else void startCamera();
  });
  demoButton.addEventListener('click', () => {
    if (stream || pending) stopCamera();
    demo(clock());
    status.textContent = 'El cuerpo se desvanece y la cabeza sigue bailando.';
  });
  window.addEventListener('pagehide', () => {
    if (stream || pending) stopCamera();
  });
}

fullscreenButton.hidden = !document.fullscreenEnabled;
fullscreenButton.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    status.textContent = 'El navegador no pudo activar la pantalla completa.';
  }
});
document.addEventListener('fullscreenchange', () => {
  const label = document.fullscreenElement ? 'Salir de pantalla completa' : 'Pantalla completa';
  document.querySelector('#fullscreen-label').textContent = label;
  fullscreenButton.setAttribute('aria-label', label);
});

new ResizeObserver(resize).observe(stage);
resize();

let lastFrame = performance.now();
function animate(timestamp) {
  const now = timestamp / 1000;
  const delta = Math.max(0, Math.min(0.05, (timestamp - lastFrame) / 1000));
  lastFrame = timestamp;
  beach.draw(now);
  if (capture) {
    try {
      capture.scan(timestamp);
      const label = capture.collecting ? 'Buscando el mejor fotograma…' : 'Mira al frente';
      const count = dancers.liveCount();
      const message = ['Acércate y mira de frente a la cámara.', '¡Ya estás en la playa!', '¡Ya están en la playa!'][count];
      if (captureLabel.textContent !== label) captureLabel.textContent = label;
      if (status.textContent !== message) status.textContent = message;
    } catch (error) {
      console.error(error);
      detector?.close();
      detector = null;
      stopCamera('La captura se interrumpió. Puedes volver a activar la cámara.');
    }
  }
  if (dancers && demoUntil && now >= demoUntil) {
    demo(now, true);
    status.textContent = 'Puedes probar la escena sin cámara.';
  }
  dancers?.draw(now, delta);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

