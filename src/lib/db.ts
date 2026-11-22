import type {
  Activity,
  AppDataState,
  CollectionItem,
  ExportedActivityBundle,
  ImageItem,
  ImagePair,
  UserPrefs,
} from '../types';
import {
  BUILTIN_ACTIVITIES,
  BUILTIN_COLLECTIONS,
  BUILTIN_IMAGES,
  BUILTIN_PAIRS,
  DEFAULT_PREFS,
} from '../data/catalog';

const DB_NAME = 'mira-y-recuerda-db';
const DB_VERSION = 1;

const STORES = {
  collections: 'collections',
  images: 'images',
  pairs: 'pairs',
  activities: 'activities',
  prefs: 'prefs',
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.collections)) {
        db.createObjectStore(STORES.collections, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.images)) {
        db.createObjectStore(STORES.images, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.pairs)) {
        db.createObjectStore(STORES.pairs, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.activities)) {
        db.createObjectStore(STORES.activities, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.prefs)) {
        db.createObjectStore(STORES.prefs, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

async function putItem<T>(storeName: string, item: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteById(storeName: string, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function mergeById<T extends { id: string }>(builtIns: T[], stored: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of builtIns) map.set(item.id, item);
  for (const item of stored) map.set(item.id, item);
  return Array.from(map.values());
}

export async function loadAppState(): Promise<AppDataState> {
  try {
    const [storedCols, storedImgs, storedPairs, storedActs, storedPrefs] = await Promise.all([
      getAll<CollectionItem>(STORES.collections),
      getAll<ImageItem>(STORES.images),
      getAll<ImagePair>(STORES.pairs),
      getAll<Activity>(STORES.activities),
      getAll<{ id: string; value: UserPrefs }>(STORES.prefs),
    ]);

    const collections = mergeById(BUILTIN_COLLECTIONS, storedCols).sort(
      (a, b) => a.order - b.order
    );
    const images = mergeById(BUILTIN_IMAGES, storedImgs);
    const pairs = mergeById(BUILTIN_PAIRS, storedPairs);
    const activities = mergeById(BUILTIN_ACTIVITIES, storedActs).sort(
      (a, b) => (a.builtIn ? 0 : 1) - (b.builtIn ? 0 : 1) || a.createdAt - b.createdAt
    );

    const prefsRecord = storedPrefs.find((p) => p.id === 'user-prefs');
    const prefs: UserPrefs = prefsRecord
      ? { ...DEFAULT_PREFS, ...prefsRecord.value }
      : DEFAULT_PREFS;

    return { collections, images, pairs, activities, prefs };
  } catch (err) {
    console.warn('IndexedDB no disponible, usando estado en memoria:', err);
    return {
      collections: [...BUILTIN_COLLECTIONS],
      images: [...BUILTIN_IMAGES],
      pairs: [...BUILTIN_PAIRS],
      activities: [...BUILTIN_ACTIVITIES],
      prefs: { ...DEFAULT_PREFS },
    };
  }
}

export async function saveCollection(col: CollectionItem): Promise<void> {
  await putItem(STORES.collections, col);
}

export async function deleteCollection(id: string): Promise<void> {
  await deleteById(STORES.collections, id);
}

export async function saveImage(img: ImageItem): Promise<void> {
  await putItem(STORES.images, img);
}

export async function deleteImage(id: string): Promise<void> {
  await deleteById(STORES.images, id);
}

export async function savePair(pair: ImagePair): Promise<void> {
  await putItem(STORES.pairs, pair);
}

export async function deletePair(id: string): Promise<void> {
  await deleteById(STORES.pairs, id);
}

export async function saveActivity(activity: Activity): Promise<void> {
  await putItem(STORES.activities, activity);
}

export async function deleteActivity(id: string): Promise<void> {
  await deleteById(STORES.activities, id);
}

export async function savePrefs(prefs: UserPrefs): Promise<void> {
  await putItem(STORES.prefs, { id: 'user-prefs', value: prefs });
}

async function urlToDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const resp = await fetch(url);
  const blob = await resp.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function collectActivityReferencedIds(
  activity: Activity,
  allPairs: ImagePair[]
): { imageIds: Set<string>; pairIds: Set<string>; collectionIds: Set<string> } {
  const imageIds = new Set<string>();
  const pairIds = new Set<string>();
  const collectionIds = new Set<string>(activity.collectionIds || []);

  if (activity.memoryConfig) {
    activity.memoryConfig.itemIds.forEach((id) => imageIds.add(id));
    activity.memoryConfig.initialItemIds?.forEach((id) => imageIds.add(id));
    activity.memoryConfig.pairIds.forEach((id) => pairIds.add(id));
  }
  if (activity.classificationConfig) {
    activity.classificationConfig.initialItemIds?.forEach((id) => imageIds.add(id));
    activity.classificationConfig.groups.forEach((g) => {
      if (g.imageId) imageIds.add(g.imageId);
      g.itemIds.forEach((id) => imageIds.add(id));
    });
  }
  if (activity.matchingConfig) {
    activity.matchingConfig.itemIds.forEach((id) => imageIds.add(id));
    activity.matchingConfig.initialItemIds?.forEach((id) => imageIds.add(id));
    activity.matchingConfig.pairIds.forEach((id) => pairIds.add(id));
  }
  if (activity.whatChangedConfig) {
    activity.whatChangedConfig.itemIds.forEach((id) => imageIds.add(id));
    activity.whatChangedConfig.initialItemIds?.forEach((id) => imageIds.add(id));
    activity.whatChangedConfig.detailPairIds.forEach((id) => pairIds.add(id));
  }
  if (activity.sequenceConfig) {
    activity.sequenceConfig.itemIds.forEach((id) => imageIds.add(id));
    activity.sequenceConfig.initialItemIds?.forEach((id) => imageIds.add(id));
  }
  if (activity.intruderConfig) {
    activity.intruderConfig.groupItemIds.forEach((id) => imageIds.add(id));
    activity.intruderConfig.intruderItemIds?.forEach((id) => imageIds.add(id));
  }
  if (activity.dobbleConfig) {
    activity.dobbleConfig.itemIds.forEach((id) => imageIds.add(id));
  }
  if (activity.patternConfig) {
    activity.patternConfig.itemIds.forEach((id) => imageIds.add(id));
  }

  for (const pid of pairIds) {
    const pair = allPairs.find((p) => p.id === pid);
    if (pair) {
      imageIds.add(pair.itemAId);
      imageIds.add(pair.itemBId);
      if (pair.collectionId) collectionIds.add(pair.collectionId);
    }
  }

  return { imageIds, pairIds, collectionIds };
}

export async function exportActivityBundle(
  activity: Activity,
  state: AppDataState
): Promise<ExportedActivityBundle> {
  const { imageIds, pairIds, collectionIds } = collectActivityReferencedIds(activity, state.pairs);

  const referencedImages = state.images.filter((img) => imageIds.has(img.id));
  referencedImages.forEach((img) => collectionIds.add(img.collectionId));

  const embeddedImages: ImageItem[] = await Promise.all(
    referencedImages.map(async (img) => ({
      ...img,
      builtIn: false,
      src: await urlToDataUrl(img.src),
      silhouetteSrc: img.silhouetteSrc ? await urlToDataUrl(img.silhouetteSrc) : undefined,
    }))
  );

  const embeddedPairs = state.pairs
    .filter((p) => pairIds.has(p.id))
    .map((p) => ({ ...p, builtIn: false }));

  const embeddedCollections = state.collections
    .filter((c) => collectionIds.has(c.id))
    .map((c) => ({ ...c, builtIn: false }));

  const exportedActivity: Activity = {
    ...activity,
    builtIn: false,
  };

  return {
    format: 'mira-y-recuerda-activity-v1',
    exportedAt: new Date().toISOString(),
    activity: exportedActivity,
    collections: embeddedCollections,
    images: embeddedImages,
    pairs: embeddedPairs,
  };
}

export async function importActivityBundle(
  rawJson: string,
  currentState: AppDataState
): Promise<{ activity: Activity; nextState: AppDataState }> {
  const parsed = JSON.parse(rawJson) as Partial<ExportedActivityBundle>;
  if (
    parsed.format !== 'mira-y-recuerda-activity-v1' ||
    !parsed.activity ||
    !Array.isArray(parsed.images)
  ) {
    throw new Error('El archivo no es una actividad válida de Mira y Recuerda.');
  }

  const now = Date.now();
  const suffix = Math.random().toString(36).slice(2, 7);

  // Import collections that do not yet exist by ID
  const existingColIds = new Set(currentState.collections.map((c) => c.id));
  for (const col of parsed.collections || []) {
    if (!existingColIds.has(col.id)) {
      await saveCollection({
        ...col,
        builtIn: false,
        isCoreCatalog: false,
        order: currentState.collections.length + 10,
      });
    }
  }

  // Import images (preserve builtIn IDs if they already exist locally, otherwise save embedded copy)
  const existingImgMap = new Map(currentState.images.map((i) => [i.id, i]));
  const idRemap = new Map<string, string>();
  for (const img of parsed.images) {
    const existing = existingImgMap.get(img.id);
    if (existing && existing.builtIn) {
      // Built-in image already exists locally; still works if missing on another device because we save if absent
      idRemap.set(img.id, img.id);
    } else if (!existing) {
      await saveImage({ ...img, builtIn: false, createdAt: img.createdAt || now });
      idRemap.set(img.id, img.id);
    } else {
      // If same custom ID exists with different content, save under remapped ID
      if (existing.src === img.src && existing.name === img.name) {
        idRemap.set(img.id, img.id);
      } else {
        const newId = `${img.id}-imp-${suffix}`;
        await saveImage({ ...img, id: newId, builtIn: false, createdAt: now });
        idRemap.set(img.id, newId);
      }
    }
  }

  const remapImg = (id: string) => idRemap.get(id) || id;

  // Import pairs
  const existingPairIds = new Set(currentState.pairs.map((p) => p.id));
  const pairRemap = new Map<string, string>();
  for (const pair of parsed.pairs || []) {
    const mappedPair: ImagePair = {
      ...pair,
      builtIn: false,
      itemAId: remapImg(pair.itemAId),
      itemBId: remapImg(pair.itemBId),
      createdAt: pair.createdAt || now,
    };
    if (!existingPairIds.has(pair.id)) {
      await savePair(mappedPair);
      pairRemap.set(pair.id, pair.id);
    } else {
      const newPid = `${pair.id}-imp-${suffix}`;
      await savePair({ ...mappedPair, id: newPid });
      pairRemap.set(pair.id, newPid);
    }
  }

  const remapPair = (id: string) => pairRemap.get(id) || id;

  // Import activity (assign fresh ID if an activity with same ID already exists)
  const existingActIds = new Set(currentState.activities.map((a) => a.id));
  const act = parsed.activity;
  const finalActId = existingActIds.has(act.id) ? `${act.id}-imp-${suffix}` : act.id;
  const importedActivity: Activity = {
    ...act,
    id: finalActId,
    builtIn: false,
    createdAt: now,
    updatedAt: now,
    memoryConfig: act.memoryConfig
      ? {
          ...act.memoryConfig,
          itemIds: act.memoryConfig.itemIds.map(remapImg),
          initialItemIds: act.memoryConfig.initialItemIds?.map(remapImg),
          pairIds: act.memoryConfig.pairIds.map(remapPair),
        }
      : undefined,
    classificationConfig: act.classificationConfig
      ? {
          ...act.classificationConfig,
          initialItemIds: act.classificationConfig.initialItemIds?.map(remapImg),
          groups: act.classificationConfig.groups.map((g) => ({
            ...g,
            imageId: g.imageId ? remapImg(g.imageId) : undefined,
            itemIds: g.itemIds.map(remapImg),
          })),
        }
      : undefined,
    matchingConfig: act.matchingConfig
      ? {
          ...act.matchingConfig,
          itemIds: act.matchingConfig.itemIds.map(remapImg),
          initialItemIds: act.matchingConfig.initialItemIds?.map(remapImg),
          pairIds: act.matchingConfig.pairIds.map(remapPair),
        }
      : undefined,
    whatChangedConfig: act.whatChangedConfig
      ? {
          ...act.whatChangedConfig,
          itemIds: act.whatChangedConfig.itemIds.map(remapImg),
          initialItemIds: act.whatChangedConfig.initialItemIds?.map(remapImg),
          detailPairIds: act.whatChangedConfig.detailPairIds.map(remapPair),
        }
      : undefined,
    sequenceConfig: act.sequenceConfig
      ? {
          ...act.sequenceConfig,
          itemIds: act.sequenceConfig.itemIds.map(remapImg),
          initialItemIds: act.sequenceConfig.initialItemIds?.map(remapImg),
        }
      : undefined,
    intruderConfig: act.intruderConfig
      ? {
          ...act.intruderConfig,
          groupItemIds: act.intruderConfig.groupItemIds.map(remapImg),
          intruderItemIds: act.intruderConfig.intruderItemIds?.map(remapImg),
        }
      : undefined,
    dobbleConfig: act.dobbleConfig
      ? {
          ...act.dobbleConfig,
          itemIds: act.dobbleConfig.itemIds.map(remapImg),
        }
      : undefined,
    patternConfig: act.patternConfig
      ? {
          ...act.patternConfig,
          itemIds: act.patternConfig.itemIds.map(remapImg),
        }
      : undefined,
  };

  await saveActivity(importedActivity);
  const nextState = await loadAppState();
  return { activity: importedActivity, nextState };
}
