import type {
  Activity,
  ActivityDifficultyConfig,
  CollectionItem,
  DifficultyLevel,
  ImageItem,
  ImagePair,
  UserPrefs,
} from '../types';

export const MASCOT = {
  saludo: '/assets/mascota/saludo.png',
  lupa: '/assets/mascota/lupa.png',
  celebra: '/assets/mascota/celebra.png',
  animo: '/assets/mascota/animo.png',
} as const;

export const DIFFICULTY_ORDER: DifficultyLevel[] = [
  'inicial',
  'sencillo',
  'intermedio',
  'avanzado',
];

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  inicial: 'Inicial',
  sencillo: 'Sencillo',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};

export const DIFFICULTY_DESCRIPTIONS: Record<DifficultyLevel, string> = {
  inicial: 'Desde 3 años: muy pocas piezas y diferencias claras',
  sencillo: 'Un paso más de memoria y atención',
  intermedio: 'Más opciones, elementos parecidos y nuevas consignas',
  avanzado: 'Reto para mayores y adultos: detalles sutiles, giros, fragmentos y doble entrada',
};

export const DEFAULT_DIFFICULTY_CONFIG: Required<ActivityDifficultyConfig> = {
  memory: {
    inicial: { pairsCount: 2, useSmallDetails: false },
    sencillo: { pairsCount: 4, useSmallDetails: false },
    intermedio: { pairsCount: 6, useSmallDetails: false },
    avanzado: { pairsCount: 8, useSmallDetails: false },
  },
  classification: {
    inicial: { piecesCount: 4 },
    sencillo: { piecesCount: 6 },
    intermedio: { piecesCount: 8 },
    avanzado: { piecesCount: 9 },
  },
  matching: {
    inicial: { optionsCount: 2, preferSimilar: false, useFragment: false },
    sencillo: { optionsCount: 3, preferSimilar: false, useFragment: false },
    intermedio: { optionsCount: 4, preferSimilar: true, useFragment: false },
    avanzado: { optionsCount: 4, preferSimilar: true, useFragment: true },
  },
  whatChanged: {
    inicial: { itemsCount: 3, optionsCount: 3, variant: 'disappear', emptySlots: 0 },
    sencillo: { itemsCount: 4, optionsCount: 4, variant: 'disappear', emptySlots: 0 },
    intermedio: { itemsCount: 4, optionsCount: 4, variant: 'move', emptySlots: 2 },
    avanzado: { itemsCount: 5, optionsCount: 5, variant: 'mixed', emptySlots: 1 },
  },
  sequence: {
    inicial: { sequenceLength: 2, extraDistractors: 0, preferSimilar: false },
    sencillo: { sequenceLength: 3, extraDistractors: 1, preferSimilar: false },
    intermedio: { sequenceLength: 4, extraDistractors: 2, preferSimilar: true },
    avanzado: { sequenceLength: 5, extraDistractors: 3, preferSimilar: true },
  },
  intruder: {
    inicial: { totalItems: 4, subtleCategory: false },
    sencillo: { totalItems: 4, subtleCategory: true },
    intermedio: { totalItems: 5, subtleCategory: true },
    avanzado: { totalItems: 6, subtleCategory: true },
  },
  dobble: {
    inicial: { symbolsPerCard: 3, varySize: false, varyRotation: false },
    sencillo: { symbolsPerCard: 4, varySize: true, varyRotation: false },
    intermedio: { symbolsPerCard: 6, varySize: true, varyRotation: true },
    avanzado: { symbolsPerCard: 8, varySize: true, varyRotation: true },
  },
  pattern: {
    inicial: { patternType: 'AB', optionsCount: 2 },
    sencillo: { patternType: 'ABC', optionsCount: 3 },
    intermedio: { patternType: 'mid-gap', optionsCount: 3 },
    avanzado: { patternType: 'double-rule', optionsCount: 4 },
  },
};

export const BUILTIN_COLLECTIONS: CollectionItem[] = [
  {
    id: 'transportes',
    name: 'Medios de transporte',
    description: 'Bicicleta, autobús, tren, ambulancia, velero, avión, helicóptero y globo, con paisajes de tierra, agua y aire.',
    order: 1,
    accentColor: '#2A9D8F',
    isCoreCatalog: true,
    builtIn: true,
  },
  {
    id: 'animales-bosque',
    name: 'Animales del bosque',
    description: 'Zorro, ardilla, erizo, ciervo, jabalí, búho, tejón y conejo.',
    order: 2,
    accentColor: '#5B8E55',
    isCoreCatalog: true,
    builtIn: true,
  },
  {
    id: 'material-escolar',
    name: 'Material escolar',
    description: 'Estuche, goma, lápiz, mochila, pegamento, pincel, regla, sacapuntas y tijeras, con escenario de aula.',
    order: 3,
    accentColor: '#E07A5F',
    isCoreCatalog: true,
    builtIn: true,
  },
  {
    id: 'animales-polares',
    name: 'Animales de las regiones polares',
    description: 'Oso polar, zorro ártico, morsa, narval, pingüino, foca, reno y orca.',
    order: 4,
    accentColor: '#457B9D',
    isCoreCatalog: true,
    builtIn: true,
  },
  {
    id: 'frutas-hortalizas',
    name: 'Frutas y hortalizas',
    description: 'Frutas y verduras enteras junto con sus mitades para jugar a «Alimento y corte».',
    order: 5,
    accentColor: '#D97706',
    isCoreCatalog: true,
    builtIn: true,
  },
  {
    id: 'ropa-complementos',
    name: 'Ropa y complementos',
    description: 'Prendas cotidianas y su correspondencia de dónde se colocan.',
    order: 6,
    accentColor: '#C0567B',
    isCoreCatalog: true,
    builtIn: true,
  },
  {
    id: 'utensilios-cocina',
    name: 'Utensilios de cocina',
    description: 'Taza, cuchara, tenedor, cazo, colador, jarra, rallador y espátula, con escenario de cocina.',
    order: 7,
    accentColor: '#B5651D',
    isCoreCatalog: true,
    builtIn: true,
  },
  {
    id: 'juguetes-juegos',
    name: 'Juguetes y juegos',
    description: 'Pelota, peonza, dado, cometa, canica, muñeca, bloque y osito.',
    order: 8,
    accentColor: '#8B5CF6',
    isCoreCatalog: true,
    builtIn: true,
  },
  {
    id: 'en-la-playa',
    name: 'En la playa',
    description: 'Sombrilla, cubo, pala, flotador, toalla, castillo de arena, concha y estrella de mar.',
    order: 9,
    accentColor: '#0EA5E9',
    isCoreCatalog: true,
    builtIn: true,
  },
  {
    id: 'paseo-bosque',
    name: 'Un paseo por el bosque',
    description: 'Bellota, castaña, hoja, moras, piña, rama, seta y tronco, con paisaje de bosque.',
    order: 10,
    accentColor: '#6B8E23',
    isCoreCatalog: true,
    builtIn: true,
  },
  {
    id: 'animales-granja',
    name: 'Animales de granja',
    description: '8 animales adultos y sus 8 crías para jugar a «Animal y cría», con paisaje de granja.',
    order: 11,
    accentColor: '#C48342',
    isCoreCatalog: true,
    builtIn: true,
  },
  {
    id: 'mascotas',
    name: 'Mascotas',
    description: 'Perro, gato, hámster, periquito, pez, tortuga, conejo y geco.',
    order: 12,
    accentColor: '#E76F51',
    isCoreCatalog: true,
    builtIn: true,
  },
  {
    id: 'el-espacio',
    name: 'El espacio',
    description: 'Astronauta, cohete, cometa, luna, satélite, Saturno, sol y planeta Tierra.',
    order: 13,
    accentColor: '#3B5998',
    isCoreCatalog: true,
    builtIn: true,
  },
];

