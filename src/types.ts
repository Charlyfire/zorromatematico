export type GameType =
  | 'memory'
  | 'what-changed'
  | 'sequence'
  | 'matching'
  | 'classification'
  | 'intruder'
  | 'dobble'
  | 'pattern';

export type PlayMode = 'individual' | 'asamblea';

export type DifficultyLevel = 'inicial' | 'sencillo' | 'intermedio' | 'avanzado';

export type DifficultyProgression = 'fixed' | 'progressive';

export type AssetKind = 'piece' | 'scenario';

export interface ImageItem {
  id: string;
  name: string;
  collectionId: string;
  kind: AssetKind;
  src: string;
  silhouetteSrc?: string;
  similarityGroup?: string;
  builtIn?: boolean;
  createdAt?: number;
}

export interface CollectionItem {
  id: string;
  name: string;
  description: string;
  order: number;
  accentColor: string;
  isCoreCatalog?: boolean;
  builtIn?: boolean;
}

export type PairKind = 'related' | 'detail';

export interface ImagePair {
  id: string;
  label: string;
  collectionId: string;
  pairKind: PairKind;
  itemAId: string;
  itemBId: string;
  builtIn?: boolean;
  createdAt?: number;
}

export interface ClassificationGroup {
  id: string;
  name: string;
  imageId?: string;
  accentColor: string;
  itemIds: string[];
}

export interface MemoryDifficultyParams {
  pairsCount: number;
  useSmallDetails?: boolean;
}

export interface ClassificationDifficultyParams {
  piecesCount: number;
}

export interface MatchingDifficultyParams {
  optionsCount: number;
  preferSimilar: boolean;
  useFragment?: boolean;
}

export interface WhatChangedDifficultyParams {
  itemsCount: number;
  optionsCount: number;
  variant: 'disappear' | 'move' | 'rotate' | 'swap' | 'mixed';
  emptySlots: number;
}

export interface SequenceDifficultyParams {
  sequenceLength: number;
  extraDistractors: number;
  preferSimilar: boolean;
}

export interface IntruderDifficultyParams {
  totalItems: number;
  subtleCategory: boolean;
}

export interface DobbleDifficultyParams {
  symbolsPerCard: number;
  varySize: boolean;
  varyRotation: boolean;
}

export interface PatternDifficultyParams {
  patternType: 'AB' | 'ABC' | 'mid-gap' | 'double-rule';
  optionsCount: number;
}

export interface ActivityDifficultyConfig {
  memory?: Record<DifficultyLevel, MemoryDifficultyParams>;
  classification?: Record<DifficultyLevel, ClassificationDifficultyParams>;
  matching?: Record<DifficultyLevel, MatchingDifficultyParams>;
  whatChanged?: Record<DifficultyLevel, WhatChangedDifficultyParams>;
  sequence?: Record<DifficultyLevel, SequenceDifficultyParams>;
  intruder?: Record<DifficultyLevel, IntruderDifficultyParams>;
  dobble?: Record<DifficultyLevel, DobbleDifficultyParams>;
  pattern?: Record<DifficultyLevel, PatternDifficultyParams>;
}

export interface MemoryConfig {
  variant: 'identical' | 'related' | 'small-details';
  itemIds: string[];
  pairIds: string[];
  initialItemIds?: string[];
}

export interface ClassificationConfig {
  prompt: string;
  classificationMode?: 'thematic' | 'attributes';
  groups: ClassificationGroup[];
  initialItemIds?: string[];
}

export interface MatchingConfig {
  prompt: string;
  variant: 'silhouette' | 'related' | 'fragment';
  itemIds: string[];
  pairIds: string[];
  initialItemIds?: string[];
}

export interface WhatChangedConfig {
  itemIds: string[];
  detailPairIds: string[];
  initialItemIds?: string[];
  observationTimerSeconds?: number | null;
}

export interface SequenceConfig {
  itemIds: string[];
  initialItemIds?: string[];
  observationTimerSeconds?: number | null;
}

export interface IntruderConfig {
  baseCollectionId?: string;
  allowedCollectionIds?: string[];
  groupItemIds: string[];
  intruderItemIds?: string[];
}

export interface DobbleConfig {
  itemIds: string[];
}

export interface PatternConfig {
  itemIds: string[];
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  gameType: GameType;
  collectionIds: string[];
  builtIn?: boolean;
  createdAt: number;
  updatedAt: number;
  defaultDifficulty: DifficultyLevel;
  defaultProgression: DifficultyProgression;
  defaultMode: PlayMode;
  difficultyConfig?: ActivityDifficultyConfig;
  memoryConfig?: MemoryConfig;
  classificationConfig?: ClassificationConfig;
  matchingConfig?: MatchingConfig;
  whatChangedConfig?: WhatChangedConfig;
  sequenceConfig?: SequenceConfig;
  intruderConfig?: IntruderConfig;
  dobbleConfig?: DobbleConfig;
  patternConfig?: PatternConfig;
}

export interface UserPrefs {
  soundEnabled: boolean;
  voiceEnabled: boolean;
  lastMode: PlayMode;
  lastDifficulty: DifficultyLevel;
  lastProgression: DifficultyProgression;
  lastThemeId?: string;
  lastThemeIds?: string[];
  pdiSafeBottom?: boolean;
  seenDemos: Partial<Record<GameType, boolean>>;
}

export interface ExportedActivityBundle {
  format: 'mira-y-recuerda-activity-v1';
  exportedAt: string;
  activity: Activity;
  collections: CollectionItem[];
  images: ImageItem[];
  pairs: ImagePair[];
}

export interface AppDataState {
  collections: CollectionItem[];
  images: ImageItem[];
  pairs: ImagePair[];
  activities: Activity[];
  prefs: UserPrefs;
}

export interface LaunchSession {
  activity: Activity;
  mode: PlayMode;
  difficulty: DifficultyLevel;
  progression: DifficultyProgression;
  memoryPairsCount?: number;
  customDifficultyConfig?: ActivityDifficultyConfig;
}
