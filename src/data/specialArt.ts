/**
 * Handcrafted illustrated board-game SVG artwork (as inline data URLs)
 * for specialized observation challenges:
 * - Memory Avanzado: pairs differing by small visible details
 * - Clasificación por atributos: 2-group shape sorting (Inicial) & 2D Forma × Orientación grid (Avanzado)
 * - Busca el diferente: Llave entre cucharas (Inicial) & subtle-detail sets (Avanzado: llaves con un diente distinto, mariquitas, casitas, relojes, tazas, banderines)
 */

function svgDataUrl(innerSvg: string): string {
  const full = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="256" height="256">${innerSvg}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(full)}`;
}

// ============================================================================
// 1. KEYS & SPOONS (Busca el diferente Inicial & Avanzado)
// ============================================================================

export type KeyToothVariant = 'square-square' | 'triangle-tip' | 'tall-notch' | 'three-teeth' | 'round-cut' | 'step-up';

export function makeKeySvg(
  tooth: KeyToothVariant = 'square-square',
  bowStyle: 'oval' | 'diamond' | 'double' = 'oval',
  metalFill = '#D69A32',
  stroke = '#6B4411'
): string {
  const bow =
    bowStyle === 'oval'
      ? `<circle cx="52" cy="100" r="34" fill="${metalFill}" stroke="${stroke}" stroke-width="6"/>
         <circle cx="52" cy="100" r="14" fill="#FFFDF8" stroke="${stroke}" stroke-width="5"/>`
      : bowStyle === 'diamond'
      ? `<polygon points="52,62 88,100 52,138 16,100" fill="${metalFill}" stroke="${stroke}" stroke-width="6" stroke-linejoin="round"/>
         <circle cx="52" cy="100" r="12" fill="#FFFDF8" stroke="${stroke}" stroke-width="5"/>`
      : `<rect x="20" y="68" width="64" height="64" rx="18" fill="${metalFill}" stroke="${stroke}" stroke-width="6"/>
         <circle cx="42" cy="100" r="9" fill="#FFFDF8" stroke="${stroke}" stroke-width="4.5"/>
         <circle cx="64" cy="100" r="9" fill="#FFFDF8" stroke="${stroke}" stroke-width="4.5"/>`;

  let teethSvg = '';
  switch (tooth) {
    case 'square-square':
      teethSvg = `
        <rect x="128" y="106" width="16" height="24" rx="3" fill="${metalFill}" stroke="${stroke}" stroke-width="5"/>
        <rect x="156" y="106" width="18" height="32" rx="3" fill="${metalFill}" stroke="${stroke}" stroke-width="5"/>
      `;
      break;
    case 'triangle-tip':
      // Subtle difference: second tooth is pointed/triangular!
      teethSvg = `
        <rect x="128" y="106" width="16" height="24" rx="3" fill="${metalFill}" stroke="${stroke}" stroke-width="5"/>
        <polygon points="154,106 176,106 165,142" fill="${metalFill}" stroke="${stroke}" stroke-width="5" stroke-linejoin="round"/>
      `;
      break;
    case 'tall-notch':
      // First tooth is taller than second tooth
      teethSvg = `
        <rect x="128" y="106" width="18" height="34" rx="3" fill="${metalFill}" stroke="${stroke}" stroke-width="5"/>
        <rect x="156" y="106" width="16" height="20" rx="3" fill="${metalFill}" stroke="${stroke}" stroke-width="5"/>
      `;
      break;
    case 'three-teeth':
      teethSvg = `
        <rect x="122" y="106" width="13" height="24" rx="2.5" fill="${metalFill}" stroke="${stroke}" stroke-width="4.5"/>
        <rect x="142" y="106" width="13" height="28" rx="2.5" fill="${metalFill}" stroke="${stroke}" stroke-width="4.5"/>
        <rect x="162" y="106" width="14" height="22" rx="2.5" fill="${metalFill}" stroke="${stroke}" stroke-width="4.5"/>
      `;
      break;
    case 'round-cut':
      teethSvg = `
        <path d="M128 106 L128 128 Q136 138 144 128 L144 106 Z" fill="${metalFill}" stroke="${stroke}" stroke-width="5"/>
        <rect x="156" y="106" width="18" height="32" rx="3" fill="${metalFill}" stroke="${stroke}" stroke-width="5"/>
      `;
      break;
    case 'step-up':
      teethSvg = `
        <rect x="128" y="106" width="16" height="24" rx="3" fill="${metalFill}" stroke="${stroke}" stroke-width="5"/>
        <path d="M156 106 L176 106 L176 122 L166 122 L166 138 L156 138 Z" fill="${metalFill}" stroke="${stroke}" stroke-width="5" stroke-linejoin="round"/>
      `;
      break;
  }

  return svgDataUrl(`
    <g transform="rotate(-12 100 100)">
      ${teethSvg}
      <rect x="78" y="92" width="104" height="17" rx="8" fill="${metalFill}" stroke="${stroke}" stroke-width="5.5"/>
      <line x1="90" y1="98" x2="170" y2="98" stroke="#F7D98B" stroke-width="3" stroke-linecap="round"/>
      ${bow}
    </g>
  `);
}

export function makeSpoonSvg(): string {
  return svgDataUrl(`
    <g transform="rotate(36 100 100)">
      <path d="M93 92 L107 92 L110 176 Q100 186 90 176 Z" fill="#D56749" stroke="#6E2E1D" stroke-width="5.5" stroke-linejoin="round"/>
      <rect x="94" y="70" width="12" height="28" fill="#C4C9CE" stroke="#4D5560" stroke-width="4.5"/>
      <ellipse cx="100" cy="48" rx="26" ry="34" fill="#D5DADF" stroke="#4D5560" stroke-width="5.5"/>
      <ellipse cx="94" cy="44" rx="11" ry="18" fill="#EEF1F4" opacity="0.8"/>
    </g>
  `);
}

// ============================================================================
// 2. SUBTLE DIFFERENCE FAMILIES (Busca el diferente Avanzado)
// ============================================================================

export interface SubtleDifferentRoundAsset {
  id: string;
  title: string;
  normalSrc: string;
  oddSrc: string;
  hint: string;
}

function makeLadybugSvg(extraSpot: boolean, antennaCurlRight: boolean): string {
  return svgDataUrl(`
    <path d="M84 56 Q72 34 60 38" fill="none" stroke="#2B3648" stroke-width="5.5" stroke-linecap="round"/>
    <path d="${antennaCurlRight ? 'M116 56 Q132 34 146 46' : 'M116 56 Q128 34 140 38'}" fill="none" stroke="#2B3648" stroke-width="5.5" stroke-linecap="round"/>
    <circle cx="100" cy="64" r="24" fill="#2B3648"/>
    <circle cx="91" cy="58" r="4" fill="#FFFDF8"/>
    <circle cx="109" cy="58" r="4" fill="#FFFDF8"/>
    <ellipse cx="100" cy="120" rx="54" ry="58" fill="#DD4F3E" stroke="#5A1C16" stroke-width="6"/>
    <line x1="100" y1="64" x2="100" y2="176" stroke="#2B3648" stroke-width="5.5"/>
    <circle cx="72" cy="100" r="10" fill="#2B3648"/>
    <circle cx="128" cy="100" r="10" fill="#2B3648"/>
    <circle cx="76" cy="140" r="11" fill="#2B3648"/>
    <circle cx="124" cy="140" r="11" fill="#2B3648"/>
    ${extraSpot ? '<circle cx="80" cy="120" r="7" fill="#2B3648"/>' : ''}
  `);
}

function makeHouseSvg(variant: 'normal' | 'round-window' | 'chimney-left' | 'door-knob-left' | 'striped-roof'): string {
  const chimney =
    variant === 'chimney-left'
      ? '<rect x="52" y="34" width="22" height="38" rx="4" fill="#C95F45" stroke="#5E291B" stroke-width="5"/>'
      : '<rect x="126" y="34" width="22" height="38" rx="4" fill="#C95F45" stroke="#5E291B" stroke-width="5"/>';
  const windowLeft =
    variant === 'round-window'
      ? '<circle cx="68" cy="118" r="14" fill="#9BD3E8" stroke="#365A6D" stroke-width="4.5"/>'
      : '<rect x="54" y="104" width="28" height="28" rx="4" fill="#9BD3E8" stroke="#365A6D" stroke-width="4.5"/>';
  const knobX = variant === 'door-knob-left' ? 110 : 126;

  return svgDataUrl(`
    ${chimney}
    <rect x="42" y="88" width="116" height="84" rx="8" fill="#F8E7C9" stroke="#7A5B36" stroke-width="5.5"/>
    <polygon points="28,94 100,32 172,94" fill="#D96B4B" stroke="#6E2E1C" stroke-width="5.5" stroke-linejoin="round"/>
    ${variant === 'striped-roof' ? '<line x1="58" y1="68" x2="142" y2="68" stroke="#F8D89C" stroke-width="6"/>' : ''}
    ${windowLeft}
    <rect x="104" y="114" width="32" height="58" rx="6" fill="#7D5634" stroke="#472E19" stroke-width="4.5"/>
    <circle cx="${knobX}" cy="144" r="4" fill="#F3C653"/>
  `);
}

function makeClockSvg(minuteAngle: number): string {
  return svgDataUrl(`
    <circle cx="100" cy="104" r="68" fill="#FFFDF8" stroke="#2D6F72" stroke-width="10"/>
    <circle cx="100" cy="104" r="56" fill="#FFFDF8" stroke="#B7D7D4" stroke-width="3"/>
    <line x1="100" y1="54" x2="100" y2="64" stroke="#273242" stroke-width="5" stroke-linecap="round"/>
    <line x1="150" y1="104" x2="140" y2="104" stroke="#273242" stroke-width="5" stroke-linecap="round"/>
    <line x1="100" y1="154" x2="100" y2="144" stroke="#273242" stroke-width="5" stroke-linecap="round"/>
    <line x1="50" y1="104" x2="60" y2="104" stroke="#273242" stroke-width="5" stroke-linecap="round"/>
    <line x1="100" y1="104" x2="100" y2="74" stroke="#273242" stroke-width="7" stroke-linecap="round"/>
    <g transform="rotate(${minuteAngle} 100 104)">
      <line x1="100" y1="104" x2="138" y2="104" stroke="#DD6B4D" stroke-width="5.5" stroke-linecap="round"/>
    </g>
    <circle cx="100" cy="104" r="7" fill="#273242"/>
  `);
}

function makeMugSvg(dotCount: 3 | 4, handleSide: 'right' | 'left', rimColor = '#D96B4B'): string {
  const handle =
    handleSide === 'right'
      ? '<path d="M142 74 C174 74 174 136 142 136" fill="none" stroke="#C7573A" stroke-width="14" stroke-linecap="round"/>'
      : '<path d="M58 74 C26 74 26 136 58 136" fill="none" stroke="#C7573A" stroke-width="14" stroke-linecap="round"/>';
  return svgDataUrl(`
    ${handle}
    <rect x="52" y="54" width="96" height="106" rx="16" fill="#F9ECD4" stroke="#7A5A37" stroke-width="5.5"/>
    <ellipse cx="100" cy="56" rx="48" ry="12" fill="#E9D2AD" stroke="${rimColor}" stroke-width="6"/>
    <circle cx="76" cy="94" r="10" fill="#218A80"/>
    <circle cx="100" cy="126" r="10" fill="#218A80"/>
    <circle cx="124" cy="94" r="10" fill="#218A80"/>
    ${dotCount === 4 ? '<circle cx="100" cy="86" r="8" fill="#DD6B4D"/>' : ''}
  `);
}

export const SUBTLE_DIFFERENT_FAMILIES: SubtleDifferentRoundAsset[] = [
  {
    id: 'keys-triangle-tooth',
    title: 'Llaves: un diente distinto',
    normalSrc: makeKeySvg('square-square', 'oval', '#D69A32'),
    oddSrc: makeKeySvg('triangle-tip', 'oval', '#D69A32'),
    hint: 'Fíjate en la punta de los dientes de las llaves: una tiene un diente acabado en pico.',
  },
  {
    id: 'keys-tall-notch',
    title: 'Llaves: altura de los dientes',
    normalSrc: makeKeySvg('square-square', 'diamond', '#C58A2C'),
    oddSrc: makeKeySvg('tall-notch', 'diamond', '#C58A2C'),
    hint: 'Una de las llaves tiene el primer diente más largo que el segundo.',
  },
  {
    id: 'keys-three-teeth',
    title: 'Llaves: número de dientes',
    normalSrc: makeKeySvg('square-square', 'double', '#5C829B', '#284052'),
    oddSrc: makeKeySvg('three-teeth', 'double', '#5C829B', '#284052'),
    hint: 'Cuenta cuántos dientes tiene cada llave.',
  },
  {
    id: 'ladybug-spot',
    title: 'Mariquitas: un lunar de más',
    normalSrc: makeLadybugSvg(false, false),
    oddSrc: makeLadybugSvg(true, false),
    hint: 'Cuenta bien los lunares negros de las alas.',
  },
  {
    id: 'house-window',
    title: 'Casitas: forma de la ventana',
    normalSrc: makeHouseSvg('normal'),
    oddSrc: makeHouseSvg('round-window'),
    hint: 'Fíjate en la ventana de cada casita.',
  },
  {
    id: 'clock-hand',
    title: 'Relojes: posición de la aguja',
    normalSrc: makeClockSvg(0),
    oddSrc: makeClockSvg(35),
    hint: 'Mira hacia dónde apunta la aguja naranja de cada reloj.',
  },
  {
    id: 'mug-dots',
    title: 'Tazas: lunares distintos',
    normalSrc: makeMugSvg(3, 'right'),
    oddSrc: makeMugSvg(4, 'right'),
    hint: 'Fíjate en los lunares pintados en el frente de la taza.',
  },
];

export const KEY_VS_SPOON_INITIAL = {
  spoonSrc: makeSpoonSvg(),
  keySrc: makeKeySvg('square-square', 'oval', '#D69A32'),
};

// ============================================================================
// 3. MEMORY AVANZADO: SMALL VISIBLE DETAILS DECK (8 distinct pairs sharing palette/theme)
// ============================================================================

export interface DetailMemoryCardSpec {
  id: string;
  name: string;
  src: string;
}

export const SMALL_DETAILS_MEMORY_DECK: DetailMemoryCardSpec[] = [
  { id: 'det-llave-1', name: 'Llave dientes rectos', src: makeKeySvg('square-square', 'oval', '#D69A32') },
  { id: 'det-llave-2', name: 'Llave diente en pico', src: makeKeySvg('triangle-tip', 'oval', '#D69A32') },
  { id: 'det-llave-3', name: 'Llave tres dientes', src: makeKeySvg('three-teeth', 'oval', '#D69A32') },
  { id: 'det-llave-4', name: 'Llave diente escalonado', src: makeKeySvg('step-up', 'oval', '#D69A32') },
  { id: 'det-casa-1', name: 'Casita ventana cuadrada', src: makeHouseSvg('normal') },
  { id: 'det-casa-2', name: 'Casita ventana redonda', src: makeHouseSvg('round-window') },
  { id: 'det-casa-3', name: 'Casita chimenea izquierda', src: makeHouseSvg('chimney-left') },
  { id: 'det-casa-4', name: 'Casita tejado con franja', src: makeHouseSvg('striped-roof') },
];

// ============================================================================
// 4. CLASIFICACIÓN POR ATRIBUTOS (Inicial: 2 grupos por forma | Avanzado: Cuadrícula Forma × Orientación)
// ============================================================================

export type AttrShapeId = 'circulo' | 'triangulo' | 'cuadrado' | 'flecha' | 'casa' | 'bandera';
export type AttrOrientationId = 'arriba' | 'derecha' | 'abajo' | 'izquierda';

export const ORIENTATION_ANGLES: Record<AttrOrientationId, number> = {
  arriba: 0,
  derecha: 90,
  abajo: 180,
  izquierda: 270,
};

export const ORIENTATION_LABELS: Record<AttrOrientationId, string> = {
  arriba: 'Arriba',
  derecha: 'Derecha',
  abajo: 'Abajo',
  izquierda: 'Izquierda',
};

export function makeAttributeShapeSvg(
  shape: AttrShapeId,
  color: string,
  stroke: string,
  orientation: AttrOrientationId = 'arriba',
  striped = false
): string {
  const angle = ORIENTATION_ANGLES[orientation];
  const patternDef = striped
    ? `<defs>
        <pattern id="st" width="22" height="22" patternUnits="userSpaceOnUse">
          <rect width="22" height="22" fill="${color}"/>
          <rect y="0" width="22" height="10" fill="#FFFDF8" opacity="0.55"/>
        </pattern>
      </defs>`
    : '';
  const fill = striped ? 'url(#st)' : color;

  let body = '';
  switch (shape) {
    case 'circulo':
      body = `<circle cx="100" cy="100" r="66" fill="${fill}" stroke="${stroke}" stroke-width="8"/>`;
      break;
    case 'cuadrado':
      body = `<rect x="38" y="38" width="124" height="124" rx="14" fill="${fill}" stroke="${stroke}" stroke-width="8"/>`;
      break;
    case 'triangulo':
      body = `<polygon points="100,28 172,164 28,164" fill="${fill}" stroke="${stroke}" stroke-width="8" stroke-linejoin="round"/>`;
      break;
    case 'flecha':
      body = `<path d="M100 22 L166 94 L126 94 L126 174 L74 174 L74 94 L34 94 Z" fill="${fill}" stroke="${stroke}" stroke-width="7.5" stroke-linejoin="round"/>`;
      break;
    case 'casa':
      body = `
        <polygon points="100,26 168,88 148,88 148,168 52,168 52,88 32,88" fill="${fill}" stroke="${stroke}" stroke-width="7.5" stroke-linejoin="round"/>
        <circle cx="100" cy="116" r="14" fill="#FFFDF8" stroke="${stroke}" stroke-width="5"/>
      `;
      break;
    case 'bandera':
      body = `
        <line x1="68" y1="28" x2="68" y2="174" stroke="${stroke}" stroke-width="10" stroke-linecap="round"/>
        <polygon points="72,34 166,68 72,106" fill="${fill}" stroke="${stroke}" stroke-width="7" stroke-linejoin="round"/>
        <circle cx="68" cy="26" r="9" fill="${fill}" stroke="${stroke}" stroke-width="5"/>
      `;
      break;
  }

  return svgDataUrl(`${patternDef}<g transform="rotate(${angle} 100 100)">${body}</g>`);
}

export function makeOrientationBadgeSvg(orientation: AttrOrientationId): string {
  const angle = ORIENTATION_ANGLES[orientation];
  return svgDataUrl(`
    <circle cx="100" cy="100" r="80" fill="#E6ECF7" stroke="#466094" stroke-width="7"/>
    <g transform="rotate(${angle} 100 100)">
      <path d="M100 42 L144 96 L116 96 L116 154 L84 154 L84 96 L56 96 Z" fill="#466094"/>
    </g>
  `);
}

// ============================================================================
// 5. FORMA × PATRÓN (Liso / Rayas / Lunares — estilo turquesa y crema ilustrado)
// ============================================================================

export type PatternShapeId = 'circulo' | 'cuadrado' | 'triangulo' | 'ovalo';
export type PatternStyleId = 'liso' | 'rayas' | 'lunares';

export const PATTERN_SHAPE_LABELS: Record<PatternShapeId, string> = {
  circulo: 'Círculo',
  cuadrado: 'Cuadrado',
  triangulo: 'Triángulo',
  ovalo: 'Óvalo',
};

export const PATTERN_STYLE_LABELS: Record<PatternStyleId, string> = {
  liso: 'Liso',
  rayas: 'A rayas',
  lunares: 'Con lunares',
};

export function makeTurquoisePatternShapeSvg(
  shape: PatternShapeId,
  pattern: PatternStyleId
): string {
  const teal = '#16968C';
  const cream = '#F7EED6';
  const stroke = '#6E552E';
  const pid = `pat-${shape}-${pattern}`;

  let defs = '';
  let fill = teal;
  if (pattern === 'rayas') {
    defs = `<defs>
      <pattern id="${pid}" width="40" height="36" patternUnits="userSpaceOnUse">
        <rect width="40" height="36" fill="${teal}"/>
        <rect y="0" width="40" height="18" fill="${cream}"/>
      </pattern>
    </defs>`;
    fill = `url(#${pid})`;
  } else if (pattern === 'lunares') {
    defs = `<defs>
      <pattern id="${pid}" width="36" height="36" patternUnits="userSpaceOnUse">
        <rect width="36" height="36" fill="${teal}"/>
        <circle cx="18" cy="18" r="8.5" fill="${cream}"/>
      </pattern>
    </defs>`;
    fill = `url(#${pid})`;
  }

  let shapeEl = '';
  switch (shape) {
    case 'circulo':
      shapeEl = `<circle cx="100" cy="100" r="74" fill="${fill}" stroke="${stroke}" stroke-width="6.5"/>`;
      break;
    case 'cuadrado':
      shapeEl = `<rect x="30" y="30" width="140" height="140" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="6.5"/>`;
      break;
    case 'triangulo':
      shapeEl = `<polygon points="100,24 176,168 24,168" fill="${fill}" stroke="${stroke}" stroke-width="6.5" stroke-linejoin="round"/>`;
      break;
    case 'ovalo':
      shapeEl = `<ellipse cx="100" cy="100" rx="82" ry="56" fill="${fill}" stroke="${stroke}" stroke-width="6.5"/>`;
      break;
  }

  return svgDataUrl(`${defs}${shapeEl}`);
}

