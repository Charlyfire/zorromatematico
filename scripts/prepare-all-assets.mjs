import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const IMG_DIR = path.join(ROOT, 'imágenes');
const GRUPOS_DIR = path.join(IMG_DIR, 'grupos');
const OUT_DIR = path.join(ROOT, 'public', 'assets', 'banco');

const CANVAS_SIZE = 512;
const INNER_MAX = 464;
const SIL_R = 43;
const SIL_G = 54;
const SIL_B = 72;

// Individual PNGs already in imágenes/
const INDIVIDUAL_PIECES = [
  // Medios de transporte
  { file: 'bicicleta.png', id: 'tr-bicicleta' },
  { file: 'autobus.png', id: 'tr-autobus' },
  { file: 'tren.png', id: 'tr-tren' },
  { file: 'ambulacia.png', id: 'tr-ambulancia' },
  { file: 'barco.png', id: 'tr-velero' },
  { file: 'avion.png', id: 'tr-avion' },
  { file: 'helicoptero.png', id: 'tr-helicoptero' },
  { file: 'globo.png', id: 'tr-globo' },
  // El espacio
  { file: 'astronauta.png', id: 'esp-astronauta' },
  { file: 'cohete.png', id: 'esp-cohete' },
  { file: 'cometa.png', id: 'esp-cometa' },
  { file: 'luna.png', id: 'esp-luna' },
  { file: 'satelite.png', id: 'esp-satelite' },
  { file: 'saturno.png', id: 'esp-saturno' },
  { file: 'sol.png', id: 'esp-sol' },
  { file: 'tierra.png', id: 'esp-tierra' },
  // Animales de granja
  { file: 'vaca.png', id: 'grj-vaca' },
  { file: 'cerdo.png', id: 'grj-cerdo' },
  { file: 'oveja.png', id: 'grj-oveja' },
  { file: 'cabra.png', id: 'grj-cabra' },
  { file: 'caballo.png', id: 'grj-caballo' },
  { file: 'gallina.png', id: 'grj-gallina' },
  { file: 'pato.png', id: 'grj-pato' },
  { file: 'burro.png', id: 'grj-burro' },
  // Animales polares
  { file: 'oso_polar.png', id: 'pol-oso' },
  { file: 'zorro_artico.png', id: 'pol-zorro' },
  { file: 'morsa.png', id: 'pol-morsa' },
  { file: 'narval.png', id: 'pol-narval' },
  { file: 'pinguino.png', id: 'pol-pinguino' },
  { file: 'foca.png', id: 'pol-foca' },
  { file: 'reno.png', id: 'pol-reno' },
  { file: 'orca.png', id: 'pol-orca' },
  // Material escolar
  { file: 'estuche.png', id: 'esc-estuche' },
  { file: 'goma.png', id: 'esc-goma' },
  { file: 'lapiz.png', id: 'esc-lapiz' },
  { file: 'mochila.png', id: 'esc-mochila' },
  { file: 'pegamento.png', id: 'esc-pegamento' },
  { file: 'pincel.png', id: 'esc-pincel' },
  { file: 'regla.png', id: 'esc-regla' },
  { file: 'sacapuntas.png', id: 'esc-sacapuntas' },
  { file: 'tijeras.png', id: 'esc-tijeras' },
  // Ropa y complementos
  { file: 'calcetin.png', id: 'rop-calcetin' },
  { file: 'guante.png', id: 'rop-guante' },
  { file: 'gorro.png', id: 'rop-gorro' },
  { file: 'bufanda.png', id: 'rop-bufanda' },
  { file: 'bota.png', id: 'rop-bota' },
  { file: 'camiseta.png', id: 'rop-camiseta' },
  { file: 'pantalon.png', id: 'rop-pantalon' },
  // Mitades de frutas y hortalizas
  { file: 'mitad_manzana.png', id: 'fru-mitad-manzana' },
  { file: 'mitad_pera.png', id: 'fru-mitad-pera' },
  { file: 'mitad_naranja.png', id: 'fru-mitad-naranja' },
  { file: 'mitad_kiwi.png', id: 'fru-mitad-kiwi' },
  { file: 'mitad_tomate.png', id: 'fru-mitad-tomate' },
  { file: 'mitad_zanahoria.png', id: 'fru-mitad-zanahoria' },
  { file: 'mitad_pimiento.png', id: 'fru-mitad-pimiento' },
  { file: 'mitad_berenjena.png', id: 'fru-mitad-berenjena' },
  // Un paseo por el bosque
  { file: 'bellota.png', id: 'pas-bellota' },
  { file: 'castaña.png', id: 'pas-castana' },
  { file: 'hoja.png', id: 'pas-hoja' },
  { file: 'moras.png', id: 'pas-moras' },
  { file: 'piña.png', id: 'pas-pina' },
  { file: 'rama.png', id: 'pas-rama' },
  { file: 'seta.png', id: 'pas-seta' },
  { file: 'tronco.png', id: 'pas-tronco' },
];

