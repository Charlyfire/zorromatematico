export interface CropFraming {
  zoom: number; // 1.0 to 2.5
  offsetX: number; // -0.5 to 0.5
  offsetY: number; // -0.5 to 0.5
  removeBackground: boolean;
  bgTolerance: number; // 15 to 70
}

export interface ProcessedImageResult {
  src: string;
  silhouetteSrc?: string;
  hasTransparency: boolean;
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function floodFillRemoveBackground(imageData: ImageData, tolerance: number): void {
  const { data, width, height } = imageData;
  // Sample 4 corners to estimate background color
  const corners = [
    0,
    (width - 1) * 4,
    (height - 1) * width * 4,
    ((height - 1) * width + (width - 1)) * 4,
  ];
  let sumR = 0,
    sumG = 0,
    sumB = 0,
    opaqueCorners = 0;
  for (const idx of corners) {
    if (data[idx + 3] > 200) {
      sumR += data[idx];
      sumG += data[idx + 1];
      sumB += data[idx + 2];
      opaqueCorners++;
    }
  }
  if (opaqueCorners === 0) return;
  const bgR = sumR / opaqueCorners;
  const bgG = sumG / opaqueCorners;
  const bgB = sumB / opaqueCorners;

  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const matchesBg = (pIdx: number) => {
    const i = pIdx * 4;
    if (data[i + 3] < 20) return true;
    const dr = Math.abs(data[i] - bgR);
    const dg = Math.abs(data[i + 1] - bgG);
    const db = Math.abs(data[i + 2] - bgB);
    return dr <= tolerance && dg <= tolerance && db <= tolerance;
  };

  const enqueue = (x: number, y: number) => {
    const p = y * width + x;
    if (!visited[p] && matchesBg(p)) {
      visited[p] = 1;
      queue[tail++] = p;
    }
  };

  // Seed all border pixels
  for (let x = 0; x < width; x++) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (head < tail) {
    const p = queue[head++];
    const x = p % width;
    const y = (p - x) / width;
    data[p * 4 + 3] = 0;

    if (x > 0) enqueue(x - 1, y);
    if (x < width - 1) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y < height - 1) enqueue(x, y + 1);
  }
}