function piece(
  id: string,
  name: string,
  collectionId: string,
  similarityGroup?: string
): ImageItem {
  return {
    id,
    name,
    collectionId,
    kind: 'piece',
    src: `/assets/banco/${id}.png`,
    silhouetteSrc: `/assets/banco/${id}-silueta.png`,
    similarityGroup,
    builtIn: true,
  };
}

function scenario(id: string, name: string, collectionId: string): ImageItem {
  return {
    id,
    name,
    collectionId,
    kind: 'scenario',
    src: `/assets/banco/${id}.png`,
    builtIn: true,
  };
}

export const BUILTIN_IMAGES: ImageItem[] = [
  // 1. Medios de transporte
  piece('tr-bicicleta', 'Bicicleta', 'transportes', 'tierra-ligero'),
  piece('tr-autobus', 'Autobús', 'transportes', 'tierra-grande'),
  piece('tr-tren', 'Tren', 'transportes', 'tierra-grande'),
  piece('tr-ambulancia', 'Ambulancia', 'transportes', 'tierra-grande'),
  piece('tr-velero', 'Velero', 'transportes', 'agua'),
  piece('tr-avion', 'Avión', 'transportes', 'aire-alas'),
  piece('tr-helicoptero', 'Helicóptero', 'transportes', 'aire-alas'),
  piece('tr-globo', 'Globo aerostático', 'transportes', 'aire-globo'),
  scenario('esc-tierra', 'Tierra', 'transportes'),
  scenario('esc-agua', 'Agua', 'transportes'),
  scenario('esc-aire', 'Aire', 'transportes'),

  // 2. Animales del bosque
  piece('abq-zorro', 'Zorro', 'animales-bosque', 'pelaje-naranja'),
  piece('abq-ardilla', 'Ardilla', 'animales-bosque', 'pelaje-naranja'),
  piece('abq-erizo', 'Erizo', 'animales-bosque', 'pelaje-pardo'),
  piece('abq-ciervo', 'Ciervo', 'animales-bosque', 'pelaje-pardo'),
  piece('abq-jabali', 'Jabalí', 'animales-bosque', 'pelaje-oscuro'),
  piece('abq-buho', 'Búho', 'animales-bosque', 'pelaje-pardo'),
  piece('abq-tejon', 'Tejón', 'animales-bosque', 'pelaje-oscuro'),
  piece('abq-conejo', 'Conejo de campo', 'animales-bosque', 'pelaje-pardo'),

  // 3. Material escolar
  piece('esc-estuche', 'Estuche', 'material-escolar', 'tela'),
  piece('esc-goma', 'Goma', 'material-escolar', 'pequeno'),
  piece('esc-lapiz', 'Lápiz', 'material-escolar', 'alargado'),
  piece('esc-mochila', 'Mochila', 'material-escolar', 'tela'),
  piece('esc-pegamento', 'Pegamento', 'material-escolar', 'alargado'),
  piece('esc-pincel', 'Pincel', 'material-escolar', 'alargado'),
  piece('esc-regla', 'Regla', 'material-escolar', 'alargado'),
  piece('esc-sacapuntas', 'Sacapuntas', 'material-escolar', 'pequeno'),
  piece('esc-tijeras', 'Tijeras', 'material-escolar', 'alargado'),
  scenario('esc-aula', 'Aula', 'material-escolar'),

  // 4. Animales de las regiones polares
  piece('pol-oso', 'Oso polar', 'animales-polares', 'blanco'),
  piece('pol-zorro', 'Zorro ártico', 'animales-polares', 'blanco'),
  piece('pol-morsa', 'Morsa', 'animales-polares', 'marino-gris'),
  piece('pol-narval', 'Narval', 'animales-polares', 'marino-gris'),
  piece('pol-pinguino', 'Pingüino', 'animales-polares', 'blanco-negro'),
  piece('pol-foca', 'Foca', 'animales-polares', 'marino-gris'),
  piece('pol-reno', 'Reno', 'animales-polares', 'pardo'),
  piece('pol-orca', 'Orca', 'animales-polares', 'blanco-negro'),
  scenario('esc-polar', 'Regiones polares', 'animales-polares'),

  // 5. Frutas y hortalizas (enteras + mitades)
  piece('fru-manzana', 'Manzana', 'frutas-hortalizas', 'rojo'),
  piece('fru-pera', 'Pera', 'frutas-hortalizas', 'verde-amarillo'),
  piece('fru-naranja', 'Naranja', 'frutas-hortalizas', 'naranja'),
  piece('fru-limon', 'Limón', 'frutas-hortalizas', 'verde-amarillo'),
  piece('fru-kiwi', 'Kiwi', 'frutas-hortalizas', 'pardo-verde'),
  piece('fru-tomate', 'Tomate', 'frutas-hortalizas', 'rojo'),
  piece('fru-zanahoria', 'Zanahoria', 'frutas-hortalizas', 'naranja'),
  piece('fru-pimiento', 'Pimiento', 'frutas-hortalizas', 'rojo'),
  piece('fru-berenjena', 'Berenjena', 'frutas-hortalizas', 'morado'),
  piece('fru-mitad-manzana', 'Manzana partida', 'frutas-hortalizas', 'mitad-clara'),
  piece('fru-mitad-pera', 'Pera partida', 'frutas-hortalizas', 'mitad-clara'),
  piece('fru-mitad-naranja', 'Naranja partida', 'frutas-hortalizas', 'mitad-naranja'),
  piece('fru-mitad-kiwi', 'Kiwi partido', 'frutas-hortalizas', 'mitad-verde'),
  piece('fru-mitad-tomate', 'Tomate partido', 'frutas-hortalizas', 'mitad-roja'),
  piece('fru-mitad-zanahoria', 'Zanahoria partida', 'frutas-hortalizas', 'mitad-naranja'),
  piece('fru-mitad-pimiento', 'Pimiento partido', 'frutas-hortalizas', 'mitad-roja'),
  piece('fru-mitad-berenjena', 'Berenjena partida', 'frutas-hortalizas', 'mitad-clara'),

  // 6. Ropa y complementos (sueltas + puestas)
  piece('rop-abrigo', 'Abrigo', 'ropa-complementos', 'lana-azul'),
  piece('rop-calcetin', 'Calcetín', 'ropa-complementos', 'lana-azul'),
  piece('rop-guante', 'Guante', 'ropa-complementos', 'lana-roja'),
  piece('rop-gorro', 'Gorro', 'ropa-complementos', 'lana-azul'),
  piece('rop-bufanda', 'Bufanda', 'ropa-complementos', 'lana-roja'),
  piece('rop-bota', 'Bota', 'ropa-complementos', 'marron'),
  piece('rop-camiseta', 'Camiseta', 'ropa-complementos', 'amarillo'),
  piece('rop-pantalon', 'Pantalón', 'ropa-complementos', 'verde'),
  piece('pue-calcetin', 'Calcetín en el pie', 'ropa-complementos', 'puesta'),
  piece('pue-guante', 'Guante en la mano', 'ropa-complementos', 'puesta'),
  piece('pue-gorro', 'Gorro en la cabeza', 'ropa-complementos', 'puesta'),
  piece('pue-bufanda', 'Bufanda en el cuello', 'ropa-complementos', 'puesta'),
  piece('pue-bota', 'Bota en el pie', 'ropa-complementos', 'puesta'),
  piece('pue-camiseta', 'Camiseta puesta', 'ropa-complementos', 'puesta'),
  piece('pue-mochila', 'Mochila en la espalda', 'ropa-complementos', 'puesta'),
  piece('pue-pantalon', 'Pantalón puesto', 'ropa-complementos', 'puesta'),

  // 7. Utensilios de cocina
  piece('coc-taza', 'Taza', 'utensilios-cocina', 'ceramica'),
  piece('coc-cuchara', 'Cuchara', 'utensilios-cocina', 'cubierto-rojo'),
  piece('coc-tenedor', 'Tenedor', 'utensilios-cocina', 'cubierto-rojo'),
  piece('coc-cazo', 'Cazo', 'utensilios-cocina', 'metal-rojo'),
  piece('coc-colador', 'Colador', 'utensilios-cocina', 'metal-azul'),
  piece('coc-jarra', 'Jarra', 'utensilios-cocina', 'ceramica'),
  piece('coc-rallador', 'Rallador', 'utensilios-cocina', 'metal-rojo'),
  piece('coc-espatula', 'Espátula', 'utensilios-cocina', 'cubierto-rojo'),
  scenario('esc-cocina', 'Cocina', 'utensilios-cocina'),

  // 8. Juguetes y juegos
  piece('jug-pelota', 'Pelota', 'juguetes-juegos', 'redondo-color'),
  piece('jug-peonza', 'Peonza', 'juguetes-juegos', 'colorido'),
  piece('jug-dado', 'Dado', 'juguetes-juegos', 'bloque'),
  piece('jug-cometa', 'Cometa', 'juguetes-juegos', 'colorido'),
  piece('jug-canica', 'Canica', 'juguetes-juegos', 'redondo-color'),
  piece('jug-muneca', 'Muñeca', 'juguetes-juegos', 'peluche'),
  piece('jug-bloque', 'Bloque', 'juguetes-juegos', 'bloque'),
  piece('jug-osito', 'Osito', 'juguetes-juegos', 'peluche'),

  // 9. En la playa
  piece('pla-sombrilla', 'Sombrilla', 'en-la-playa', 'rayas-rojo'),
  piece('pla-cubo', 'Cubo', 'en-la-playa', 'arena-rojo'),
  piece('pla-pala', 'Pala', 'en-la-playa', 'azul-amarillo'),
  piece('pla-flotador', 'Flotador', 'en-la-playa', 'rayas-azul'),
  piece('pla-toalla', 'Toalla', 'en-la-playa', 'rayas-azul'),
  piece('pla-castillo', 'Castillo de arena', 'en-la-playa', 'arena-dorada'),
  piece('pla-concha', 'Concha', 'en-la-playa', 'arena-dorada'),
  piece('pla-estrella', 'Estrella de mar', 'en-la-playa', 'arena-rojo'),
  scenario('esc-playa', 'Playa', 'en-la-playa'),

  // 10. Un paseo por el bosque
  piece('pas-bellota', 'Bellota', 'paseo-bosque', 'madera-marron'),
  piece('pas-castana', 'Castaña', 'paseo-bosque', 'madera-marron'),
  piece('pas-hoja', 'Hoja', 'paseo-bosque', 'verde'),
  piece('pas-moras', 'Moras', 'paseo-bosque', 'oscuro'),
  piece('pas-pina', 'Piña', 'paseo-bosque', 'madera-marron'),
  piece('pas-rama', 'Rama', 'paseo-bosque', 'madera-marron'),
  piece('pas-seta', 'Seta', 'paseo-bosque', 'rojo-crema'),
  piece('pas-tronco', 'Tronco', 'paseo-bosque', 'madera-marron'),
  scenario('esc-bosque', 'Bosque', 'paseo-bosque'),

  // 11. Animales de granja (adultos + crías)
  piece('grj-vaca', 'Vaca', 'animales-granja', 'cuadrupedo'),
  piece('grj-cerdo', 'Cerdo', 'animales-granja', 'cuadrupedo'),
  piece('grj-oveja', 'Oveja', 'animales-granja', 'cuadrupedo-claro'),
  piece('grj-cabra', 'Cabra', 'animales-granja', 'cuadrupedo-claro'),
  piece('grj-caballo', 'Caballo', 'animales-granja', 'cuadrupedo-grande'),
  piece('grj-gallina', 'Gallina', 'animales-granja', 'ave'),
  piece('grj-pato', 'Pato', 'animales-granja', 'ave'),
  piece('grj-burro', 'Burro', 'animales-granja', 'cuadrupedo-grande'),
  piece('cria-ternero', 'Ternero', 'animales-granja', 'cria'),
  piece('cria-lechon', 'Lechón', 'animales-granja', 'cria'),
  piece('cria-cordero', 'Cordero', 'animales-granja', 'cria'),
  piece('cria-cabrito', 'Cabrito', 'animales-granja', 'cria'),
  piece('cria-potro', 'Potro', 'animales-granja', 'cria'),
  piece('cria-pollito', 'Pollito', 'animales-granja', 'cria-ave'),
  piece('cria-patito', 'Patito', 'animales-granja', 'cria-ave'),
  piece('cria-pollino', 'Pollino', 'animales-granja', 'cria'),
  scenario('esc-granja', 'Granja', 'animales-granja'),

  // 12. Mascotas
  piece('mas-perro', 'Perro', 'mascotas', 'pelo-claro'),
  piece('mas-gato', 'Gato', 'mascotas', 'pelo-atigrado'),
  piece('mas-hamster', 'Hámster', 'mascotas', 'pelo-claro'),
  piece('mas-periquito', 'Periquito', 'mascotas', 'verde-amarillo'),
  piece('mas-pez', 'Pez', 'mascotas', 'naranja'),
  piece('mas-tortuga', 'Tortuga', 'mascotas', 'reptil'),
  piece('mas-conejo', 'Conejo', 'mascotas', 'pelo-claro'),
  piece('mas-geco', 'Lagartija geco', 'mascotas', 'reptil'),

  // 13. El espacio
  piece('esp-astronauta', 'Astronauta', 'el-espacio', 'nave-blanco'),
  piece('esp-cohete', 'Cohete', 'el-espacio', 'nave-blanco'),
  piece('esp-cometa', 'Cometa espacial', 'el-espacio', 'astro-luminoso'),
  piece('esp-luna', 'Luna', 'el-espacio', 'esfera'),
  piece('esp-satelite', 'Satélite', 'el-espacio', 'nave-blanco'),
  piece('esp-saturno', 'Saturno', 'el-espacio', 'esfera'),
  piece('esp-sol', 'Sol', 'el-espacio', 'astro-luminoso'),
  piece('esp-tierra', 'Planeta Tierra', 'el-espacio', 'esfera'),
  scenario('esc-espacio', 'Espacio exterior', 'el-espacio'),
];

