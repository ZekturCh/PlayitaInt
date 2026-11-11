import './style.css';
import { createBeach } from './beach.js';
import { createDancers } from './dancers.js';

const stage = document.querySelector('#stage');
const video = document.querySelector('#camera');
const status = document.querySelector('#status');

const beach = createBeach(document.querySelector('#beach'));
let dancers;
try {
  dancers = createDancers(document.querySelector('#dancers'));
} catch (error) {
  console.error(error);
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

function stopCamera(message = 'Cámara desactivada. Presiona C para activarla.') {
  generation++;
  pending = false;
  stream?.getTracks().forEach(track => track.stop());
  stream = null;
  video.srcObject = null;
  capture?.clear();
  capture = null;
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
        if (request === generation) stopCamera('Se desconectó la cámara. Presiona C para reintentar.');
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
      dancers.add(face, clock());
      return true;
    });
    pending = false;
  } catch (error) {
    if (request !== generation) return;
    const message = {
      NotAllowedError: 'Permite el acceso a la cámara en el navegador y presiona C.',
      NotFoundError: 'No encontramos una cámara conectada.',
      NotReadableError: 'La cámara está ocupada o no se pudo abrir.',
    }[error.name];
    if (!message) console.error(error);
    stopCamera(message ?? 'No pudimos iniciar la cámara. Presiona C para reintentar.');
  }
}

async function toggleFullscreen() {
  if (!document.fullscreenEnabled) return;
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    status.textContent = 'El navegador no pudo activar la pantalla completa.';
  }
}

window.addEventListener('keydown', event => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key.toLowerCase();
  if (key === 'f') void toggleFullscreen();
  if (!dancers) return;
  if (key === 'c') {
    if (pending || stream) stopCamera();
    else void startCamera();
  }
  if (key === 'd') {
    if (stream || pending) stopCamera();
    demo(clock());
    status.textContent = 'El cuerpo se desvanece y la cabeza sigue bailando.';
  }
});

window.addEventListener('pagehide', () => {
  if (stream || pending) stopCamera();
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
      const count = dancers.liveCount();
      const waiting = capture.collecting ? 'Buscando el mejor fotograma…' : 'Acércate y mira de frente a la cámara.';
      const message = [waiting, '¡Ya estás en la playa!', '¡Ya están en la playa!'][count];
      if (status.textContent !== message) status.textContent = message;
    } catch (error) {
      console.error(error);
      detector?.close();
      detector = null;
      stopCamera('La captura se interrumpió. Presiona C para reintentar.');
    }
  }
  if (demoUntil && now >= demoUntil) {
    demo(now, true);
    status.textContent = 'Cámara desactivada. Presiona C para activarla.';
  }
  dancers?.draw(now, delta);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

if (dancers) {
  demo(clock(), true);
  void startCamera();
}
