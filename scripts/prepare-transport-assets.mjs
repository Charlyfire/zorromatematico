import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const IMG_DIR = path.join(ROOT, 'imágenes');
const OUT_DIR = path.join(ROOT, 'public', 'assets', 'transportes');

const VEHICLES = [
  { id: 'bicicleta', name: 'Bicicleta', row: 0, col: 0 },
  { id: 'autobus', name: 'Autobús', row: 0, col: 1 },
  { id: 'tren', name: 'Tren', row: 0, col: 2 },
  { id: 'ambulancia', name: 'Ambulancia', row: 0, col: 3 },
  { id: 'velero', name: 'Velero', row: 1, col: 0 },
  { id: 'avion', name: 'Avión', row: 1, col: 1 },
  { id: 'helicoptero', name: 'Helicóptero', row: 1, col: 2 },
  { id: 'globo', name: 'Globo aerostático', row: 1, col: 3 },
];

const SCENARIOS = [
  { id: 'tierra', name: 'Tierra', row: 0, col: 0 },
  { id: 'agua', name: 'Agua', row: 0, col: 1 },
  { id: 'aire', name: 'Aire', row: 0, col: 2 },
];

function findValleys(projection, count) {
  // Find `count` split indices roughly evenly spaced by picking lowest density near expected split
  const len = projection.length;
  const splits = [0];
  for (let i = 1; i < count; i++) {
    const center = Math.round((len * i) / count);
    const radius = Math.round(len / (count * 4));
    let bestIdx = center;
    let bestVal = Infinity;
    for (let k = Math.max(0, center - radius); k <= Math.min(len - 1, center + radius); k++) {
      if (projection[k] < bestVal) {
        bestVal = projection[k];
        bestIdx = k;
      }
    }
    splits.push(bestIdx);
  }
  splits.push(len);
  return splits;
}