// Base item IDs per collection (excluding companion halves/babies/worn so standard games stay crisp)
export const COLLECTION_BASE_IDS: Record<string, string[]> = {
  transportes: ['tr-bicicleta', 'tr-autobus', 'tr-tren', 'tr-ambulancia', 'tr-velero', 'tr-avion', 'tr-helicoptero', 'tr-globo'],
  'animales-bosque': ['abq-zorro', 'abq-ardilla', 'abq-erizo', 'abq-ciervo', 'abq-jabali', 'abq-buho', 'abq-tejon', 'abq-conejo'],
  'material-escolar': ['esc-estuche', 'esc-goma', 'esc-lapiz', 'esc-mochila', 'esc-pegamento', 'esc-pincel', 'esc-regla', 'esc-sacapuntas', 'esc-tijeras'],
  'animales-polares': ['pol-oso', 'pol-zorro', 'pol-morsa', 'pol-narval', 'pol-pinguino', 'pol-foca', 'pol-reno', 'pol-orca'],
  'frutas-hortalizas': ['fru-manzana', 'fru-pera', 'fru-naranja', 'fru-kiwi', 'fru-tomate', 'fru-zanahoria', 'fru-pimiento', 'fru-berenjena', 'fru-limon'],
  'ropa-complementos': ['rop-abrigo', 'rop-calcetin', 'rop-guante', 'rop-gorro', 'rop-bufanda', 'rop-bota', 'rop-camiseta', 'rop-pantalon'],
  'utensilios-cocina': ['coc-taza', 'coc-cuchara', 'coc-tenedor', 'coc-cazo', 'coc-colador', 'coc-jarra', 'coc-rallador', 'coc-espatula'],
  'juguetes-juegos': ['jug-pelota', 'jug-peonza', 'jug-dado', 'jug-cometa', 'jug-canica', 'jug-muneca', 'jug-bloque', 'jug-osito'],
  'en-la-playa': ['pla-sombrilla', 'pla-cubo', 'pla-pala', 'pla-flotador', 'pla-toalla', 'pla-castillo', 'pla-concha', 'pla-estrella'],
  'paseo-bosque': ['pas-bellota', 'pas-castana', 'pas-hoja', 'pas-moras', 'pas-pina', 'pas-rama', 'pas-seta', 'pas-tronco'],
  'animales-granja': ['grj-vaca', 'grj-cerdo', 'grj-oveja', 'grj-cabra', 'grj-caballo', 'grj-gallina', 'grj-pato', 'grj-burro'],
  mascotas: ['mas-perro', 'mas-gato', 'mas-hamster', 'mas-periquito', 'mas-pez', 'mas-tortuga', 'mas-conejo', 'mas-geco'],
  'el-espacio': ['esp-astronauta', 'esp-cohete', 'esp-cometa', 'esp-luna', 'esp-satelite', 'esp-saturno', 'esp-sol', 'esp-tierra'],
};