export function makePatternBadgeSvg(pattern: PatternStyleId): string {
  const teal = '#16968C';
  const cream = '#F7EED6';
  const stroke = '#6E552E';
  if (pattern === 'liso') {
    return svgDataUrl(
      `<rect x="24" y="24" width="152" height="152" rx="28" fill="${teal}" stroke="${stroke}" stroke-width="7"/>`
    );
  }
  if (pattern === 'rayas') {
    return svgDataUrl(`
      <defs>
        <clipPath id="cp-r"><rect x="24" y="24" width="152" height="152" rx="28"/></clipPath>
      </defs>
      <g clip-path="url(#cp-r)">
        <rect x="24" y="24" width="152" height="152" fill="${teal}"/>
        <rect x="24" y="42" width="152" height="24" fill="${cream}"/>
        <rect x="24" y="88" width="152" height="24" fill="${cream}"/>
        <rect x="24" y="134" width="152" height="24" fill="${cream}"/>
      </g>
      <rect x="24" y="24" width="152" height="152" rx="28" fill="none" stroke="${stroke}" stroke-width="7"/>
    `);
  }
  return svgDataUrl(`
    <rect x="24" y="24" width="152" height="152" rx="28" fill="${teal}" stroke="${stroke}" stroke-width="7"/>
    <circle cx="68" cy="68" r="14" fill="${cream}"/>
    <circle cx="132" cy="68" r="14" fill="${cream}"/>
    <circle cx="100" cy="100" r="14" fill="${cream}"/>
    <circle cx="68" cy="132" r="14" fill="${cream}"/>
    <circle cx="132" cy="132" r="14" fill="${cream}"/>
  `);
}

export function makeSizeBadgeSvg(size: 'pequeno' | 'mediano' | 'grande'): string {
  const r = size === 'pequeno' ? 22 : size === 'mediano' ? 40 : 60;
  return svgDataUrl(`
    <rect x="18" y="18" width="164" height="164" rx="28" fill="#FDF2DC" stroke="#D98A1F" stroke-width="6"/>
    <circle cx="100" cy="100" r="${r}" fill="#D98A1F" stroke="#784A0C" stroke-width="5"/>
  `);
}
