import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import simdLoader from '../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.js?url';
import simdBinary from '../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm?url';
import fallbackLoader from '../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_nosimd_internal.js?url';
import fallbackBinary from '../node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_nosimd_internal.wasm?url';

const FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
const SAMPLE_SIZE = 48;
const CAPTURE_WINDOW = 1150;
const TRACK_TIMEOUT = 700;

export async function loadLandmarker() {
  const simd = await FilesetResolver.isSimdSupported();
  const files = {
    wasmLoaderPath: simd ? simdLoader : fallbackLoader,
    wasmBinaryPath: simd ? simdBinary : fallbackBinary,
  };
  return FaceLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: new URL('models/face_landmarker.task', document.baseURI).href },
    runningMode: 'VIDEO',
    numFaces: 2,
    minFaceDetectionConfidence: 0.6,
    minFacePresenceConfidence: 0.6,
  });
}

export function createCapture(video, detector, publish) {
  const sample = document.createElement('canvas');
  sample.width = sample.height = SAMPLE_SIZE;
  const context = sample.getContext('2d', { willReadFrequently: true });
  const luminance = new Float32Array(SAMPLE_SIZE ** 2);
  let tracks = [];
  let lastFrame = -1;
  let lastScan = -Infinity;

  function scan(now) {
    if (video.readyState < 2 || now - lastScan < 83 || video.currentTime === lastFrame) return;
    lastScan = now;
    lastFrame = video.currentTime;

    tracks = tracks.filter(track => now - track.seen < TRACK_TIMEOUT);
    const { faceLandmarks } = detector.detectForVideo(video, now);
    const faces = faceLandmarks.map(points => describeFace(points, video.videoWidth, video.videoHeight));
    const pairs = [];
    for (const face of faces) {
      for (const track of tracks) {
        const elapsed = Math.min(170, now - track.seen);
        const distance = Math.hypot(
          face.x - track.x - track.vx * elapsed,
          face.y - track.y - track.vy * elapsed,
        );
        if (distance < Math.max(28, Math.min(face.width, track.width) * 0.75)) {
          pairs.push({ face, track, distance });
        }
      }
    }
    pairs.sort((first, second) => first.distance - second.distance);
    const assigned = new Map();
    const usedTracks = new Set();
    for (const { face, track } of pairs) {
      if (assigned.has(face) || usedTracks.has(track)) continue;
      assigned.set(face, track);
      usedTracks.add(track);
    }

    for (const face of faces) {
      let track = assigned.get(face);
      if (!track) {
        track = { x: face.x, y: face.y, width: face.width, vx: 0, vy: 0, start: now, seen: now, samples: 0, score: -Infinity };
        tracks.push(track);
      }
      const elapsed = Math.max(1, now - track.seen);
      track.vx = 0.65 * track.vx + 0.35 * (face.x - track.x) / elapsed;
      track.vy = 0.65 * track.vy + 0.35 * (face.y - track.y) / elapsed;
      Object.assign(track, { x: face.x, y: face.y, width: face.width, seen: now });
      if (track.emitted) continue;
      if (now - track.start > 2600) {
        Object.assign(track, { start: now, samples: 0, score: -Infinity, best: null });
      }
      if (face.usable) {
        drawFace(context, video, face, SAMPLE_SIZE, SAMPLE_SIZE, false);
        const score = scoreFrame(context, luminance, face);
        if (score !== null) {
          track.samples++;
          if (score > track.score) {
            track.score = score;
            track.best = makePortrait(video, face);
          }
        }
      }
      if (track.best && track.samples >= 3 && now - track.start >= CAPTURE_WINDOW && publish(track.best)) {
        track.emitted = true;
        track.best = null;
      }
    }

    // A person who walks out of frame may still have provided a usable portrait.
    for (const track of tracks) {
      if (now - track.seen < 270 || track.emitted || !track.best || track.samples < 3) continue;
      if (publish(track.best)) {
        track.emitted = true;
        track.best = null;
      }
    }
  }

  return {
    scan,
    get collecting() { return tracks.some(track => !track.emitted && track.best); },
    clear() { tracks = []; context.clearRect(0, 0, SAMPLE_SIZE, SAMPLE_SIZE); },
  };
}