export const BUILTIN_PAIRS: ImagePair[] = [
  // Animal y cría
  { id: 'pair-vaca-ternero', label: 'Vaca y ternero', collectionId: 'animales-granja', pairKind: 'related', itemAId: 'grj-vaca', itemBId: 'cria-ternero', builtIn: true },
  { id: 'pair-cerdo-lechon', label: 'Cerdo y lechón', collectionId: 'animales-granja', pairKind: 'related', itemAId: 'grj-cerdo', itemBId: 'cria-lechon', builtIn: true },
  { id: 'pair-oveja-cordero', label: 'Oveja y cordero', collectionId: 'animales-granja', pairKind: 'related', itemAId: 'grj-oveja', itemBId: 'cria-cordero', builtIn: true },
  { id: 'pair-cabra-cabrito', label: 'Cabra y cabrito', collectionId: 'animales-granja', pairKind: 'related', itemAId: 'grj-cabra', itemBId: 'cria-cabrito', builtIn: true },
  { id: 'pair-caballo-potro', label: 'Caballo y potro', collectionId: 'animales-granja', pairKind: 'related', itemAId: 'grj-caballo', itemBId: 'cria-potro', builtIn: true },
  { id: 'pair-gallina-pollito', label: 'Gallina y pollito', collectionId: 'animales-granja', pairKind: 'related', itemAId: 'grj-gallina', itemBId: 'cria-pollito', builtIn: true },
  { id: 'pair-pato-patito', label: 'Pato y patito', collectionId: 'animales-granja', pairKind: 'related', itemAId: 'grj-pato', itemBId: 'cria-patito', builtIn: true },
  { id: 'pair-burro-pollino', label: 'Burro y pollino', collectionId: 'animales-granja', pairKind: 'related', itemAId: 'grj-burro', itemBId: 'cria-pollino', builtIn: true },

  // Alimento y corte (8/8 exact pairs!)
  { id: 'pair-manzana-mitad', label: 'Manzana y su corte', collectionId: 'frutas-hortalizas', pairKind: 'related', itemAId: 'fru-manzana', itemBId: 'fru-mitad-manzana', builtIn: true },
  { id: 'pair-pera-mitad', label: 'Pera y su corte', collectionId: 'frutas-hortalizas', pairKind: 'related', itemAId: 'fru-pera', itemBId: 'fru-mitad-pera', builtIn: true },
  { id: 'pair-naranja-mitad', label: 'Naranja y su corte', collectionId: 'frutas-hortalizas', pairKind: 'related', itemAId: 'fru-naranja', itemBId: 'fru-mitad-naranja', builtIn: true },
  { id: 'pair-kiwi-mitad', label: 'Kiwi y su corte', collectionId: 'frutas-hortalizas', pairKind: 'related', itemAId: 'fru-kiwi', itemBId: 'fru-mitad-kiwi', builtIn: true },
  { id: 'pair-tomate-mitad', label: 'Tomate y su corte', collectionId: 'frutas-hortalizas', pairKind: 'related', itemAId: 'fru-tomate', itemBId: 'fru-mitad-tomate', builtIn: true },
  { id: 'pair-zanahoria-mitad', label: 'Zanahoria y su corte', collectionId: 'frutas-hortalizas', pairKind: 'related', itemAId: 'fru-zanahoria', itemBId: 'fru-mitad-zanahoria', builtIn: true },
  { id: 'pair-pimiento-mitad', label: 'Pimiento y su corte', collectionId: 'frutas-hortalizas', pairKind: 'related', itemAId: 'fru-pimiento', itemBId: 'fru-mitad-pimiento', builtIn: true },
  { id: 'pair-berenjena-mitad', label: 'Berenjena y su corte', collectionId: 'frutas-hortalizas', pairKind: 'related', itemAId: 'fru-berenjena', itemBId: 'fru-mitad-berenjena', builtIn: true },

  // Prenda y dónde se coloca
  { id: 'pair-calcetin-puesto', label: 'Calcetín en el pie', collectionId: 'ropa-complementos', pairKind: 'related', itemAId: 'rop-calcetin', itemBId: 'pue-calcetin', builtIn: true },
  { id: 'pair-guante-puesto', label: 'Guante en la mano', collectionId: 'ropa-complementos', pairKind: 'related', itemAId: 'rop-guante', itemBId: 'pue-guante', builtIn: true },
  { id: 'pair-gorro-puesto', label: 'Gorro en la cabeza', collectionId: 'ropa-complementos', pairKind: 'related', itemAId: 'rop-gorro', itemBId: 'pue-gorro', builtIn: true },
  { id: 'pair-bufanda-puesta', label: 'Bufanda en el cuello', collectionId: 'ropa-complementos', pairKind: 'related', itemAId: 'rop-bufanda', itemBId: 'pue-bufanda', builtIn: true },
  { id: 'pair-bota-puesta', label: 'Bota en el pie', collectionId: 'ropa-complementos', pairKind: 'related', itemAId: 'rop-bota', itemBId: 'pue-bota', builtIn: true },
  { id: 'pair-camiseta-puesta', label: 'Camiseta puesta', collectionId: 'ropa-complementos', pairKind: 'related', itemAId: 'rop-camiseta', itemBId: 'pue-camiseta', builtIn: true },
  { id: 'pair-mochila-puesta', label: 'Mochila en la espalda', collectionId: 'ropa-complementos', pairKind: 'related', itemAId: 'esc-mochila', itemBId: 'pue-mochila', builtIn: true },
  { id: 'pair-pantalon-puesto', label: 'Pantalón puesto', collectionId: 'ropa-complementos', pairKind: 'related', itemAId: 'rop-pantalon', itemBId: 'pue-pantalon', builtIn: true },
];

