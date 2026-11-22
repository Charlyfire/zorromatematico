import { useMemo, useState } from 'react';
import { Printer, Scissors, X } from 'lucide-react';
import type { Activity, ImageItem, ImagePair } from '../types';
import {
  makeAttributeShapeSvg,
  makeTurquoisePatternShapeSvg,
  SMALL_DETAILS_MEMORY_DECK,
} from '../data/specialArt';
import { CardBackEmblem, GAME_TYPE_META } from './GameIcons';

interface PrintableCard {
  uid: string;
  src: string;
  label: string;
  badge?: string;
  isScenario?: boolean;
}

interface PrintableSheetModalProps {
  activity: Activity;
  images: ImageItem[];
  pairs: ImagePair[];
  onClose: () => void;
}

type CardDensity = 'large' | 'medium' | 'small';

export function PrintableSheetModal({
  activity,
  images,
  pairs,
  onClose,
}: PrintableSheetModalProps) {
  const [density, setDensity] = useState<CardDensity>('medium');
  const [showNames, setShowNames] = useState(true);
  const [showCutGuides, setShowCutGuides] = useState(true);
  const [includeBacks, setIncludeBacks] = useState(activity.gameType === 'memory');

  const imageMap = useMemo(() => new Map(images.map((i) => [i.id, i])), [images]);
  const pairMap = useMemo(() => new Map(pairs.map((p) => [p.id, p])), [pairs]);

  const cards = useMemo<PrintableCard[]>(() => {
    const out: PrintableCard[] = [];

    if (activity.gameType === 'memory' && activity.memoryConfig) {
      if (activity.memoryConfig.variant === 'small-details') {
        SMALL_DETAILS_MEMORY_DECK.forEach((d) => {
          out.push({ uid: `${d.id}-1`, src: d.src, label: d.name });
          out.push({ uid: `${d.id}-2`, src: d.src, label: d.name });
        });
      } else if (activity.memoryConfig.variant === 'related') {
        activity.memoryConfig.pairIds.forEach((pid) => {
          const p = pairMap.get(pid);
          if (!p) return;
          const a = imageMap.get(p.itemAId);
          const b = imageMap.get(p.itemBId);
          if (a) out.push({ uid: `${pid}-a`, src: a.src, label: a.name, badge: 'Pareja' });
          if (b) out.push({ uid: `${pid}-b`, src: b.src, label: b.name, badge: 'Pareja' });
        });
      } else {
        activity.memoryConfig.itemIds.forEach((id) => {
          const img = imageMap.get(id);
          if (!img) return;
          out.push({ uid: `${id}-1`, src: img.src, label: img.name });
          out.push({ uid: `${id}-2`, src: img.src, label: img.name });
        });
      }
    } else if (activity.gameType === 'matching' && activity.matchingConfig) {
      if (activity.matchingConfig.variant === 'related') {
        activity.matchingConfig.pairIds.forEach((pid) => {
          const p = pairMap.get(pid);
          if (!p) return;
          const a = imageMap.get(p.itemAId);
          const b = imageMap.get(p.itemBId);
          if (a) out.push({ uid: `${pid}-a`, src: a.src, label: a.name });
          if (b) out.push({ uid: `${pid}-b`, src: b.src, label: b.name });
        });
      } else {
        activity.matchingConfig.itemIds.forEach((id) => {
          const img = imageMap.get(id);
          if (!img) return;
          out.push({ uid: `${id}-orig`, src: img.src, label: img.name });
          if (img.silhouetteSrc) {
            out.push({
              uid: `${id}-sil`,
              src: img.silhouetteSrc,
              label: `Silueta · ${img.name}`,
              badge: 'Silueta',
            });
          }
        });
      }
    } else if (activity.gameType === 'classification' && activity.classificationConfig) {
      if (activity.classificationConfig.classificationMode === 'attributes') {
        // Print both turquoise pattern tiles and orientation tiles!
        (['circulo', 'cuadrado', 'triangulo', 'ovalo'] as const).forEach((sh) => {
          (['liso', 'rayas'] as const).forEach((pat) => {
            out.push({
              uid: `pat-${sh}-${pat}`,
              src: makeTurquoisePatternShapeSvg(sh, pat),
              label: `${sh.charAt(0).toUpperCase() + sh.slice(1)} · ${pat}`,
            });
          });
        });
        (['flecha', 'casa'] as const).forEach((sh) => {
          (['arriba', 'derecha', 'abajo', 'izquierda'] as const).forEach((ori) => {
            out.push({
              uid: `ori-${sh}-${ori}`,
              src: makeAttributeShapeSvg(sh, sh === 'flecha' ? '#2A9D8F' : '#D98A1F', '#3A4656', ori),
              label: `${sh.charAt(0).toUpperCase() + sh.slice(1)} · ${ori}`,
            });
          });
        });
      } else {
        activity.classificationConfig.groups.forEach((g) => {
          if (g.imageId && imageMap.has(g.imageId)) {
            const sc = imageMap.get(g.imageId)!;
            out.push({
              uid: `grp-${g.id}`,
              src: sc.src,
              label: g.name,
              badge: 'Destino',
              isScenario: sc.kind === 'scenario',
            });
          }
        });
        const seen = new Set<string>();
        activity.classificationConfig.groups.forEach((g) => {
          g.itemIds.forEach((id) => {
            if (seen.has(id)) return;
            seen.add(id);
            const img = imageMap.get(id);
            if (img) out.push({ uid: `pc-${id}`, src: img.src, label: img.name });
          });
        });
      }
    } else if (activity.gameType === 'what-changed' && activity.whatChangedConfig) {
      activity.whatChangedConfig.itemIds.forEach((id) => {
        const img = imageMap.get(id);
        if (img) out.push({ uid: `wc-${id}`, src: img.src, label: img.name });
      });
    } else if (activity.gameType === 'sequence' && activity.sequenceConfig) {
      activity.sequenceConfig.itemIds.forEach((id) => {
        const img = imageMap.get(id);
        if (img) out.push({ uid: `seq-${id}`, src: img.src, label: img.name });
      });
    } else if (activity.gameType === 'intruder' && activity.intruderConfig) {
      activity.intruderConfig.groupItemIds.forEach((id) => {
        const img = imageMap.get(id);
        if (img) out.push({ uid: `intr-g-${id}`, src: img.src, label: img.name, badge: 'Grupo' });
      });
      const intruderIds =
        activity.intruderConfig.intruderItemIds && activity.intruderConfig.intruderItemIds.length > 0
          ? activity.intruderConfig.intruderItemIds
          : images
              .filter(
                (i) =>
                  i.kind === 'piece' &&
                  !activity.intruderConfig!.groupItemIds.includes(i.id) &&
                  i.collectionId !== activity.intruderConfig!.baseCollectionId
              )
              .slice(0, 4)
              .map((i) => i.id);
      intruderIds.forEach((id) => {
        const img = imageMap.get(id);
        if (img) out.push({ uid: `intr-x-${id}`, src: img.src, label: img.name, badge: 'Intruso' });
      });
    } else if (activity.gameType === 'dobble' && activity.dobbleConfig) {
      activity.dobbleConfig.itemIds.forEach((id) => {
        const img = imageMap.get(id);
        if (img) out.push({ uid: `dob-${id}`, src: img.src, label: img.name });
      });
    } else if (activity.gameType === 'pattern' && activity.patternConfig) {
      // 2 copies of each piece so children can physically build A-B-A-B / A-B-C patterns on a table!
      activity.patternConfig.itemIds.slice(0, 6).forEach((id) => {
        const img = imageMap.get(id);
        if (!img) return;
        out.push({ uid: `pat-${id}-1`, src: img.src, label: img.name });
        out.push({ uid: `pat-${id}-2`, src: img.src, label: img.name });
      });
    }

    return out;
  }, [activity, imageMap, pairMap]);

  const cols = density === 'large' ? 2 : density === 'medium' ? 3 : 4;
  const perPage = density === 'large' ? 6 : density === 'medium' ? 9 : 12;

  const pages = useMemo(() => {
    const chunks: PrintableCard[][] = [];
    for (let i = 0; i < cards.length; i += perPage) {
      chunks.push(cards.slice(i, i + perPage));
    }
    return chunks;
  }, [cards, perPage]);

  const meta = GAME_TYPE_META[activity.gameType];

  return (
    <div className="modal-backdrop print-modal-backdrop" role="dialog" aria-modal="true" aria-label="Imprimir tarjetas">
      <div className="modal-panel print-modal-panel" style={{ maxWidth: 960 }}>
        {/* Controls bar (hidden during actual window.print()!) */}
        <div className="no-print" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div>
              <span className={`chip ${meta.chipClass}`}>{meta.name}</span>
              <h2 style={{ margin: '6px 0 2px', fontFamily: 'var(--font-display)', fontSize: '1.45rem' }}>
                Láminas imprimibles: {activity.title}
              </h2>
              <p style={{ margin: 0, color: 'var(--ink-secondary)', fontSize: '0.92rem' }}>
                {cards.length} tarjetas preparadas en {pages.length + (includeBacks ? 1 : 0)}{' '}
                {pages.length + (includeBacks ? 1 : 0) === 1 ? 'hoja A4' : 'hojas A4'} listas para
                imprimir, recortar y plastificar.
              </p>
            </div>
            <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar">
              <X size={20} />
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 14,
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 14,
              borderRadius: 18,
              background: 'var(--bg-card-subtle)',
              border: '2px solid var(--border-card)',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
              <div className="segmented" style={{ minWidth: 260 }}>
                <button
                  type="button"
                  className={density === 'large' ? 'active' : ''}
                  onClick={() => setDensity('large')}
                >
                  Grandes (6/hoja)
                </button>
                <button
                  type="button"
                  className={density === 'medium' ? 'active' : ''}
                  onClick={() => setDensity('medium')}
                >
                  Medianas (9/hoja)
                </button>
                <button
                  type="button"
                  className={density === 'small' ? 'active' : ''}
                  onClick={() => setDensity('small')}
                >
                  Pequeñas (12/hoja)
                </button>
              </div>

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showNames}
                  onChange={(e) => setShowNames(e.target.checked)}
                />
                Mostrar nombres
              </label>

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showCutGuides}
                  onChange={(e) => setShowCutGuides(e.target.checked)}
                />
                <Scissors size={15} /> Guías de corte
              </label>

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={includeBacks}
                  onChange={(e) => setIncludeBacks(e.target.checked)}
                />
                Hoja de reversos
              </label>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => window.print()}
              data-testid="btn-trigger-print"
            >
              <Printer size={20} /> Imprimir / Guardar PDF
            </button>
          </div>
        </div>

        {/* Printable A4 Sheets */}
        <div className="print-sheets-container" data-testid="print-sheets-container">
          {pages.map((pageCards, pageIdx) => (
            <section key={pageIdx} className="print-sheet-page">
              <header className="print-sheet-header">
                <strong>Mira y Recuerda · {activity.title}</strong>
                <span>
                  Hoja {pageIdx + 1} de {pages.length + (includeBacks ? 1 : 0)}
                </span>
              </header>

              <div
                className={`print-card-grid density-${density}`}
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
              >
                {pageCards.map((c) => (
                  <div
                    key={c.uid}
                    className={`print-card-item ${showCutGuides ? 'with-guides' : ''}`}
                  >
                    {c.badge && <span className="print-card-badge">{c.badge}</span>}
                    <div className="print-card-img-wrap">
                      <img
                        src={c.src}
                        alt={c.label}
                        style={{ objectFit: c.isScenario ? 'cover' : 'contain' }}
                      />
                    </div>
                    {showNames && <div className="print-card-name">{c.label}</div>}
                  </div>
                ))}
              </div>
            </section>
          ))}

          {includeBacks && (
            <section className="print-sheet-page">
              <header className="print-sheet-header">
                <strong>Mira y Recuerda · Reversos para doble cara</strong>
                <span>
                  Hoja {pages.length + 1} de {pages.length + 1}
                </span>
              </header>

              <div
                className={`print-card-grid density-${density}`}
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: perPage }, (_, i) => (
                  <div
                    key={`back-${i}`}
                    className={`print-card-item print-card-back ${showCutGuides ? 'with-guides' : ''}`}
                  >
                    <div className="memory-back-pattern" style={{ width: '100%', height: '100%', minHeight: 110 }}>
                      <CardBackEmblem size={44} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
