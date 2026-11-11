import * as THREE from 'three';

const DANCE_LENGTH = 11;
const TAU = Math.PI * 2;
const COLORS = [0xe76549, 0x2baca0, 0x8d75ce];
const SKINS = [0xe4a16f, 0xb97950, 0xf3bc8d];
const sphere = new THREE.SphereGeometry(1, 28, 20);
const facePlane = new THREE.PlaneGeometry(0.82, 1.03);
const shadowPlane = new THREE.PlaneGeometry(1.7, 0.45);

export function createDancers(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera();
  camera.position.set(0, 2.2, 10);
  camera.lookAt(0, 1.51, 0);

  scene.add(new THREE.HemisphereLight(0xfff1d0, 0x9f6749, 2.15));
  const light = new THREE.DirectionalLight(0xffedc5, 2.4);
  light.position.set(-3, 5, 4);
  scene.add(light);

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 96;
  const ink = shadowCanvas.getContext('2d');
  const gradient = ink.createRadialGradient(48, 48, 7, 48, 48, 48);
  gradient.addColorStop(0, '#5d333893');
  gradient.addColorStop(1, '#5d333800');
  ink.fillStyle = gradient;
  ink.fillRect(0, 0, 96, 96);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const demoFace = paintDemoFace();

  let visibleWidth = 6;
  let nextColor = 0;
  const dancers = [];

  function resize(width, height, pixelRatio) {
    const viewHeight = 4.75;
    visibleWidth = viewHeight * width / height;
    camera.left = -visibleWidth / 2;
    camera.right = visibleWidth / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
  }

  function add(face, now, { demo = false, idle = false } = {}) {
    const color = demo ? 0 : nextColor++ % COLORS.length;
    const avatar = createAvatar(face || demoFace, COLORS[color], SKINS[color], demo, shadowTexture);
    Object.assign(avatar, { start: now, demo, idle, x: 0 });
    dancers.push(avatar);
    scene.add(avatar.root);
  }

  function remove(avatar) {
    scene.remove(avatar.root);
    for (const material of avatar.materials) material.dispose();
    avatar.faceTexture.dispose();
    dancers.splice(dancers.indexOf(avatar), 1);
  }

  function clear(predicate = () => true) {
    dancers.filter(predicate).forEach(remove);
  }

  function draw(now, delta) {
    for (const dancer of [...dancers]) {
      if (!dancer.idle && now - dancer.start >= DANCE_LENGTH) remove(dancer);
    }
    const gap = Math.min(2.25, visibleWidth * 0.38);
    const scale = Math.min(1, visibleWidth / (dancers.length > 1 ? 3.35 : 1.7));
    dancers.forEach((dancer, index) => {
      const target = (index - (dancers.length - 1) / 2) * gap;
      dancer.x = THREE.MathUtils.damp(dancer.x, target, 6, delta);
      dancer.root.position.x = dancer.x;
      dancer.root.scale.setScalar(scale);
      pose(dancer, now - dancer.start, index);
    });
    renderer.render(scene, camera);
  }

  return { resize, draw, add, clear, liveCount: () => dancers.filter(dancer => !dancer.demo).length };
}

function createAvatar(face, shirtColor, skinColor, demo, shadowTexture) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  const head = new THREE.Group();
  root.add(body, head);

  const materials = [];
  const bodyMaterials = [];
  function clay(color, fades = false) {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.78 });
    materials.push(material);
    if (fades) bodyMaterials.push(material);
    return material;
  }

  const skin = clay(skinColor, true);
  const headSkin = clay(skinColor);
  const shirt = clay(shirtColor, true);
  const shorts = clay(0x18494f, true);
  const cream = clay(0xffe6b2, true);
  const sole = clay(0xe98855, true);
  const hair = clay(0x432e38);

  oval(body, shirt, 0, 1.13, 0, 0.4, 0.49, 0.26);
  oval(body, cream, 0, 1.32, 0.17, 0.14, 0.18, 0.12);
  oval(body, shorts, 0, 0.81, 0.015, 0.37, 0.24, 0.25);
  for (const side of [-1, 1]) {
    for (let index = 0; index < 3; index++) {
      const flower = oval(body, cream, side * (0.19 + index * 0.03), 1.35 - index * 0.16, 0.211, 0.052, 0.025, 0.011);
      flower.rotation.z = side * 0.6;
    }
  }

  const arms = [];
  const legs = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.32, 1.4, 0);
    body.add(arm);
    oval(arm, shirt, 0, -0.13, 0, 0.158, 0.22, 0.15);
    oval(arm, skin, 0, -0.34, 0.035, 0.1, 0.23, 0.105);
    oval(arm, skin, 0, -0.54, 0.045, 0.115, 0.125, 0.105);
    arms.push(arm);

    const leg = new THREE.Group();
    leg.position.set(side * 0.17, 0.79, 0);
    body.add(leg);
    oval(leg, shorts, 0, -0.115, 0, 0.171, 0.25, 0.177);
    oval(leg, skin, 0, -0.43, 0, 0.104, 0.27, 0.104);
    oval(leg, sole, 0, -0.72, 0.095, 0.14, 0.07, 0.24);
    oval(leg, cream, 0, -0.672, 0.095, 0.134, 0.075, 0.224);
    legs.push(leg);
    oval(head, headSkin, side * 0.413, -0.025, 0.035, 0.103, 0.144, 0.096);
  }

  oval(head, headSkin, 0, -0.01, 0, 0.448, 0.547, 0.325);
  if (demo) {
    for (let index = 0; index < 5; index++) {
      const tuft = oval(head, hair, -0.3 + index * 0.142, 0.39 + Math.sin(index / 4 * Math.PI) * 0.13, 0.049, 0.155, 0.183, 0.24);
      tuft.rotation.z = 0.33;
    }
  }

  const faceTexture = new THREE.CanvasTexture(face);
  faceTexture.colorSpace = THREE.SRGBColorSpace;
  const faceMaterial = new THREE.MeshBasicMaterial({ map: faceTexture, transparent: true, depthWrite: false });
  materials.push(faceMaterial);
  const mask = new THREE.Mesh(facePlane, faceMaterial);
  mask.position.set(0, -0.04, 0.331);
  head.add(mask);

  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: shadowTexture, transparent: true, opacity: 0.7, depthWrite: false,
  });
  materials.push(shadowMaterial);
  const shadow = new THREE.Mesh(shadowPlane, shadowMaterial);
  shadow.position.set(0, 0, -0.05);
  root.add(shadow);

  return { root, body, head, arms, legs, materials, bodyMaterials, faceTexture, shadow };
}