const INDIVIDUAL_SCENARIOS = [
  { file: 'paisaje_carretera.png', id: 'esc-tierra' },
  { file: 'paisaje_mar.png', id: 'esc-agua' },
  { file: 'paisaje_cielo.png', id: 'esc-aire' },
  { file: 'paisaje_granja.png', id: 'esc-granja' },
  { file: 'paisaje_aula.png', id: 'esc-aula' },
  { file: 'paisaje_bosque.png', id: 'esc-bosque' },
  { file: 'paisaje_cocina.png', id: 'esc-cocina' },
  { file: 'paisaje_playa.png', id: 'esc-playa' },
];

const GROUP_SHEETS = [
  {
    file: 'Loto de crías de granja-2.png',
    removeWhiteBg: true,
    items: [
      { id: 'cria-ternero', row: 0, col: 0 },
      { id: 'cria-lechon', row: 0, col: 1 },
      { id: 'cria-cordero', row: 0, col: 2 },
      { id: 'cria-cabrito', row: 0, col: 3 },
      { id: 'cria-potro', row: 1, col: 0 },
      { id: 'cria-pollito', row: 1, col: 1 },
      { id: 'cria-patito', row: 1, col: 2 },
      { id: 'cria-pollino', row: 1, col: 3 },
    ],
  },
  {
    file: 'Loto de frutas y verduras-5.png',
    removeWhiteBg: true,
    items: [
      { id: 'fru-manzana', row: 0, col: 0 },
      { id: 'fru-pera', row: 0, col: 1 },
      { id: 'fru-limon', row: 0, col: 2 },
      { id: 'fru-kiwi', row: 0, col: 3 },
      { id: 'fru-tomate', row: 1, col: 0 },
      { id: 'fru-zanahoria', row: 1, col: 1 },
      { id: 'fru-pimiento', row: 1, col: 2 },
      { id: 'fru-berenjena', row: 1, col: 3 },
    ],
  },
  {
    file: 'Loto infantil de prendas de vestir-3.png',
    removeWhiteBg: true,
    items: [
      { id: 'pue-calcetin', row: 0, col: 0 },
      { id: 'pue-guante', row: 0, col: 1 },
      { id: 'pue-gorro', row: 0, col: 2 },
      { id: 'pue-bufanda', row: 0, col: 3 },
      { id: 'pue-bota', row: 1, col: 0 },
      { id: 'pue-camiseta', row: 1, col: 1 },
      { id: 'pue-mochila', row: 1, col: 2 },
      { id: 'pue-pantalon', row: 1, col: 3 },
    ],
  },
  {
    file: 'Ocho animales del bosque en cuadrícula-2.png',
    removeWhiteBg: true,
    items: [
      { id: 'abq-zorro', row: 0, col: 0 },
      { id: 'abq-ardilla', row: 0, col: 1 },
      { id: 'abq-erizo', row: 0, col: 2 },
      { id: 'abq-ciervo', row: 0, col: 3 },
      { id: 'abq-jabali', row: 1, col: 0 },
      { id: 'abq-buho', row: 1, col: 1 },
      { id: 'abq-tejon', row: 1, col: 2 },
      { id: 'abq-conejo', row: 1, col: 3 },
    ],
  },
  {
    file: 'Utensilios de cocina en cuadrícula-4.png',
    removeWhiteBg: false,
    items: [
      { id: 'coc-taza', row: 0, col: 0 },
      { id: 'coc-cuchara', row: 0, col: 1 },
      { id: 'coc-tenedor', row: 0, col: 2 },
      { id: 'coc-cazo', row: 0, col: 3 },
      { id: 'coc-colador', row: 1, col: 0 },
      { id: 'coc-jarra', row: 1, col: 1 },
      { id: 'coc-rallador', row: 1, col: 2 },
      { id: 'coc-espatula', row: 1, col: 3 },
    ],
  },
  {
    file: 'Ocho juguetes en una cuadrícula-9.png',
    removeWhiteBg: true,
    items: [
      { id: 'jug-pelota', row: 0, col: 0 },
      { id: 'jug-peonza', row: 0, col: 1 },
      { id: 'jug-dado', row: 0, col: 2 },
      { id: 'jug-cometa', row: 0, col: 3 },
      { id: 'jug-canica', row: 1, col: 0 },
      { id: 'jug-muneca', row: 1, col: 1 },
      { id: 'jug-bloque', row: 1, col: 2 },
      { id: 'jug-osito', row: 1, col: 3 },
    ],
  },
  {
    file: 'Ocho objetos de playa y mar-1.png',
    removeWhiteBg: false,
    items: [
      { id: 'pla-sombrilla', row: 0, col: 0 },
      { id: 'pla-cubo', row: 0, col: 1 },
      { id: 'pla-pala', row: 0, col: 2 },
      { id: 'pla-flotador', row: 0, col: 3 },
      { id: 'pla-toalla', row: 1, col: 0 },
      { id: 'pla-castillo', row: 1, col: 1 },
      { id: 'pla-concha', row: 1, col: 2 },
      { id: 'pla-estrella', row: 1, col: 3 },
    ],
  },
  {
    file: 'Lotería ilustrada de ocho mascotas-6.png',
    removeWhiteBg: true,
    items: [
      { id: 'mas-perro', row: 0, col: 0 },
      { id: 'mas-gato', row: 0, col: 1 },
      { id: 'mas-hamster', row: 0, col: 2 },
      { id: 'mas-periquito', row: 0, col: 3 },
      { id: 'mas-pez', row: 1, col: 0 },
      { id: 'mas-tortuga', row: 1, col: 1 },
      { id: 'mas-conejo', row: 1, col: 2 },
      { id: 'mas-geco', row: 1, col: 3 },
    ],
  },
];