async function prepareVehicles() {
  const sheetPath = path.join(IMG_DIR, 'Ocho medios de transporte ilustrados.png');
  const { data, info } = await sharp(sheetPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  const rowProj = new Int32Array(height);
  const colProj = new Int32Array(width);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3];
      if (a > 24) {
        rowProj[y]++;
        colProj[x]++;
      }
    }
  }

  const rowSplits = findValleys(rowProj, 2);
  const colSplits = findValleys(colProj, 4);
  console.log('Vehicle sheet splits:', { width, height, rowSplits, colSplits });

  const CANVAS_SIZE = 512;
  const INNER_MAX = 468; // 22px safe margin all around

  for (const v of VEHICLES) {
    const y0 = rowSplits[v.row];
    const y1 = rowSplits[v.row + 1];
    const x0 = colSplits[v.col];
    const x1 = colSplits[v.col + 1];

    // Find tight bounding box inside this cell where alpha > 20
    let minX = x1, maxX = x0, minY = y1, maxY = y0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const a = data[(y * width + x) * 4 + 3];
        if (a > 20) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Add 4px safety padding inside cell bounds
    const pad = 4;
    const cropLeft = Math.max(x0, minX - pad);
    const cropTop = Math.max(y0, minY - pad);
    const cropRight = Math.min(x1 - 1, maxX + pad);
    const cropBottom = Math.min(y1 - 1, maxY + pad);
    const cropW = cropRight - cropLeft + 1;
    const cropH = cropBottom - cropTop + 1;

    // Extract raw RGBA and clean faint alpha noise (<= 14 -> 0)
    const rawCut = Buffer.alloc(cropW * cropH * 4);
    for (let y = 0; y < cropH; y++) {
      for (let x = 0; x < cropW; x++) {
        const srcIdx = ((cropTop + y) * width + (cropLeft + x)) * 4;
        const dstIdx = (y * cropW + x) * 4;
        const a = data[srcIdx + 3];
        if (a <= 14) {
          rawCut[dstIdx] = 0;
          rawCut[dstIdx + 1] = 0;
          rawCut[dstIdx + 2] = 0;
          rawCut[dstIdx + 3] = 0;
        } else {
          rawCut[dstIdx] = data[srcIdx];
          rawCut[dstIdx + 1] = data[srcIdx + 1];
          rawCut[dstIdx + 2] = data[srcIdx + 2];
          // Gently normalize 242..255 to 255 so solid painted strokes are fully opaque
          rawCut[dstIdx + 3] = a >= 242 ? 255 : a;
        }
      }
    }

    // Resize proportionally to fit inside INNER_MAX x INNER_MAX and center on CANVAS_SIZE x CANVAS_SIZE
    const resizedBuf = await sharp(rawCut, { raw: { width: cropW, height: cropH, channels: 4 } })
      .resize(INNER_MAX, INNER_MAX, {
        fit: 'inside',
        kernel: sharp.kernel.lanczos3,
      })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const rw = resizedBuf.info.width;
    const rh = resizedBuf.info.height;
    const offsetX = Math.floor((CANVAS_SIZE - rw) / 2);
    const offsetY = Math.floor((CANVAS_SIZE - rh) / 2);

    const canvasRaw = Buffer.alloc(CANVAS_SIZE * CANVAS_SIZE * 4);
    const silRaw = Buffer.alloc(CANVAS_SIZE * CANVAS_SIZE * 4);
    // Warm deep board-game slate color for silhouette (#2B3648)
    const SIL_R = 43;
    const SIL_G = 54;
    const SIL_B = 72;

    for (let y = 0; y < rh; y++) {
      for (let x = 0; x < rw; x++) {
        const sIdx = (y * rw + x) * 4;
        const dIdx = ((offsetY + y) * CANVAS_SIZE + (offsetX + x)) * 4;
        const a = resizedBuf.data[sIdx + 3];
        if (a > 10) {
          canvasRaw[dIdx] = resizedBuf.data[sIdx];
          canvasRaw[dIdx + 1] = resizedBuf.data[sIdx + 1];
          canvasRaw[dIdx + 2] = resizedBuf.data[sIdx + 2];
          canvasRaw[dIdx + 3] = a;

          // Silhouette uses uniform color and preserves exact alpha / transparent gaps
          const silA = a >= 220 ? 255 : a < 18 ? 0 : Math.round(((a - 18) / (220 - 18)) * 255);
          silRaw[dIdx] = SIL_R;
          silRaw[dIdx + 1] = SIL_G;
          silRaw[dIdx + 2] = SIL_B;
          silRaw[dIdx + 3] = silA;
        }
      }
    }

    const outImgPath = path.join(OUT_DIR, `${v.id}.png`);
    const outSilPath = path.join(OUT_DIR, `${v.id}-silueta.png`);

    await sharp(canvasRaw, { raw: { width: CANVAS_SIZE, height: CANVAS_SIZE, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toFile(outImgPath);

    await sharp(silRaw, { raw: { width: CANVAS_SIZE, height: CANVAS_SIZE, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toFile(outSilPath);

    console.log(`Generated ${v.id}: crop ${cropW}x${cropH} from (${cropLeft},${cropTop}) -> ${CANVAS_SIZE}x${CANVAS_SIZE}`);
  }
}

async function prepareScenarios() {
  const sheetPath = path.join(IMG_DIR, 'Lotto de paisajes para preescolar-4.png');
  const { data, info } = await sharp(sheetPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  // Detect non-white pixels (r < 245 || g < 245 || b < 245)
  const rowProj = new Int32Array(height);
  const colProj = new Int32Array(width);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i] < 242 || data[i + 1] < 242 || data[i + 2] < 242) {
        rowProj[y]++;
        colProj[x]++;
      }
    }
  }

  const rowSplits = findValleys(rowProj, 2);
  const colSplits = findValleys(colProj, 4);
  console.log('Scenario sheet splits:', { width, height, rowSplits, colSplits });

  for (const s of SCENARIOS) {
    const y0 = rowSplits[s.row];
    const y1 = rowSplits[s.row + 1];
    const x0 = colSplits[s.col];
    const x1 = colSplits[s.col + 1];

    // Find tight non-white rectangle of the painted tile
    const tileRowCount = new Int32Array(y1 - y0);
    const tileColCount = new Int32Array(x1 - x0);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * width + x) * 4;
        if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) {
          tileRowCount[y - y0]++;
          tileColCount[x - x0]++;
        }
      }
    }

    const rowThresh = (x1 - x0) * 0.4;
    const colThresh = (y1 - y0) * 0.4;
    let minY = 0, maxY = tileRowCount.length - 1;
    while (minY < maxY && tileRowCount[minY] < rowThresh) minY++;
    while (maxY > minY && tileRowCount[maxY] < rowThresh) maxY--;

    let minX = 0, maxX = tileColCount.length - 1;
    while (minX < maxX && tileColCount[minX] < colThresh) minX++;
    while (maxX > minX && tileColCount[maxX] < colThresh) maxX--;

    // Inset 2px to avoid any white gutter anti-aliasing edge
    const left = x0 + minX + 2;
    const top = y0 + minY + 2;
    const w = maxX - minX - 3;
    const h = maxY - minY - 3;

    const outPath = path.join(OUT_DIR, `escenario-${s.id}.png`);
    await sharp(sheetPath)
      .extract({ left, top, width: w, height: h })
      .resize(512, 512, { fit: 'cover' })
      .png({ compressionLevel: 9 })
      .toFile(outPath);

    console.log(`Generated escenario-${s.id}: crop ${w}x${h} from (${left},${top}) -> 512x512`);
  }
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await prepareVehicles();
  await prepareScenarios();

  // Also create a visual verification contact sheet in scratch dir? Let's keep public clean.
  console.log('All transport assets generated successfully!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