function oval(parent, material, x, y, z, width, height, depth) {
  const mesh = new THREE.Mesh(sphere, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(width, height, depth);
  parent.add(mesh);
  return mesh;
}

function pose(dancer, elapsed, index) {
  const beat = elapsed * 1.65 * TAU + index * 0.9;
  const step = Math.sin(beat / 2);
  const bounce = Math.abs(Math.sin(beat / 2)) * 0.145;
  const fade = dancer.idle ? 0 : THREE.MathUtils.smoothstep(elapsed, 4.3, 5.8);
  const float = dancer.idle ? 0 : THREE.MathUtils.smoothstep(elapsed, 4.4, 6.2);
  const exit = dancer.idle ? 0 : THREE.MathUtils.smoothstep(elapsed, 9.5, DANCE_LENGTH);
  const entrance = dancer.idle ? 1 : THREE.MathUtils.smoothstep(elapsed, 0, 0.53);
  const travel = step * (0.21 + float * 0.22);

  dancer.body.position.set(travel, bounce, 0);
  dancer.body.rotation.set(0.03, step * 0.17, -step * 0.13);
  dancer.body.scale.setScalar(0.96 + entrance * 0.04 - fade * 0.11);
  dancer.body.visible = fade < 1;
  for (const material of dancer.bodyMaterials) {
    material.opacity = 1 - fade;
    if (material.transparent !== (fade > 0)) {
      material.transparent = fade > 0;
      material.depthWrite = fade === 0;
      material.needsUpdate = true;
    }
  }

  dancer.arms[0].rotation.z = -0.85 - step * 0.74;
  dancer.arms[1].rotation.z = 0.85 - step * 0.74;
  dancer.arms[0].rotation.x = Math.sin(beat / 2 + 0.8) * 0.32;
  dancer.arms[1].rotation.x = -dancer.arms[0].rotation.x;
  dancer.legs[0].rotation.z = -0.14 + step * 0.36;
  dancer.legs[1].rotation.z = 0.14 + step * 0.36;
  dancer.legs[0].rotation.x = Math.cos(beat / 2) * 0.31;
  dancer.legs[1].rotation.x = -dancer.legs[0].rotation.x;

  dancer.head.position.set(travel, 1.93 + bounce + float * (0.67 + Math.sin(beat / 2) * 0.31) + exit * 0.7, 0.09);
  dancer.head.rotation.set(Math.cos(beat / 2) * 0.08, step * (0.18 + float * 0.32), step * (0.12 + float * 0.25));
  dancer.head.scale.setScalar((0.6 + entrance * 0.4) * (1 + float * 0.2) * (1 - exit));
  dancer.shadow.position.x = travel;
  dancer.shadow.material.opacity = (0.74 - float * 0.48) * (1 - exit);
}

function paintDemoFace() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');

  const fillEllipse = (x, y, rx, ry, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
    ctx.fill();
  };

  fillEllipse(128, 154, 121, 151, '#eda76f');
  fillEllipse(128, 163, 106, 133, '#f1b27e');
  fillEllipse(48, 193, 23, 14, '#e68068');
  fillEllipse(208, 193, 23, 14, '#e68068');
  fillEllipse(127, 175, 18, 18, '#de8a5f');
  ctx.strokeStyle = '#432e38';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  for (const x of [78, 178]) {
    ctx.beginPath();
    ctx.moveTo(x - 23, 115);
    ctx.quadraticCurveTo(x, 97, x + 21, 114);
    ctx.stroke();
    fillEllipse(x, 149, 12, 16, '#432e38');
    fillEllipse(x - 3, 144, 3.5, 4.5, '#fff4dc');
  }
  ctx.fillStyle = '#502e37';
  ctx.beginPath();
  ctx.moveTo(89, 212);
  ctx.quadraticCurveTo(126, 226, 167, 209);
  ctx.quadraticCurveTo(158, 255, 127, 255);
  ctx.quadraticCurveTo(100, 255, 89, 212);
  ctx.fill();
  ctx.strokeStyle = '#fff4dc';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(100, 220);
  ctx.quadraticCurveTo(128, 230, 155, 220);
  ctx.stroke();
  return canvas;
}