export const BUILTIN_ACTIVITIES: Activity[] = [
  // 1. Memory de parejas (Inicial: 2 parejas muy diferentes; Avanzado: detalles pequeños visibles)
  {
    id: 'act-transportes-memory',
    title: 'Memory de Transportes',
    description: 'Inicial: 2 parejas muy diferentes. Avanzado: parejas con detalles pequeños pero visibles.',
    gameType: 'memory',
    collectionIds: ['transportes'],
    builtIn: true,
    createdAt: 1700000001000,
    updatedAt: 1700000001000,
    defaultDifficulty: 'inicial',
    defaultProgression: 'progressive',
    defaultMode: 'individual',
    memoryConfig: {
      variant: 'identical',
      itemIds: COLLECTION_BASE_IDS.transportes,
      pairIds: [],
      initialItemIds: ['tr-bicicleta', 'tr-globo', 'tr-velero'],
    },
  },
  // 2. ¿Qué ha cambiado? (Inicial: 3 objetos, desaparece 1; Avanzado: desplazamiento, giro e intercambio)
  {
    id: 'act-transportes-cambio',
    title: '¿Qué ha cambiado?',
    description: 'Observa los objetos y descubre cuál desaparece, se desplaza, gira o intercambia su sitio.',
    gameType: 'what-changed',
    collectionIds: ['transportes'],
    builtIn: true,
    createdAt: 1700000002000,
    updatedAt: 1700000002000,
    defaultDifficulty: 'inicial',
    defaultProgression: 'progressive',
    defaultMode: 'individual',
    whatChangedConfig: {
      itemIds: COLLECTION_BASE_IDS.transportes,
      detailPairIds: [],
      initialItemIds: ['tr-bicicleta', 'tr-velero', 'tr-globo'],
      observationTimerSeconds: null,
    },
  },
  // 3. Recuerda el orden (NUEVO!)
  {
    id: 'act-transportes-orden',
    title: 'Recuerda el orden',
    description: 'Memoriza la secuencia de imágenes y colócalas después en el mismo orden.',
    gameType: 'sequence',
    collectionIds: ['transportes'],
    builtIn: true,
    createdAt: 1700000003000,
    updatedAt: 1700000003000,
    defaultDifficulty: 'inicial',
    defaultProgression: 'progressive',
    defaultMode: 'individual',
    sequenceConfig: {
      itemIds: COLLECTION_BASE_IDS.transportes,
      initialItemIds: ['tr-bicicleta', 'tr-globo', 'tr-velero'],
      observationTimerSeconds: null,
    },
  },
  // 4. Correspondencias visuales (Inicial: 2 opciones con silueta; Avanzado: fragmentos/recortes)
  {
    id: 'act-transportes-siluetas',
    title: 'Correspondencias visuales',
    description: 'Inicial: une un objeto con su silueta entre 2 opciones. Avanzado: reconoce a qué imagen pertenece un fragmento.',
    gameType: 'matching',
    collectionIds: ['transportes'],
    builtIn: true,
    createdAt: 1700000004000,
    updatedAt: 1700000004000,
    defaultDifficulty: 'inicial',
    defaultProgression: 'progressive',
    defaultMode: 'individual',
    matchingConfig: {
      prompt: '¿Cuál es su silueta?',
      variant: 'silhouette',
      itemIds: COLLECTION_BASE_IDS.transportes,
      pairIds: [],
      initialItemIds: ['tr-bicicleta', 'tr-globo', 'tr-velero'],
    },
  },
  // 5A. Clasificación por atributos (Formas con ejemplo en Inicial + Cuadrícula Forma × Orientación en Avanzado!)
  {
    id: 'act-atributos-formas',
    title: 'Clasificación por atributos',
    description: 'Inicial: 2 grupos por forma con ejemplo guía. Avanzado: cuadrícula de doble entrada (forma × orientación).',
    gameType: 'classification',
    collectionIds: ['transportes'],
    builtIn: true,
    createdAt: 1700000005000,
    updatedAt: 1700000005000,
    defaultDifficulty: 'inicial',
    defaultProgression: 'progressive',
    defaultMode: 'individual',
    classificationConfig: {
      prompt: 'Clasifica cada pieza observando sus rasgos',
      classificationMode: 'attributes',
      groups: [],
    },
  },
  // 5B. Clasificación temática: ¿Por dónde se desplaza?
  {
    id: 'act-transportes-clasificacion',
    title: '¿Por dónde se desplaza?',
    description: 'Coloca cada vehículo en su paisaje: tierra, agua o aire.',
    gameType: 'classification',
    collectionIds: ['transportes'],
    builtIn: true,
    createdAt: 1700000006000,
    updatedAt: 1700000006000,
    defaultDifficulty: 'inicial',
    defaultProgression: 'progressive',
    defaultMode: 'individual',
    classificationConfig: {
      prompt: '¿Por dónde se desplaza cada vehículo?',
      classificationMode: 'thematic',
      initialItemIds: ['tr-tren', 'tr-velero', 'tr-globo'],
      groups: [
        {
          id: 'grp-tierra',
          name: 'Tierra',
          imageId: 'esc-tierra',
          accentColor: '#5B8E55',
          itemIds: ['tr-bicicleta', 'tr-autobus', 'tr-tren', 'tr-ambulancia'],
        },
        {
          id: 'grp-agua',
          name: 'Agua',
          imageId: 'esc-agua',
          accentColor: '#2575B5',
          itemIds: ['tr-velero'],
        },
        {
          id: 'grp-aire',
          name: 'Aire',
          imageId: 'esc-aire',
          accentColor: '#3B9AD9',
          itemIds: ['tr-avion', 'tr-helicoptero', 'tr-globo'],
        },
      ],
    },
  },
  // 6. El intruso (NUEVO!)
  {
    id: 'act-intruso-transportes',
    title: 'El intruso',
    description: 'Todos los dibujos son distintos: descubre cuál no pertenece al grupo.',
    gameType: 'intruder',
    collectionIds: ['transportes'],
    builtIn: true,
    createdAt: 1700000007000,
    updatedAt: 1700000007000,
    defaultDifficulty: 'inicial',
    defaultProgression: 'progressive',
    defaultMode: 'individual',
    intruderConfig: {
      baseCollectionId: 'transportes',
      groupItemIds: COLLECTION_BASE_IDS.transportes,
    },
  },
  // 7. Ojo de lince (NUEVO! Tipo Dobble)
  {
    id: 'act-dobble-transportes',
    title: 'Ojo de lince',
    description: 'Dos cartas llenas de dibujos: solo uno se repite en las dos.',
    gameType: 'dobble',
    collectionIds: ['transportes'],
    builtIn: true,
    createdAt: 1700000007500,
    updatedAt: 1700000007500,
    defaultDifficulty: 'inicial',
    defaultProgression: 'progressive',
    defaultMode: 'individual',
    dobbleConfig: {
      itemIds: COLLECTION_BASE_IDS.transportes,
    },
  },
  // 8. Completa la serie (NUEVO! Patrones lógicos)
  {
    id: 'act-serie-transportes',
    title: 'Completa la serie',
    description: 'Observa el ritmo de la serie y elige qué dibujo completa el hueco.',
    gameType: 'pattern',
    collectionIds: ['transportes'],
    builtIn: true,
    createdAt: 1700000007800,
    updatedAt: 1700000007800,
    defaultDifficulty: 'inicial',
    defaultProgression: 'progressive',
    defaultMode: 'individual',
    patternConfig: {
      itemIds: COLLECTION_BASE_IDS.transportes,
    },
  },
  // Extra ready-to-play thematic activities using the new complementary sheets!
  {
    id: 'act-granja-crias',
    title: 'Animal y cría',
    description: 'Une cada animal de granja con su cría correspondiente.',
    gameType: 'matching',
    collectionIds: ['animales-granja'],
    builtIn: true,
    createdAt: 1700000008000,
    updatedAt: 1700000008000,
    defaultDifficulty: 'inicial',
    defaultProgression: 'progressive',
    defaultMode: 'individual',
    matchingConfig: {
      prompt: '¿Cuál es su cría?',
      variant: 'related',
      itemIds: [],
      pairIds: BUILTIN_PAIRS.filter((p) => p.collectionId === 'animales-granja').map((p) => p.id),
    },
  },
  {
    id: 'act-frutas-cortes',
    title: 'Alimento y corte',
    description: 'Relaciona cada fruta u hortaliza entera con su mitad por dentro.',
    gameType: 'matching',
    collectionIds: ['frutas-hortalizas'],
    builtIn: true,
    createdAt: 1700000009000,
    updatedAt: 1700000009000,
    defaultDifficulty: 'inicial',
    defaultProgression: 'progressive',
    defaultMode: 'individual',
    matchingConfig: {
      prompt: '¿Cómo es por dentro?',
      variant: 'related',
      itemIds: [],
      pairIds: BUILTIN_PAIRS.filter((p) => p.collectionId === 'frutas-hortalizas').map((p) => p.id),
    },
  },
  {
    id: 'act-ropa-donde',
    title: 'Prenda y dónde se coloca',
    description: 'Empareja cada prenda con el lugar del cuerpo donde se lleva.',
    gameType: 'matching',
    collectionIds: ['ropa-complementos'],
    builtIn: true,
    createdAt: 1700000010000,
    updatedAt: 1700000010000,
    defaultDifficulty: 'inicial',
    defaultProgression: 'progressive',
    defaultMode: 'individual',
    matchingConfig: {
      prompt: '¿Dónde se coloca esta prenda?',
      variant: 'related',
      itemIds: [],
      pairIds: BUILTIN_PAIRS.filter((p) => p.collectionId === 'ropa-complementos').map((p) => p.id),
    },
  },
  {
    id: 'act-clasifica-entornos',
    title: '¿A qué lugar pertenece?',
    description: 'Clasifica animales y objetos en su escenario: granja, polar, espacio, aula o playa.',
    gameType: 'classification',
    collectionIds: ['animales-granja', 'animales-polares', 'el-espacio', 'material-escolar', 'utensilios-cocina', 'en-la-playa', 'paseo-bosque'],
    builtIn: true,
    createdAt: 1700000011000,
    updatedAt: 1700000011000,
    defaultDifficulty: 'inicial',
    defaultProgression: 'progressive',
    defaultMode: 'individual',
    classificationConfig: {
      prompt: '¿En qué escenario encontrarías cada dibujo?',
      classificationMode: 'thematic',
      initialItemIds: ['grj-vaca', 'pol-oso', 'esp-cohete', 'pla-sombrilla'],
      groups: [
        { id: 'env-granja', name: 'Granja', imageId: 'esc-granja', accentColor: '#C48342', itemIds: ['grj-vaca', 'grj-cerdo', 'grj-oveja', 'grj-gallina'] },
        { id: 'env-polar', name: 'Polo', imageId: 'esc-polar', accentColor: '#457B9D', itemIds: ['pol-oso', 'pol-pinguino', 'pol-foca', 'pol-orca'] },
        { id: 'env-espacio', name: 'Espacio', imageId: 'esc-espacio', accentColor: '#3B5998', itemIds: ['esp-cohete', 'esp-astronauta', 'esp-saturno', 'esp-luna'] },
        { id: 'env-playa', name: 'Playa', imageId: 'esc-playa', accentColor: '#0EA5E9', itemIds: ['pla-sombrilla', 'pla-cubo', 'pla-castillo', 'pla-concha'] },
      ],
    },
  },
];