export async function processImageWithFraming(
  rawDataUrl: string,
  framing: CropFraming,
  outputSize = 512,
  mode: 'contain' | 'cover' = 'contain'
): Promise<ProcessedImageResult> {
  const img = await loadImageElement(rawDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');

  ctx.clearRect(0, 0, outputSize, outputSize);

  const padding = mode === 'contain' ? outputSize * 0.06 : 0;
  const avail = outputSize - padding * 2;
  const baseScale =
    mode === 'contain'
      ? Math.min(avail / img.width, avail / img.height)
      : Math.max(outputSize / img.width, outputSize / img.height);

  const scale = baseScale * framing.zoom;
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const drawX = (outputSize - drawW) / 2 + framing.offsetX * outputSize * 0.6;
  const drawY = (outputSize - drawH) / 2 + framing.offsetY * outputSize * 0.6;

  ctx.drawImage(img, drawX, drawY, drawW, drawH);

  const imgData = ctx.getImageData(0, 0, outputSize, outputSize);
  if (framing.removeBackground && mode === 'contain') {
    floodFillRemoveBackground(imgData, framing.bgTolerance);
    ctx.putImageData(imgData, 0, 0);
  }

  // Check if image has transparent background pixels (so a silhouette makes sense!)
  let transparentCount = 0;
  let opaqueCount = 0;
  for (let i = 3; i < imgData.data.length; i += 4) {
    if (imgData.data[i] < 24) transparentCount++;
    else if (imgData.data[i] > 180) opaqueCount++;
  }
  const totalPixels = outputSize * outputSize;
  const hasTransparency = transparentCount / totalPixels > 0.08 && opaqueCount > 200;

  const src = canvas.toDataURL('image/png');

  let silhouetteSrc: string | undefined;
  if (hasTransparency && mode === 'contain') {
    const silCanvas = document.createElement('canvas');
    silCanvas.width = outputSize;
    silCanvas.height = outputSize;
    const silCtx = silCanvas.getContext('2d');
    if (silCtx) {
      const silData = silCtx.createImageData(outputSize, outputSize);
      const sd = silData.data;
      const srcD = imgData.data;
      for (let i = 0; i < srcD.length; i += 4) {
        const a = srcD[i + 3];
        if (a > 18) {
          sd[i] = 43;
          sd[i + 1] = 54;
          sd[i + 2] = 72;
          sd[i + 3] = a >= 220 ? 255 : Math.round(((a - 18) / (220 - 18)) * 255);
        }
      }
      silCtx.putImageData(silData, 0, 0);
      silhouetteSrc = silCanvas.toDataURL('image/png');
    }
  }

  return { src, silhouetteSrc, hasTransparency };
}

export async function generateSilhouetteFromImageUrl(dataUrl: string): Promise<string | undefined> {
  const result = await processImageWithFraming(
    dataUrl,
    { zoom: 1, offsetX: 0, offsetY: 0, removeBackground: false, bgTolerance: 30 },
    512,
    'contain'
  );
  return result.silhouetteSrc;
}

/**
 * Extracts a crisp zoomed fragment (crop) from a distinctive, detail-rich region of an image
 * for Correspondencias visuales — Avanzado («reconocer a qué imagen pertenece un fragmento»).
 */
export async function extractImageFragmentDataUrl(src: string): Promise<string> {
  const img = await loadImageElement(src);
  const size = 256;
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = size;
  srcCanvas.height = size;
  const sctx = srcCanvas.getContext('2d');
  if (!sctx) return src;

  sctx.clearRect(0, 0, size, size);
  const scale = Math.min((size - 12) / img.width, (size - 12) / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  sctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);

  const imgData = sctx.getImageData(0, 0, size, size).data;

  // 1. Find tight opaque bounding box so thin or small objects are cropped accurately
  let minX = size, maxX = 0, minY = size, maxY = 0;
  let totalOpaque = 0;
  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      const a = imgData[(y * size + x) * 4 + 3];
      if (a > 120) {
        totalOpaque++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (totalOpaque < 40 || maxX <= minX || maxY <= minY) return src;

  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const win = Math.max(82, Math.min(124, Math.round(Math.max(bw, bh) * 0.48)));

  const startX = Math.max(0, Math.min(size - win, minX - 8));
  const endX = Math.max(startX, Math.min(size - win, maxX - win + 8));
  const startY = Math.max(0, Math.min(size - win, minY - 8));
  const endY = Math.max(startY, Math.min(size - win, maxY - win + 8));

  const step = 10;
  interface CandidateWin {
    x: number;
    y: number;
    score: number;
  }
  const candidates: CandidateWin[] = [];

  for (let y = startY; y <= endY; y += step) {
    for (let x = startX; x <= endX; x += step) {
      let opaque = 0;
      let count = 0;
      let sumR = 0, sumG = 0, sumB = 0;
      let sumR2 = 0, sumG2 = 0, sumB2 = 0;
      let edgeEnergy = 0;
      let edgeSamples = 0;

      for (let dy = 0; dy < win; dy += 4) {
        for (let dx = 0; dx < win; dx += 4) {
          const px = x + dx;
          const py = y + dy;
          const i = (py * size + px) * 4;
          count++;
          const a = imgData[i + 3];
          if (a > 180) {
            opaque++;
            const r = imgData[i];
            const g = imgData[i + 1];
            const b = imgData[i + 2];
            sumR += r; sumG += g; sumB += b;
            sumR2 += r * r; sumG2 += g * g; sumB2 += b * b;
          }
          // Measure local color/alpha gradient (captures edges, stripes, windows, rays, contours!)
          if (dx + 4 < win && dy + 4 < win) {
            const ir = (py * size + (px + 4)) * 4;
            const id = ((py + 4) * size + px) * 4;
            const dRight =
              Math.abs(imgData[i] - imgData[ir]) +
              Math.abs(imgData[i + 1] - imgData[ir + 1]) +
              Math.abs(imgData[i + 2] - imgData[ir + 2]) +
              Math.abs(a - imgData[ir + 3]);
            const dDown =
              Math.abs(imgData[i] - imgData[id]) +
              Math.abs(imgData[i + 1] - imgData[id + 1]) +
              Math.abs(imgData[i + 2] - imgData[id + 2]) +
              Math.abs(a - imgData[id + 3]);
            edgeEnergy += dRight + dDown;
            edgeSamples++;
          }
        }
      }

      const opacityRatio = opaque / Math.max(1, count);
      if (opacityRatio < 0.22) continue;

      const inv = 1 / Math.max(1, opaque);
      const varR = Math.max(0, sumR2 * inv - (sumR * inv) ** 2);
      const varG = Math.max(0, sumG2 * inv - (sumG * inv) ** 2);
      const varB = Math.max(0, sumB2 * inv - (sumB * inv) ** 2);
      const colorStd = Math.sqrt((varR + varG + varB) / 3);
      const avgEdge = edgeEnergy / Math.max(1, edgeSamples);

      // Sweet-spot opacity bonus: 0.45..0.88 shows recognizable contour + interior texture
      // instead of a blank corner or a featureless 100% solid monochrome patch
      const idealOpacity = 0.68;
      const opacityScore = Math.max(0, 1 - Math.abs(opacityRatio - idealOpacity) / 0.55) * 420;
      const detailScore = colorStd * 7.5 + avgEdge * 1.4;
      const score = opacityScore + detailScore;

      candidates.push({ x, y, score });
    }
  }

  let bestX = Math.max(0, Math.min(size - win, Math.round((minX + maxX - win) / 2)));
  let bestY = Math.max(0, Math.min(size - win, Math.round((minY + maxY - win) / 2)));

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    const topPool = candidates.slice(0, Math.min(3, candidates.length));
    const chosen = topPool[Math.floor(Math.random() * topPool.length)];
    bestX = chosen.x;
    bestY = chosen.y;
  }

  const outCanvas = document.createElement('canvas');
  outCanvas.width = 256;
  outCanvas.height = 256;
  const octx = outCanvas.getContext('2d');
  if (!octx) return src;
  octx.fillStyle = '#FFFDF8';
  octx.fillRect(0, 0, 256, 256);
  octx.drawImage(srcCanvas, bestX, bestY, win, win, 0, 0, 256, 256);
  return outCanvas.toDataURL('image/png');
}

export interface SlicedSheetPiece {
  index: number;
  row: number;
  col: number;
  src: string;
  silhouetteSrc?: string;
  hasTransparency: boolean;
  defaultName: string;
}

/**
 * Slices a grid sheet (e.g. 2x4 = 8 drawings) in-browser into centered 512x512 cutouts + silhouettes.
 * Handles both already-transparent PNG sheets and opaque white-background sheets (including soft drop shadows).
 */
export async function sliceSheetIntoPieces(
  rawDataUrl: string,
  options: {
    rows: number;
    cols: number;
    removeWhiteBg: boolean;
    bgTolerance: number;
    mode: 'piece' | 'scenario';
    baseLabel: string;
  }
): Promise<SlicedSheetPiece[]> {
  const img = await loadImageElement(rawDataUrl);
  const fullW = img.width;
  const fullH = img.height;
  const cellW = Math.floor(fullW / options.cols);
  const cellH = Math.floor(fullH / options.rows);

  const fullCanvas = document.createElement('canvas');
  fullCanvas.width = fullW;
  fullCanvas.height = fullH;
  const fullCtx = fullCanvas.getContext('2d');
  if (!fullCtx) throw new Error('Canvas no disponible');
  fullCtx.drawImage(img, 0, 0);

  const results: SlicedSheetPiece[] = [];
  const OUT_SIZE = 512;
  const INNER_MAX = 460;

  let idx = 0;
  for (let r = 0; r < options.rows; r++) {
    for (let c = 0; c < options.cols; c++) {
      idx++;
      const x0 = c * cellW;
      const y0 = r * cellH;
      const cw = c === options.cols - 1 ? fullW - x0 : cellW;
      const ch = r === options.rows - 1 ? fullH - y0 : cellH;

      const cellCanvas = document.createElement('canvas');
      cellCanvas.width = cw;
      cellCanvas.height = ch;
      const cellCtx = cellCanvas.getContext('2d');
      if (!cellCtx) continue;
      cellCtx.drawImage(fullCanvas, x0, y0, cw, ch, 0, 0, cw, ch);

      const cellData = cellCtx.getImageData(0, 0, cw, ch);
      const d = cellData.data;

      if (options.mode === 'piece' && options.removeWhiteBg) {
        // Check if cell already has substantial transparency; if not, flood-fill white + soft gray shadows
        let alreadyTrans = 0;
        for (let i = 3; i < d.length; i += 4) if (d[i] < 20) alreadyTrans++;
        if (alreadyTrans / (cw * ch) < 0.15) {
          const thresh = Math.max(180, 255 - options.bgTolerance);
          const visited = new Uint8Array(cw * ch);
          const queue = new Int32Array(cw * ch);
          let head = 0;
          let tail = 0;
          const isBg = (p: number) => {
            const i = p * 4;
            if (d[i + 3] < 20) return true;
            const red = d[i], grn = d[i + 1], blu = d[i + 2];
            const minC = Math.min(red, grn, blu);
            const maxC = Math.max(red, grn, blu);
            if (minC >= thresh) return true;
            if (minC >= Math.max(205, thresh - 18) && maxC - minC <= 18) return true;
            return false;
          };
          const enq = (x: number, y: number) => {
            const p = y * cw + x;
            if (!visited[p] && isBg(p)) {
              visited[p] = 1;
              queue[tail++] = p;
            }
          };
          for (let x = 0; x < cw; x++) { enq(x, 0); enq(x, ch - 1); }
          for (let y = 0; y < ch; y++) { enq(0, y); enq(cw - 1, y); }
          while (head < tail) {
            const p = queue[head++];
            d[p * 4 + 3] = 0;
            const x = p % cw;
            const y = (p - x) / cw;
            if (x > 0) enq(x - 1, y);
            if (x < cw - 1) enq(x + 1, y);
            if (y > 0) enq(x, y - 1);
            if (y < ch - 1) enq(x, y + 1);
          }
          cellCtx.putImageData(cellData, 0, 0);
        }
      }

      // Compute tight bounding box
      let minX = cw, maxX = 0, minY = ch, maxY = 0;
      let opaqueCount = 0;
      let transCount = 0;
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          const i = (y * cw + x) * 4;
          const isContent =
            options.mode === 'scenario'
              ? d[i] < 245 || d[i + 1] < 245 || d[i + 2] < 245
              : d[i + 3] > 18;
          if (d[i + 3] < 24) transCount++;
          if (isContent) {
            opaqueCount++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (opaqueCount < 80 || maxX <= minX || maxY <= minY) continue;

      const pad = options.mode === 'scenario' ? 0 : 4;
      const sx = Math.max(0, minX - pad);
      const sy = Math.max(0, minY - pad);
      const sw = Math.min(cw - sx, maxX - minX + 1 + pad * 2);
      const sh = Math.min(ch - sy, maxY - minY + 1 + pad * 2);

      const outCanvas = document.createElement('canvas');
      outCanvas.width = OUT_SIZE;
      outCanvas.height = OUT_SIZE;
      const outCtx = outCanvas.getContext('2d');
      if (!outCtx) continue;
      outCtx.clearRect(0, 0, OUT_SIZE, OUT_SIZE);

      if (options.mode === 'scenario') {
        const scale = Math.max(OUT_SIZE / sw, OUT_SIZE / sh);
        const dw = sw * scale;
        const dh = sh * scale;
        outCtx.drawImage(cellCanvas, sx, sy, sw, sh, (OUT_SIZE - dw) / 2, (OUT_SIZE - dh) / 2, dw, dh);
      } else {
        const scale = Math.min(INNER_MAX / sw, INNER_MAX / sh);
        const dw = sw * scale;
        const dh = sh * scale;
        outCtx.drawImage(cellCanvas, sx, sy, sw, sh, (OUT_SIZE - dw) / 2, (OUT_SIZE - dh) / 2, dw, dh);
      }

      const src = outCanvas.toDataURL('image/png');
      const hasTransparency = transCount / (cw * ch) > 0.08;
      let silhouetteSrc: string | undefined;

      if (options.mode === 'piece' && hasTransparency) {
        const finalImgData = outCtx.getImageData(0, 0, OUT_SIZE, OUT_SIZE).data;
        const silCanvas = document.createElement('canvas');
        silCanvas.width = OUT_SIZE;
        silCanvas.height = OUT_SIZE;
        const silCtx = silCanvas.getContext('2d');
        if (silCtx) {
          const silImg = silCtx.createImageData(OUT_SIZE, OUT_SIZE);
          const sd = silImg.data;
          for (let i = 0; i < finalImgData.length; i += 4) {
            const a = finalImgData[i + 3];
            if (a > 18) {
              sd[i] = 43;
              sd[i + 1] = 54;
              sd[i + 2] = 72;
              sd[i + 3] = a >= 220 ? 255 : Math.round(((a - 18) / (220 - 18)) * 255);
            }
          }
          silCtx.putImageData(silImg, 0, 0);
          silhouetteSrc = silCanvas.toDataURL('image/png');
        }
      }

      results.push({
        index: idx,
        row: r,
        col: c,
        src,
        silhouetteSrc,
        hasTransparency,
        defaultName: `${options.baseLabel} ${idx}`,
      });
    }
  }

  return results;
}