function floodRemoveWhite(raw, w, h, thresh = 236) {
  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  const isBg = (p) => {
    const i = p * 4;
    if (raw[i + 3] < 20) return true;
    const r = raw[i], g = raw[i + 1], b = raw[i + 2];
    const minC = Math.min(r, g, b);
    const maxC = Math.max(r, g, b);
    // Pure white OR faint neutral gray drop-shadow outside the painted outline
    if (minC >= thresh) return true;
    if (minC >= 216 && maxC - minC <= 16) return true;
    return false;
  };

  const enqueue = (x, y) => {
    const p = y * w + x;
    if (!visited[p] && isBg(p)) {
      visited[p] = 1;
      queue[tail++] = p;
    }
  };

  for (let x = 0; x < w; x++) {
    enqueue(x, 0);
    enqueue(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    enqueue(0, y);
    enqueue(w - 1, y);
  }

  while (head < tail) {
    const p = queue[head++];
    raw[p * 4 + 3] = 0;
    const x = p % w;
    const y = (p - x) / w;
    if (x > 0) enqueue(x - 1, y);
    if (x < w - 1) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y < h - 1) enqueue(x, y + 1);
  }

  // Soft 1-pixel anti-alias edge smoothing for near-white pixels touching transparent background
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const i = p * 4;
      if (raw[i + 3] === 0) continue;
      const touchesTrans =
        raw[(p - 1) * 4 + 3] === 0 ||
        raw[(p + 1) * 4 + 3] === 0 ||
        raw[(p - w) * 4 + 3] === 0 ||
        raw[(p + w) * 4 + 3] === 0;
      if (touchesTrans) {
        const lum = (raw[i] + raw[i + 1] + raw[i + 2]) / 3;
        if (lum > 235) {
          raw[i + 3] = Math.min(raw[i + 3], 64);
        } else if (lum > 220) {
          raw[i + 3] = Math.min(raw[i + 3], 160);
        }
      }
    }
  }
}

