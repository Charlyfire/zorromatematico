import type { Activity, ImageItem, ImagePair } from '../types';

export function isActivityPlayable(
  activity: Activity,
  images: ImageItem[],
  pairs: ImagePair[]
): boolean {
  const imageMap = new Map(images.map((i) => [i.id, i]));
  const pairMap = new Map(pairs.map((p) => [p.id, p]));

  switch (activity.gameType) {
    case 'memory': {
      const cfg = activity.memoryConfig;
      if (!cfg) return false;
      if (cfg.variant === 'small-details') return true;
      if (cfg.variant === 'identical') {
        const valid = cfg.itemIds.filter((id) => imageMap.has(id));
        return valid.length >= 2;
      }
      const validPairs = cfg.pairIds
        .map((id) => pairMap.get(id))
        .filter((p): p is ImagePair => Boolean(p && imageMap.has(p.itemAId) && imageMap.has(p.itemBId)));
      return validPairs.length >= 2;
    }
    case 'classification': {
      const cfg = activity.classificationConfig;
      if (!cfg) return false;
      if (cfg.classificationMode === 'attributes') return true;
      if (cfg.groups.length < 2) return false;
      const totalValidPieces = cfg.groups.reduce(
        (acc, g) => acc + g.itemIds.filter((id) => imageMap.has(id)).length,
        0
      );
      return totalValidPieces >= 2;
    }
    case 'matching': {
      const cfg = activity.matchingConfig;
      if (!cfg) return false;
      if (cfg.variant === 'silhouette') {
        const valid = cfg.itemIds.filter((id) => {
          const img = imageMap.get(id);
          return Boolean(img && img.silhouetteSrc);
        });
        return valid.length >= 2;
      }
      if (cfg.variant === 'fragment') {
        const valid = cfg.itemIds.filter((id) => imageMap.has(id));
        return valid.length >= 2;
      }
      const validPairs = cfg.pairIds
        .map((id) => pairMap.get(id))
        .filter((p): p is ImagePair => Boolean(p && imageMap.has(p.itemAId) && imageMap.has(p.itemBId)));
      return validPairs.length >= 2;
    }
    case 'what-changed': {
      const cfg = activity.whatChangedConfig;
      if (!cfg) return false;
      const validItems = cfg.itemIds.filter((id) => imageMap.has(id));
      const validDetailPairs = cfg.detailPairIds
        .map((id) => pairMap.get(id))
        .filter((p): p is ImagePair => Boolean(p && imageMap.has(p.itemAId) && imageMap.has(p.itemBId)));
      return validItems.length >= 3 || (validItems.length >= 2 && validDetailPairs.length >= 1);
    }
    case 'sequence': {
      const cfg = activity.sequenceConfig;
      if (!cfg) return false;
      return cfg.itemIds.filter((id) => imageMap.has(id)).length >= 2;
    }
    case 'intruder': {
      const cfg = activity.intruderConfig;
      if (!cfg) return false;
      return cfg.groupItemIds.filter((id) => imageMap.has(id)).length >= 3;
    }
    case 'dobble': {
      const cfg = activity.dobbleConfig;
      if (!cfg) return false;
      return cfg.itemIds.filter((id) => imageMap.has(id)).length >= 3;
    }
    case 'pattern': {
      const cfg = activity.patternConfig;
      if (!cfg) return false;
      return cfg.itemIds.filter((id) => imageMap.has(id)).length >= 2;
    }
    default:
      return false;
  }
}

export function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
