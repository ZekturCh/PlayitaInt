const WIDTH = 1200;
const HEIGHT = 560;

export function createBeach(canvas) {
  const context = canvas.getContext('2d');
  const grain = document.createElement('canvas');
  grain.width = 150;
  grain.height = 150;
  const grainContext = grain.getContext('2d');
  const pixels = grainContext.createImageData(150, 150);
  for (let offset = 0; offset < pixels.data.length; offset += 4) {
    const tone = Math.random() < 0.5 ? 45 : 255;
    pixels.data.set([tone, tone, tone, Math.random() * 27], offset);
  }
  grainContext.putImageData(pixels, 0, 0);
  const texture = context.createPattern(grain, 'repeat');

  function resize(width, height, pixelRatio) {
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
  }

  function draw(time) {
    const scale = Math.max(canvas.width / WIDTH, canvas.height / HEIGHT);
    const scaleY = canvas.height / HEIGHT;
    const inset = (canvas.width - WIDTH * scale) / 2;
    context.setTransform(scale, 0, 0, scaleY, inset, 0);
    const sky = context.createLinearGradient(0, 0, 0, 325);
    sky.addColorStop(0, '#ef9879');
    sky.addColorStop(0.65, '#ffc78c');
    sky.addColorStop(1, '#ffdfa3');
    context.fillStyle = sky;
    context.fillRect(0, 0, WIDTH, HEIGHT);

    ellipse(context, 598, 178, 116, 114, '#ffbd75');
    ellipse(context, 598, 178, 95, 95, '#ffecab');
    cloud(context, 235 + Math.sin(time * 0.17) * 27, 129, 1);
    cloud(context, 874 + Math.sin(time * 0.15 + 1) * 33, 86, 0.75);
    cloud(context, 751 + Math.sin(time * 0.13) * 12, 194, 0.42);
    island(context, 67, 254, 1.08);
    island(context, 1002, 256, 0.9);

    const water = context.createLinearGradient(0, 245, 0, 412);
    water.addColorStop(0, '#237e88');
    water.addColorStop(1, '#74c5a8');
    context.fillStyle = water;
    context.fillRect(0, 251, WIDTH, 235);

    for (let index = 0; index < 52; index++) {
      const x = (index * 137.6) % WIDTH;
      const y = 259 + (index * 23.72) % 132;
      const length = 18 + (index * 19) % 78;
      context.globalAlpha = 0.24 + 0.19 * Math.sin(time * 1.25 + index);
      ellipse(context, x + Math.sin(time * 0.72 + index) * 12, y, length, 1.2 + y / 375, '#e7f6c2');
    }
    context.globalAlpha = 1;

    const sand = context.createLinearGradient(0, 340, 0, HEIGHT);
    sand.addColorStop(0, '#ffe0a0');
    sand.addColorStop(0.55, '#ffc580');
    sand.addColorStop(1, '#efa175');
    shore(context, 370 + Math.sin(time * 1.05) * 7, '#f8f3bd');
    shore(context, 382 + Math.sin(time * 1.05) * 5, '#ffdda2');
    shore(context, 396, sand);

    for (let index = 0; index < 160; index++) {
      const x = (index * 143.13) % WIDTH;
      const y = 409 + (index * 19.19) % 151;
      context.globalAlpha = 0.18;
      ellipse(context, x, y, 1 + index % 4, 0.55 + index % 3 * 0.28, index % 2 ? '#9c4e48' : '#fff1bf');
    }
    context.globalAlpha = 1;

    const narrow = canvas.width / canvas.height < 1.5;
    if (narrow) {
      palm(context, 430, 525, 0.79, time);
      palm(context, 790, 510, -0.66, time + 1);
      beachPlant(context, 442, 552, 0.95);
      beachPlant(context, 764, 543, -0.83);
    } else {
      palm(context, 144, 502, 1.15, time);
      palm(context, 1035, 499, -0.83, time + 1);
      palm(context, 1132, 536, -1.25, time + 2);
      beachPlant(context, 83, 546, 1.22);
      beachPlant(context, 205, 527, -0.72);
      beachPlant(context, 1120, 557, -1.17);
      beachPlant(context, 993, 529, 0.7);
    }

    for (let index = 0; index < 3; index++) {
      const x = 295 + index * 53 + Math.sin(time * 0.42 + index * 0.2) * 34;
      const y = 183 + index * 11;
      context.strokeStyle = '#85595e';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(x - 9, y);
      context.quadraticCurveTo(x - 4, y - 6, x, y);
      context.quadraticCurveTo(x + 5, y - 6, x + 10, y);
      context.stroke();
    }

    context.globalAlpha = 0.56;
    context.fillStyle = texture;
    context.fillRect(0, 0, WIDTH, HEIGHT);
    context.globalAlpha = 1;
  }

  return { resize, draw };
}