async function savePieceAndSilhouette(rawCut, cropW, cropH, id) {
  const resized = await sharp(rawCut, { raw: { width: cropW, height: cropH, channels: 4 } })
    .resize(INNER_MAX, INNER_MAX, { fit: 'inside', kernel: sharp.kernel.lanczos3 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rw = resized.info.width;
  const rh = resized.info.height;
  const ox = Math.floor((CANVAS_SIZE - rw) / 2);
  const oy = Math.floor((CANVAS_SIZE - rh) / 2);

  const canvasRaw = Buffer.alloc(CANVAS_SIZE * CANVAS_SIZE * 4);
  const silRaw = Buffer.alloc(CANVAS_SIZE * CANVAS_SIZE * 4);

  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const sIdx = (y * rw + x) * 4;
      const dIdx = ((oy + y) * CANVAS_SIZE + (ox + x)) * 4;
      const a = resized.data[sIdx + 3];
      if (a > 12) {
        canvasRaw[dIdx] = resized.data[sIdx];
        canvasRaw[dIdx + 1] = resized.data[sIdx + 1];
        canvasRaw[dIdx + 2] = resized.data[sIdx + 2];
        canvasRaw[dIdx + 3] = a >= 242 ? 255 : a;

        const silA = a >= 215 ? 255 : a < 20 ? 0 : Math.round(((a - 20) / (215 - 20)) * 255);
        silRaw[dIdx] = SIL_R;
        silRaw[dIdx + 1] = SIL_G;
        silRaw[dIdx + 2] = SIL_B;
        silRaw[dIdx + 3] = silA;
      }
    }
  }

  await sharp(canvasRaw, { raw: { width: CANVAS_SIZE, height: CANVAS_SIZE, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, `${id}.png`));

  await sharp(silRaw, { raw: { width: CANVAS_SIZE, height: CANVAS_SIZE, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, `${id}-silueta.png`));
}

async function processIndividualPieces() {
  for (const item of INDIVIDUAL_PIECES) {
    const filePath = path.join(IMG_DIR, item.file);
    const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const w = info.width;
    const h = info.height;

    // Clean tiny alpha noise
    const buf = Buffer.from(data);
    let minX = w, maxX = 0, minY = h, maxY = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (buf[i + 3] <= 14) {
          buf[i] = 0; buf[i + 1] = 0; buf[i + 2] = 0; buf[i + 3] = 0;
        } else {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    const pad = 4;
    const x0 = Math.max(0, minX - pad);
    const y0 = Math.max(0, minY - pad);
    const x1 = Math.min(w - 1, maxX + pad);
    const y1 = Math.min(h - 1, maxY + pad);
    const cw = x1 - x0 + 1;
    const ch = y1 - y0 + 1;

    const cut = Buffer.alloc(cw * ch * 4);
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const si = ((y0 + y) * w + (x0 + x)) * 4;
        const di = (y * cw + x) * 4;
        cut[di] = buf[si];
        cut[di + 1] = buf[si + 1];
        cut[di + 2] = buf[si + 2];
        cut[di + 3] = buf[si + 3];
      }
    }
    await savePieceAndSilhouette(cut, cw, ch, item.id);
  }
  console.log(`Processed ${INDIVIDUAL_PIECES.length} individual pieces + silhouettes.`);
}

async function processScenarios() {
  for (const sc of INDIVIDUAL_SCENARIOS) {
    const filePath = path.join(IMG_DIR, sc.file);
    await sharp(filePath)
      .resize(512, 512, { fit: 'cover' })
      .png({ compressionLevel: 9 })
      .toFile(path.join(OUT_DIR, `${sc.id}.png`));
  }
  console.log(`Processed ${INDIVIDUAL_SCENARIOS.length} landscape scenarios.`);
}

async function processGroupSheets() {
  for (const sheet of GROUP_SHEETS) {
    const sheetPath = path.join(GRUPOS_DIR, sheet.file);
    const { data, info } = await sharp(sheetPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width, height } = info;
    const cellW = Math.floor(width / 4);
    const cellH = Math.floor(height / 2);

    for (const item of sheet.items) {
      const x0 = item.col * cellW;
      const y0 = item.row * cellH;
      const cw = item.col === 3 ? width - x0 : cellW;
      const ch = item.row === 1 ? height - y0 : cellH;

      const cellBuf = Buffer.alloc(cw * ch * 4);
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          const si = ((y0 + y) * width + (x0 + x)) * 4;
          const di = (y * cw + x) * 4;
          cellBuf[di] = data[si];
          cellBuf[di + 1] = data[si + 1];
          cellBuf[di + 2] = data[si + 2];
          cellBuf[di + 3] = data[si + 3];
        }
      }

      if (sheet.removeWhiteBg) {
        floodRemoveWhite(cellBuf, cw, ch, 240);
      }

      // Tight crop non-transparent pixels inside cell
      let minX = cw, maxX = 0, minY = ch, maxY = 0;
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          const i = (y * cw + x) * 4;
          if (cellBuf[i + 3] <= 14) {
            cellBuf[i] = 0; cellBuf[i + 1] = 0; cellBuf[i + 2] = 0; cellBuf[i + 3] = 0;
          } else {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (maxX <= minX || maxY <= minY) {
        console.warn(`Empty cell for ${item.id}`);
        continue;
      }

      const pad = 4;
      const cx0 = Math.max(0, minX - pad);
      const cy0 = Math.max(0, minY - pad);
      const cx1 = Math.min(cw - 1, maxX + pad);
      const cy1 = Math.min(ch - 1, maxY + pad);
      const tw = cx1 - cx0 + 1;
      const th = cy1 - cy0 + 1;

      const tight = Buffer.alloc(tw * th * 4);
      for (let y = 0; y < th; y++) {
        for (let x = 0; x < tw; x++) {
          const si = ((cy0 + y) * cw + (cx0 + x)) * 4;
          const di = (y * tw + x) * 4;
          tight[di] = cellBuf[si];
          tight[di + 1] = cellBuf[si + 1];
          tight[di + 2] = cellBuf[si + 2];
          tight[di + 3] = cellBuf[si + 3];
        }
      }

      await savePieceAndSilhouette(tight, tw, th, item.id);
    }
    console.log(`Processed sheet ${sheet.file} (8 items + silhouettes).`);
  }
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await processIndividualPieces();
  await processScenarios();
  await processGroupSheets();
  console.log('ALL 13 collections, complementary assets, scenarios, and silhouettes generated!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