function describeFace(points, width, height) {
  const pixel = index => [points[index].x * width, points[index].y * height];
  const leftEye = pixel(33);
  const rightEye = pixel(263);
  const angle = Math.atan2(rightEye[1] - leftEye[1], rightEye[0] - leftEye[0]);
  const [x, y] = pixel(168);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const oval = FACE_OVAL.map(index => {
    const [px, py] = pixel(index);
    return [(px - x) * cos + (py - y) * sin, -(px - x) * sin + (py - y) * cos];
  });
  const minX = Math.min(...oval.map(point => point[0]));
  const minY = Math.min(...oval.map(point => point[1]));
  const faceWidth = Math.max(...oval.map(point => point[0])) - minX;
  const faceHeight = Math.max(...oval.map(point => point[1])) - minY;
  const leftCheek = pixel(234);
  const rightCheek = pixel(454);
  const nose = pixel(1);
  const leftDistance = Math.hypot(nose[0] - leftCheek[0], nose[1] - leftCheek[1]);
  const rightDistance = Math.hypot(nose[0] - rightCheek[0], nose[1] - rightCheek[1]);
  const frontal = Math.min(leftDistance, rightDistance) / Math.max(leftDistance, rightDistance, 1);
  const inFrame = FACE_OVAL.every(index => {
    const point = points[index];
    return point.x > 0.015 && point.x < 0.985 && point.y > 0.015 && point.y < 0.985;
  });

  return {
    x, y, angle, oval, minX, minY, width: faceWidth, height: faceHeight, frontal,
    usable: inFrame && faceWidth >= 58 && faceHeight >= 62 && Math.abs(angle) < 0.6 && frontal > 0.47,
  };
}

function drawFace(context, video, face, width, height, clip) {
  const pad = clip ? 0.018 : -0.08;
  const scaleX = width * (1 - 2 * pad) / face.width;
  const scaleY = height * (1 - 2 * pad) / face.height;

  context.clearRect(0, 0, width, height);
  context.save();
  context.translate(width * pad, height * pad);
  context.scale(scaleX, scaleY);
  context.translate(-face.minX, -face.minY);
  if (clip) {
    context.beginPath();
    face.oval.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
    context.closePath();
    context.clip();
  }
  context.rotate(-face.angle);
  context.translate(-face.x, -face.y);
  context.drawImage(video, 0, 0);
  context.restore();
}

function scoreFrame(context, luminance, face) {
  const pixels = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
  for (let index = 0; index < luminance.length; index++) {
    const offset = index * 4;
    luminance[index] = 0.2126 * pixels[offset] + 0.7152 * pixels[offset + 1] + 0.0722 * pixels[offset + 2];
  }
  let sum = 0;
  let detail = 0;
  let count = 0;
  // Score the eyes, nose and mouth area, excluding the boundary of the crop.
  for (let y = 12; y < 39; y++) {
    for (let x = 10; x < 38; x++) {
      const offset = y * SAMPLE_SIZE + x;
      const center = luminance[offset];
      const laplacian = 4 * center - luminance[offset - 1] - luminance[offset + 1]
        - luminance[offset - SAMPLE_SIZE] - luminance[offset + SAMPLE_SIZE];
      sum += center;
      detail += laplacian ** 2;
      count++;
    }
  }
  const brightness = sum / count;
  if (brightness < 32 || brightness > 235 || detail / count < 8) return null;
  return Math.log1p(detail / count) + face.frontal * 1.25 + Math.min(face.width, 220) / 220
    - Math.abs(brightness - 129) / 175;
}

function makePortrait(video, face) {
  const portrait = document.createElement('canvas');
  portrait.width = 256;
  portrait.height = 320;
  drawFace(portrait.getContext('2d'), video, face, portrait.width, portrait.height, true);
  return portrait;
}