export const COLLECTION_SCENARIO_MAP: Record<string, string> = {
  transportes: 'esc-tierra',
  'animales-granja': 'esc-granja',
  'animales-bosque': 'esc-bosque',
  'paseo-bosque': 'esc-bosque',
  'animales-polares': 'esc-polar',
  'el-espacio': 'esc-espacio',
  'material-escolar': 'esc-aula',
  'utensilios-cocina': 'esc-cocina',
  'en-la-playa': 'esc-playa',
};

const THEME_GROUP_ACCENTS = [
  '#218A80',
  '#DD6B4D',
  '#D98A1F',
  '#466094',
  '#5B8E55',
  '#8B5CF6',
];

function getPiecesForCollection(colId: string, images: ImageItem[]): string[] {
  const baseIds = COLLECTION_BASE_IDS[colId];
  if (baseIds) {
    return baseIds.filter((id) => images.some((i) => i.id === id));
  }
  return images
    .filter((i) => i.collectionId === colId && i.kind === 'piece')
    .map((i) => i.id);
}

/**
 * Interleaves piece IDs across multiple selected collections in round-robin order
 * so thumbnails and Inicial rounds immediately showcase variety from every chosen theme.
 */
function interleavePieces(lists: string[][]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const maxLen = lists.reduce((m, l) => Math.max(m, l.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const list of lists) {
      const id = list[i];
      if (id && !seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
  }
  return out;
}

export function formatSelectedThemesLabel(
  selectedCollections: CollectionItem[],
  isAllSelected: boolean
): string {
  if (isAllSelected) return 'Todas las temáticas';
  if (selectedCollections.length === 0) return 'Todas las temáticas';
  if (selectedCollections.length === 1) return selectedCollections[0].name;
  if (selectedCollections.length === 2) {
    const combined = `${selectedCollections[0].name} y ${selectedCollections[1].name}`;
    return combined.length <= 34 ? combined : '2 temáticas';
  }
  return `${selectedCollections.length} temáticas`;
}

/**
 * Dynamically generates ready-to-play activities for ANY combination of selected themes
 * (1 theme, several chosen themes, or ALL themes) across all 8 games!
 */
export function buildThematicGamesForCollections(
  selectedCollections: CollectionItem[],
  isAllSelected: boolean,
  images: ImageItem[],
  pairs: ImagePair[]
): Activity[] {
  if (selectedCollections.length === 0) return [];

  const perColPieces = selectedCollections
    .map((col) => ({
      col,
      pieceIds: getPiecesForCollection(col.id, images),
    }))
    .filter((entry) => entry.pieceIds.length >= 2);

  if (perColPieces.length === 0) return [];

  const mergedPieces = interleavePieces(perColPieces.map((e) => e.pieceIds));
  if (mergedPieces.length < 2) return [];

  const colIds = perColPieces.map((e) => e.col.id);
  const colIdSet = new Set(colIds);
  const keySuffix = isAllSelected ? 'all' : colIds.join('__');
  const themeLabel = formatSelectedThemesLabel(
    perColPieces.map((e) => e.col),
    isAllSelected
  );

  const colPairs = pairs.filter((p) => colIdSet.has(p.collectionId) && p.pairKind === 'related');
  const detailPairs = pairs.filter((p) => colIdSet.has(p.collectionId) && p.pairKind === 'detail');
  const now = 1700001000000;

  // Build Classification activities:
  // 1) Attributes classification (with collectionIds set so "Temática × Tamaño" draws from all selected themes!)
  const baseAttrActivity = BUILTIN_ACTIVITIES.find((a) => a.id === 'act-atributos-formas')!;
  const attrActivity: Activity = {
    ...baseAttrActivity,
    id: `dyn-attr-${keySuffix}`,
    collectionIds: colIds,
  };

  // 2) Thematic classification:
  //    - Single 'transportes' -> Tierra/Agua/Aire
  //    - 2..4 selected themes -> dynamic groups directly from the chosen themes (with landscapes or lead icons!)
  //    - Single other theme or 5+/Todas -> ¿A qué lugar pertenece? (Granja / Polo / Espacio / Playa)
  let thematicClsActivity: Activity;
  if (colIds.length === 1 && colIds[0] === 'transportes') {
    thematicClsActivity = BUILTIN_ACTIVITIES.find((a) => a.id === 'act-transportes-clasificacion')!;
  } else if (perColPieces.length >= 2 && perColPieces.length <= 4 && !isAllSelected) {
    const groups = perColPieces.map((entry, idx) => {
      const scenarioId = COLLECTION_SCENARIO_MAP[entry.col.id];
      const hasScenario = scenarioId && images.some((i) => i.id === scenarioId);
      return {
        id: `grp-${entry.col.id}`,
        name: entry.col.name,
        imageId: hasScenario ? scenarioId : entry.pieceIds[0],
        accentColor: THEME_GROUP_ACCENTS[idx % THEME_GROUP_ACCENTS.length],
        itemIds: entry.pieceIds,
      };
    });
    thematicClsActivity = {
      id: `dyn-cls-${keySuffix}`,
      title: `Clasificación: ${themeLabel}`,
      description: 'Clasifica cada dibujo en la temática a la que pertenece.',
      gameType: 'classification',
      collectionIds: colIds,
      builtIn: true,
      createdAt: now + 5,
      updatedAt: now + 5,
      defaultDifficulty: 'inicial',
      defaultProgression: 'progressive',
      defaultMode: 'individual',
      classificationConfig: {
        prompt: '¿A qué temática pertenece cada dibujo?',
        classificationMode: 'thematic',
        initialItemIds: interleavePieces(perColPieces.map((e) => e.pieceIds.slice(0, 2))).slice(0, 4),
        groups,
      },
    };
  } else {
    thematicClsActivity = BUILTIN_ACTIVITIES.find((a) => a.id === 'act-clasifica-entornos')!;
  }

  const list: Activity[] = [
    // 1. Memory de parejas
    {
      id: `dyn-memory-${keySuffix}`,
      title: `Memory: ${themeLabel}`,
      description: 'Inicial: 2 parejas muy diferentes. Avanzado: hasta 8 parejas (16 cartas) de tus temáticas.',
      gameType: 'memory',
      collectionIds: colIds,
      builtIn: true,
      createdAt: now + 1,
      updatedAt: now + 1,
      defaultDifficulty: 'inicial',
      defaultProgression: 'progressive',
      defaultMode: 'individual',
      memoryConfig: {
        variant: 'identical',
        itemIds: mergedPieces,
        pairIds: colPairs.map((p) => p.id),
        initialItemIds: mergedPieces.slice(0, 3),
      },
    },
    // 2. ¿Qué ha cambiado?
    {
      id: `dyn-wc-${keySuffix}`,
      title: `¿Qué ha cambiado?: ${themeLabel}`,
      description: 'Inicial: 3 objetos y desaparece 1. Avanzado: desplazamiento, giro e intercambio de posición.',
      gameType: 'what-changed',
      collectionIds: colIds,
      builtIn: true,
      createdAt: now + 2,
      updatedAt: now + 2,
      defaultDifficulty: 'inicial',
      defaultProgression: 'progressive',
      defaultMode: 'individual',
      whatChangedConfig: {
        itemIds: mergedPieces,
        detailPairIds: detailPairs.map((p) => p.id),
        initialItemIds: mergedPieces.slice(0, 3),
        observationTimerSeconds: null,
      },
    },
    // 3. Recuerda el orden
    {
      id: `dyn-seq-${keySuffix}`,
      title: `Recuerda el orden: ${themeLabel}`,
      description: 'Inicial: 2 imágenes en orden. Avanzado: secuencia larga con opciones parecidas y sobrantes.',
      gameType: 'sequence',
      collectionIds: colIds,
      builtIn: true,
      createdAt: now + 3,
      updatedAt: now + 3,
      defaultDifficulty: 'inicial',
      defaultProgression: 'progressive',
      defaultMode: 'individual',
      sequenceConfig: {
        itemIds: mergedPieces,
        initialItemIds: mergedPieces.slice(0, 3),
        observationTimerSeconds: null,
      },
    },
    // 4. Correspondencias visuales (Silueta en Inicial -> Fragmento en Avanzado)
    {
      id: `dyn-match-${keySuffix}`,
      title: `Correspondencias: ${themeLabel}`,
      description: 'Inicial: silueta entre 2 opciones. Avanzado: reconoce a qué imagen pertenece un fragmento.',
      gameType: 'matching',
      collectionIds: colIds,
      builtIn: true,
      createdAt: now + 4,
      updatedAt: now + 4,
      defaultDifficulty: 'inicial',
      defaultProgression: 'progressive',
      defaultMode: 'individual',
      matchingConfig: {
        prompt: '¿Cuál es su silueta?',
        variant: 'silhouette',
        itemIds: mergedPieces,
        pairIds: colPairs.map((p) => p.id),
        initialItemIds: mergedPieces.slice(0, 3),
      },
    },
    // 5. Clasificación (Atributos + Temática)
    attrActivity,
    thematicClsActivity,
    // 6. El intruso
    {
      id: `dyn-intruder-${keySuffix}`,
      title: `El intruso: ${themeLabel}`,
      description: 'Todos los dibujos son distintos: encuentra cuál no pertenece a la categoría.',
      gameType: 'intruder',
      collectionIds: colIds,
      builtIn: true,
      createdAt: now + 6,
      updatedAt: now + 6,
      defaultDifficulty: 'inicial',
      defaultProgression: 'progressive',
      defaultMode: 'individual',
      intruderConfig: {
        baseCollectionId: colIds[0],
        allowedCollectionIds: colIds,
        groupItemIds: mergedPieces,
      },
    },
    // 7. Ojo de lince (tipo Dobble)
    {
      id: `dyn-dobble-${keySuffix}`,
      title: `Ojo de lince: ${themeLabel}`,
      description: 'Dos cartas llenas de dibujos: encuentra el único que se repite en ambas.',
      gameType: 'dobble',
      collectionIds: colIds,
      builtIn: true,
      createdAt: now + 7,
      updatedAt: now + 7,
      defaultDifficulty: 'inicial',
      defaultProgression: 'progressive',
      defaultMode: 'individual',
      dobbleConfig: {
        itemIds: mergedPieces,
      },
    },
    // 8. Completa la serie
    {
      id: `dyn-pattern-${keySuffix}`,
      title: `Completa la serie: ${themeLabel}`,
      description: 'Descubre el patrón (ABAB, ABC, hueco intermedio o doble regla) y complétalo.',
      gameType: 'pattern',
      collectionIds: colIds,
      builtIn: true,
      createdAt: now + 8,
      updatedAt: now + 8,
      defaultDifficulty: 'inicial',
      defaultProgression: 'progressive',
      defaultMode: 'individual',
      patternConfig: {
        itemIds: mergedPieces,
      },
    },
  ];

  // Add Related-Pairs Correspondencias when selected themes include pair collections (Granja, Frutas, Ropa)
  if (colPairs.length >= 2) {
    const distinctPairCols = new Set(colPairs.map((p) => p.collectionId));
    if (distinctPairCols.size === 1) {
      const onlyCol = Array.from(distinctPairCols)[0];
      const specialMatch = BUILTIN_ACTIVITIES.find(
        (a) =>
          a.gameType === 'matching' &&
          a.matchingConfig?.variant === 'related' &&
          a.collectionIds.includes(onlyCol)
      );
      if (specialMatch) list.push(specialMatch);
    } else {
      list.push({
        id: `dyn-match-rel-${keySuffix}`,
        title: 'Parejas relacionadas',
        description: 'Empareja cada elemento con su cría, su corte o dónde se coloca.',
        gameType: 'matching',
        collectionIds: Array.from(distinctPairCols),
        builtIn: true,
        createdAt: now + 9,
        updatedAt: now + 9,
        defaultDifficulty: 'inicial',
        defaultProgression: 'progressive',
        defaultMode: 'individual',
        matchingConfig: {
          prompt: '¿Qué dibujo le corresponde?',
          variant: 'related',
          itemIds: [],
          pairIds: colPairs.map((p) => p.id),
        },
      });
    }
  }

  return list;
}

/**
 * Single-collection wrapper for backwards compatibility.
 */
export function buildThematicGamesForCollection(
  collection: CollectionItem,
  images: ImageItem[],
  pairs: ImagePair[]
): Activity[] {
  return buildThematicGamesForCollections([collection], false, images, pairs);
}

export const DEFAULT_PREFS: UserPrefs = {
  soundEnabled: true,
  voiceEnabled: true,
  lastMode: 'individual',
  lastDifficulty: 'inicial',
  lastProgression: 'progressive',
  lastThemeId: 'transportes',
  lastThemeIds: ['transportes'],
  seenDemos: {},
};