function ellipse(context, x, y, radiusX, radiusY, color) {
  context.fillStyle = color;
  context.beginPath();
  context.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.fill();
}

function cloud(context, x, y, scale) {
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  ellipse(context, 0, 12, 85, 12, '#ffe0ae');
  ellipse(context, -27, 4, 40, 18, '#ffe0ae');
  ellipse(context, 16, -3, 38, 27, '#ffe0ae');
  ellipse(context, 47, 7, 29, 14, '#ffe0ae');
  context.restore();
}

function island(context, x, y, scale) {
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  context.fillStyle = '#8b9d8a';
  context.beginPath();
  context.moveTo(-98, 1);
  context.bezierCurveTo(-40, -22, -54, -31, 1, -39);
  context.bezierCurveTo(33, -48, 43, -15, 107, 1);
  context.closePath();
  context.fill();
  context.restore();
}

function shore(context, y, color) {
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(-20, y - 2);
  context.bezierCurveTo(209, y - 52, 377, y + 61, 646, y + 10);
  context.bezierCurveTo(847, y - 32, 980, y - 59, 1220, y - 6);
  context.lineTo(1220, HEIGHT);
  context.lineTo(-20, HEIGHT);
  context.fill();
}

function palm(context, x, y, scale, time) {
  context.save();
  context.translate(x, y);
  context.scale(scale, Math.abs(scale));
  ellipse(context, 13, -4, 64, 12, '#be7a5880');
  context.fillStyle = '#a5634d';
  context.beginPath();
  context.moveTo(-14, 0);
  context.quadraticCurveTo(-40, -116, 28, -229);
  context.lineTo(43, -228);
  context.quadraticCurveTo(-12, -117, 13, 0);
  context.fill();
  context.strokeStyle = '#d58c61';
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(-3, -8);
  context.quadraticCurveTo(-25, -119, 34, -223);
  context.stroke();
  context.translate(35, -225);
  context.rotate(Math.sin(time * 1.1) * 0.045);
  const fronds = [
    [-2.85, 126, '#307860'], [-2.3, 117, '#408b60'], [-1.75, 100, '#5a9f63'],
    [-1.06, 124, '#4b985f'], [-0.44, 137, '#2d8060'], [0.33, 123, '#26705c'],
    [0.9, 92, '#286e5a'], [2.62, 101, '#286f56'],
  ];
  for (const [angle, length, color] of fronds) {
    context.save();
    context.rotate(angle);
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(0, 0);
    context.bezierCurveTo(length * 0.31, -43, length * 0.79, -40, length, 2);
    context.bezierCurveTo(length * 0.63, -13, length * 0.28, -8, 0, 0);
    context.fill();
    context.strokeStyle = '#c6cd723d';
    context.lineWidth = 1.4;
    context.beginPath();
    context.moveTo(0, 0);
    context.quadraticCurveTo(length * 0.56, -35, length * 0.96, 0);
    context.stroke();
    context.restore();
  }
  ellipse(context, -6, 4, 12, 12, '#795441');
  ellipse(context, 11, 5, 12, 10, '#93634a');
  context.restore();
}

function beachPlant(context, x, y, scale) {
  context.save();
  context.translate(x, y);
  context.scale(scale, Math.abs(scale));
  ellipse(context, 0, 4, 45, 8, '#b97e5b83');
  for (let index = 0; index < 7; index++) {
    const end = (index - 3) * 15;
    const rise = 25 + (index * 23) % 39;
    context.fillStyle = ['#43765b', '#62905b', '#789a5b'][index % 3];
    context.beginPath();
    context.moveTo(0, 0);
    context.quadraticCurveTo(end * 0.25 - 14, -rise * 0.9, end, -rise);
    context.quadraticCurveTo(end * 0.8 + 12, -rise * 0.49, 0, 0);
    context.fill();
  }
  context.restore();
}
