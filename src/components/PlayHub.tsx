import { useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
  Lock,
  Monitor,
  Play,
  Printer,
  SlidersHorizontal,
  Tablet,
  TrendingUp,
  Zap,
} from 'lucide-react';
import type {
  Activity,
  CollectionItem,
  DifficultyLevel,
  DifficultyProgression,
  ImageItem,
  ImagePair,
  LaunchSession,
  PlayMode,
} from '../types';
import {
  buildThematicGamesForCollections,
  COLLECTION_BASE_IDS,
  DIFFICULTY_DESCRIPTIONS,
  DIFFICULTY_LABELS,
  DIFFICULTY_ORDER,
} from '../data/catalog';
import { makeAttributeShapeSvg } from '../data/specialArt';
import { isActivityPlayable } from '../lib/activityValidation';
import { GamePictogram, GAME_TYPE_META } from './GameIcons';
import { PrintableSheetModal } from './PrintableSheetModal';
import { ThemePickerModal } from './ThemePickerModal';

interface PlayHubProps {
  activities: Activity[];
  collections: CollectionItem[];
  images: ImageItem[];
  pairs: ImagePair[];
  mode: PlayMode;
  difficulty: DifficultyLevel;
  progression: DifficultyProgression;
  selectedThemeIds: string[]; // ['all'] or 1+ collection IDs
  onChangeMode: (m: PlayMode) => void;
  onChangeDifficulty: (d: DifficultyLevel) => void;
  onChangeProgression: (p: DifficultyProgression) => void;
  onChangeThemes: (themeIds: string[]) => void;
  onLaunch: (session: LaunchSession) => void;
  onQuickStart: () => void;
}

export function PlayHub({
  activities,
  collections,
  images,
  pairs,
  mode,
  difficulty,
  progression,
  selectedThemeIds,
  onChangeMode,
  onChangeDifficulty,
  onChangeProgression,
  onChangeThemes,
  onLaunch,
  onQuickStart,
}: PlayHubProps) {
  const [printingActivity, setPrintingActivity] = useState<Activity | null>(null);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [viewCustomTab, setViewCustomTab] = useState(false);
  const [customPage, setCustomPage] = useState(0);
  // Inline variant micro-toggles inside Correspondencias & Clasificación cards so all 8 fit in 4x2!
  const [matchSubMode, setMatchSubMode] = useState<'silhouette' | 'related'>('silhouette');
  const [clsSubMode, setClsSubMode] = useState<'thematic' | 'attributes'>('attributes');

  const stripRef = useRef<HTMLDivElement | null>(null);

  const imageMap = useMemo(() => new Map(images.map((i) => [i.id, i])), [images]);
  const pairMap = useMemo(() => new Map(pairs.map((p) => [p.id, p])), [pairs]);

  const activeCollections = useMemo(() => {
    return collections.filter((col) => {
      const base = COLLECTION_BASE_IDS[col.id];
      if (base && base.some((id) => imageMap.has(id))) return true;
      return images.filter((i) => i.collectionId === col.id && i.kind === 'piece').length >= 2;
    });
  }, [collections, imageMap, images]);

  const isAllThemes =
    selectedThemeIds.includes('all') ||
    selectedThemeIds.length === 0 ||
    (activeCollections.length > 0 && selectedThemeIds.length >= activeCollections.length);

  const selectedCollections = useMemo(() => {
    if (isAllThemes) return activeCollections;
    const valid = activeCollections.filter((c) => selectedThemeIds.includes(c.id));
    return valid.length > 0 ? valid : activeCollections.slice(0, 1);
  }, [activeCollections, isAllThemes, selectedThemeIds]);

  const handleToggleThemePill = (colId: string) => {
    setViewCustomTab(false);
    // If "Todas" is active, clicking a single theme switches cleanly to JUST that 1 theme (1 click!)
    if (isAllThemes) {
      onChangeThemes([colId]);
      return;
    }
    const current = selectedCollections.map((c) => c.id);
    if (current.includes(colId)) {
      if (current.length <= 1) return; // Keep at least 1 theme active
      onChangeThemes(current.filter((id) => id !== colId));
    } else {
      const next = [...current, colId];
      if (next.length >= activeCollections.length) {
        onChangeThemes(['all']);
      } else {
        onChangeThemes(next);
      }
    }
  };

  const allThematicGames = useMemo(() => {
    if (selectedCollections.length === 0) return [];
    return buildThematicGamesForCollections(selectedCollections, isAllThemes, images, pairs).filter(
      (a) => isActivityPlayable(a, images, pairs)
    );
  }, [selectedCollections, isAllThemes, images, pairs]);

  // Build the exact 8 cards (1 per game type!) with optional sub-variant toggles for Clasificación & Correspondencias
  const eightGameCards = useMemo(() => {
    const byType = (gt: Activity['gameType']) => allThematicGames.filter((a) => a.gameType === gt);

    const mem = byType('memory')[0];
    const wc = byType('what-changed')[0];
    const seq = byType('sequence')[0];

    const matchList = byType('matching');
    const silMatch = matchList.find((a) => a.matchingConfig?.variant !== 'related') || matchList[0];
    const relMatch = matchList.find((a) => a.matchingConfig?.variant === 'related');
    const activeMatch = relMatch && matchSubMode === 'related' ? relMatch : silMatch;

    const clsList = byType('classification');
    const attrCls = clsList.find((a) => a.classificationConfig?.classificationMode === 'attributes') || clsList[0];
    const themeCls =
      clsList.find((a) => a.classificationConfig?.classificationMode !== 'attributes') ||
      activities.find((a) => a.id === 'act-clasifica-entornos');
    const activeCls = themeCls && clsSubMode === 'thematic' ? themeCls : attrCls;

    const intr = byType('intruder')[0];
    const dob = byType('dobble')[0];
    const pat = byType('pattern')[0];

    const themeClsLabel =
      !isAllThemes && selectedCollections.length === 1 && selectedCollections[0].id === 'transportes'
        ? 'Tierra/Agua/Aire'
        : !isAllThemes && selectedCollections.length >= 2 && selectedCollections.length <= 4
          ? 'Por temática'
          : 'Paisajes';

    return [
      mem && { act: mem, hasSubToggle: false as const },
      wc && { act: wc, hasSubToggle: false as const },
      seq && { act: seq, hasSubToggle: false as const },
      activeMatch && {
        act: activeMatch,
        hasSubToggle: Boolean(relMatch && silMatch),
        toggleKind: 'matching' as const,
        relLabel: relMatch?.title === 'Parejas relacionadas' ? 'Parejas' : relMatch?.title || 'Parejas',
      },
      activeCls && {
        act: activeCls,
        hasSubToggle: Boolean(themeCls && attrCls),
        toggleKind: 'classification' as const,
        themeClsLabel,
      },
      intr && { act: intr, hasSubToggle: false as const },
      dob && { act: dob, hasSubToggle: false as const },
      pat && { act: pat, hasSubToggle: false as const },
    ].filter(Boolean) as {
      act: Activity;
      hasSubToggle: boolean;
      toggleKind?: 'matching' | 'classification';
      relLabel?: string;
      themeClsLabel?: string;
    }[];
  }, [allThematicGames, matchSubMode, clsSubMode, activities, selectedCollections, isAllThemes]);

  const customActivities = useMemo(
    () => activities.filter((a) => !a.builtIn && isActivityPlayable(a, images, pairs)),
    [activities, images, pairs]
  );

  const customTotalPages = Math.max(1, Math.ceil(customActivities.length / 8));
  const pagedCustom = customActivities.slice(customPage * 8, customPage * 8 + 8);

  const getCollectionIconImg = (col: CollectionItem): ImageItem | undefined => {
    const base = COLLECTION_BASE_IDS[col.id];
    if (base && base[0] && imageMap.has(base[0])) return imageMap.get(base[0]);
    return images.find((i) => i.collectionId === col.id && i.kind === 'piece');
  };

  const getThumbs = (act: Activity): { id: string; src: string; name: string }[] => {
    if (act.classificationConfig?.classificationMode === 'attributes') {
      return [
        { id: 'sh1', name: 'Círculo', src: makeAttributeShapeSvg('circulo', '#2A9D8F', '#185A53') },
        { id: 'sh2', name: 'Triángulo', src: makeAttributeShapeSvg('triangulo', '#DD6B4D', '#7D3521') },
        { id: 'sh3', name: 'Flecha', src: makeAttributeShapeSvg('flecha', '#2A9D8F', '#185A53', 'derecha') },
      ];
    }
    const ids: string[] = [];
    if (act.memoryConfig) {
      if (act.memoryConfig.variant === 'identical') ids.push(...(act.memoryConfig.initialItemIds || act.memoryConfig.itemIds));
      else act.memoryConfig.pairIds.forEach((pid) => { const p = pairMap.get(pid); if (p) ids.push(p.itemAId, p.itemBId); });
    }
    if (act.classificationConfig) {
      act.classificationConfig.groups.forEach((g) => { if (g.imageId) ids.push(g.imageId); });
      ids.push(...(act.classificationConfig.initialItemIds || []));
    }
    if (act.matchingConfig) {
      if (act.matchingConfig.variant !== 'related') ids.push(...(act.matchingConfig.initialItemIds || act.matchingConfig.itemIds));
      else act.matchingConfig.pairIds.forEach((pid) => { const p = pairMap.get(pid); if (p) ids.push(p.itemAId, p.itemBId); });
    }
    if (act.whatChangedConfig) ids.push(...(act.whatChangedConfig.initialItemIds || act.whatChangedConfig.itemIds));
    if (act.sequenceConfig) ids.push(...(act.sequenceConfig.initialItemIds || act.sequenceConfig.itemIds));
    if (act.intruderConfig) ids.push(...act.intruderConfig.groupItemIds);
    if (act.dobbleConfig) ids.push(...act.dobbleConfig.itemIds);
    if (act.patternConfig) ids.push(...act.patternConfig.itemIds);
    return Array.from(new Set(ids))
      .map((id) => imageMap.get(id))
      .filter((i): i is ImageItem => Boolean(i))
      .slice(0, 3)
      .map((i) => ({ id: i.id, src: i.src, name: i.name }));
  };

  const scrollThemes = (delta: number) => {
    stripRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <div className="page-container" style={{ gap: 10 }}>
      {/* ROW 1: Compact All-in-One Controls + Quick Start Bar */}
      <section className="board-card hub-toolbar" aria-label="Ajustes de partida">
        <div className="segmented" style={{ flex: '0 0 auto' }} role="group" aria-label="Modo">
          <button
            type="button"
            className={mode === 'individual' ? 'active' : ''}
            onClick={() => onChangeMode('individual')}
            data-testid="mode-individual"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Tablet size={15} /> Individual
            </span>
          </button>
          <button
            type="button"
            className={mode === 'asamblea' ? 'active' : ''}
            onClick={() => onChangeMode('asamblea')}
            data-testid="mode-asamblea"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Monitor size={15} /> Asamblea / PDI
            </span>
          </button>
        </div>

        <div className="segmented" style={{ flex: '1 1 auto', maxWidth: 420 }} role="group" aria-label="Nivel">
          {DIFFICULTY_ORDER.map((lvl) => (
            <button
              key={lvl}
              type="button"
              className={difficulty === lvl ? 'active' : ''}
              onClick={() => onChangeDifficulty(lvl)}
              data-testid={`diff-${lvl}`}
              title={DIFFICULTY_DESCRIPTIONS[lvl]}
            >
              {DIFFICULTY_LABELS[lvl]}
            </button>
          ))}
        </div>

        <div className="segmented" style={{ flex: '0 0 auto' }} role="group" aria-label="Progresión">
          <button
            type="button"
            className={progression === 'progressive' ? 'active' : ''}
            onClick={() => onChangeProgression('progressive')}
            data-testid="prog-progressive"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <TrendingUp size={15} /> Progresiva
            </span>
          </button>
          <button
            type="button"
            className={progression === 'fixed' ? 'active' : ''}
            onClick={() => onChangeProgression('fixed')}
            data-testid="prog-fixed"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Lock size={15} /> Fijo
            </span>
          </button>
        </div>

        <button
          type="button"
          className="btn btn-coral btn-sm"
          style={{ whiteSpace: 'nowrap', padding: '10px 14px' }}
          onClick={onQuickStart}
          data-testid="hub-quick-start"
        >
          <Zap size={16} /> Rápido (2 parejas)
        </button>
      </section>

      {/* ROW 2: Single-Row Multi-Theme Picker Bar (1, several, or ALL themes!) */}
      <section className="board-card hub-theme-bar" aria-label="Elegir temáticas">
        <button
          type="button"
          data-testid="theme-btn-all"
          className={`theme-pill-card ${!viewCustomTab && isAllThemes ? 'active' : ''}`}
          style={{ padding: '5px 12px', flexShrink: 0 }}
          onClick={() => {
            setViewCustomTab(false);
            onChangeThemes(['all']);
          }}
          title="Usar todas las temáticas a la vez"
        >
          <Layers size={16} color={!viewCustomTab && isAllThemes ? 'var(--accent-teal)' : 'var(--ink-secondary)'} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.86rem', whiteSpace: 'nowrap' }}>
            Todas ({activeCollections.length})
          </span>
        </button>

        <button
          type="button"
          className="btn-icon"
          style={{ width: 32, height: 32, flexShrink: 0 }}
          onClick={() => scrollThemes(-260)}
          aria-label="Ver temáticas anteriores"
        >
          <ChevronLeft size={17} />
        </button>

        <div ref={stripRef} className="hub-theme-strip" role="listbox" aria-multiselectable="true" aria-label="Temáticas">
          {activeCollections.map((col) => {
            const thumb = getCollectionIconImg(col);
            const active = !viewCustomTab && !isAllThemes && selectedCollections.some((c) => c.id === col.id);
            return (
              <button
                key={col.id}
                type="button"
                role="option"
                aria-selected={active || (!viewCustomTab && isAllThemes)}
                data-testid={`theme-btn-${col.id}`}
                className={`theme-pill-card ${active ? 'active' : ''}`}
                style={{ padding: '4px 11px 4px 5px' }}
                onClick={() => handleToggleThemePill(col.id)}
                title={
                  isAllThemes
                    ? `Elegir solo ${col.name}`
                    : active
                      ? `Quitar ${col.name}`
                      : `Añadir ${col.name} a la selección`
                }
              >
                <div className="theme-pill-thumb" style={{ width: 32, height: 32, borderRadius: 8 }}>
                  {thumb ? <img src={thumb.src} alt="" /> : <span>{col.name[0]}</span>}
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                  {col.name}
                </span>
                {active && (
                  <span className="theme-pill-check" aria-hidden="true">
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}

          {customActivities.length > 0 && (
            <button
              type="button"
              className={`theme-pill-card ${viewCustomTab ? 'active' : ''}`}
              style={{ padding: '5px 12px' }}
              onClick={() => {
                setViewCustomTab(true);
                setCustomPage(0);
              }}
            >
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                Mis propias ({customActivities.length})
              </span>
            </button>
          )}
        </div>

        <button
          type="button"
          className="btn-icon"
          style={{ width: 32, height: 32, flexShrink: 0 }}
          onClick={() => scrollThemes(260)}
          aria-label="Ver más temáticas"
        >
          <ChevronRight size={17} />
        </button>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ padding: '6px 11px', fontSize: '0.8rem', whiteSpace: 'nowrap', flexShrink: 0 }}
          onClick={() => setShowThemeModal(true)}
          data-testid="hub-open-theme-modal"
          title="Abrir selector completo de temáticas"
        >
          <SlidersHorizontal size={14} />{' '}
          {isAllThemes
            ? 'Elegir…'
            : selectedCollections.length === 1
              ? 'Combinar…'
              : `${selectedCollections.length} temas`}
        </button>
      </section>

      {/* ROW 3: Exact 4x2 Zero-Scroll Grid of the 8 Games (or paginated custom activities) */}
      {!viewCustomTab ? (
        <div className="hub-eight-grid">
          {eightGameCards.map((entry) => {
            const { act } = entry;
            const meta = GAME_TYPE_META[act.gameType];
            const thumbs = getThumbs(act);

            return (
              <article key={act.gameType} className="board-card hub-game-card" data-testid={`play-card-${act.id}`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <GamePictogram type={act.gameType} size={32} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '0.98rem', lineHeight: 1.12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {meta.name}
                      </h3>
                      <div style={{ fontSize: '0.73rem', color: 'var(--ink-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {act.title}
                      </div>
                    </div>
                  </div>

                  {entry.hasSubToggle && entry.toggleKind === 'matching' && (
                    <div className="segmented" style={{ padding: 2, borderRadius: 9 }}>
                      <button
                        type="button"
                        style={{ padding: '3px 6px', fontSize: '0.7rem' }}
                        className={matchSubMode === 'silhouette' ? 'active' : ''}
                        onClick={() => setMatchSubMode('silhouette')}
                      >
                        Silueta
                      </button>
                      <button
                        type="button"
                        style={{ padding: '3px 6px', fontSize: '0.7rem' }}
                        className={matchSubMode === 'related' ? 'active' : ''}
                        onClick={() => setMatchSubMode('related')}
                      >
                        {entry.relLabel}
                      </button>
                    </div>
                  )}

                  {entry.hasSubToggle && entry.toggleKind === 'classification' && (
                    <div className="segmented" style={{ padding: 2, borderRadius: 9 }}>
                      <button
                        type="button"
                        style={{ padding: '3px 6px', fontSize: '0.7rem' }}
                        className={clsSubMode === 'attributes' ? 'active' : ''}
                        onClick={() => setClsSubMode('attributes')}
                        data-testid="cls-toggle-attributes"
                      >
                        Atributos
                      </button>
                      <button
                        type="button"
                        style={{ padding: '3px 6px', fontSize: '0.7rem' }}
                        className={clsSubMode === 'thematic' ? 'active' : ''}
                        onClick={() => setClsSubMode('thematic')}
                        data-testid="cls-toggle-thematic"
                      >
                        {entry.themeClsLabel}
                      </button>
                    </div>
                  )}
                </div>

                <div className="hub-mini-thumbs">
                  {thumbs.map((img) => (
                    <div key={img.id} className="hub-mini-thumb" title={img.name}>
                      <img src={img.src} alt={img.name} />
                    </div>
                  ))}
                  <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--ink-muted)', fontWeight: 700, textAlign: 'right', lineHeight: 1.15 }}>
                    {DIFFICULTY_LABELS[difficulty]}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1, padding: '8px 10px', fontSize: '0.92rem' }}
                    data-testid={`launch-${act.id}`}
                    onClick={() =>
                      onLaunch({
                        activity: act,
                        mode,
                        difficulty,
                        progression,
                      })
                    }
                  >
                    <Play size={15} fill="currentColor" /> Jugar
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    style={{ width: 35, height: 35, borderRadius: 11 }}
                    title="Imprimir tarjetas (PDF)"
                    aria-label={`Imprimir tarjetas de ${act.title}`}
                    data-testid={`hub-print-${act.id}`}
                    onClick={() => setPrintingActivity(act)}
                  >
                    <Printer size={16} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <>
          <div className="hub-eight-grid">
            {pagedCustom.map((act) => {
              const meta = GAME_TYPE_META[act.gameType];
              const thumbs = getThumbs(act);
              return (
                <article key={act.id} className="board-card hub-game-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <GamePictogram type={act.gameType} size={34} />
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {act.title}
                      </h3>
                      <span className={`chip ${meta.chipClass}`} style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                        {meta.name}
                      </span>
                    </div>
                  </div>
                  <div className="hub-mini-thumbs">
                    {thumbs.map((img) => (
                      <div key={img.id} className="hub-mini-thumb">
                        <img src={img.src} alt={img.name} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                      data-testid={`launch-${act.id}`}
                      onClick={() => onLaunch({ activity: act, mode, difficulty, progression })}
                    >
                      <Play size={16} fill="currentColor" /> Jugar
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      style={{ width: 38, height: 38 }}
                      onClick={() => setPrintingActivity(act)}
                      aria-label={`Imprimir ${act.title}`}
                    >
                      <Printer size={17} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          {customTotalPages > 1 && (
            <div className="pager-bar">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={customPage === 0}
                onClick={() => setCustomPage((p) => p - 1)}
              >
                Anterior
              </button>
              <span className="chip">
                Página {customPage + 1} de {customTotalPages}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={customPage >= customTotalPages - 1}
                onClick={() => setCustomPage((p) => p + 1)}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {printingActivity && (
        <PrintableSheetModal
          activity={printingActivity}
          images={images}
          pairs={pairs}
          onClose={() => setPrintingActivity(null)}
        />
      )}

      {showThemeModal && (
        <ThemePickerModal
          collections={activeCollections}
          images={images}
          selectedThemeIds={selectedThemeIds}
          onApply={(ids) => {
            setViewCustomTab(false);
            onChangeThemes(ids);
          }}
          onClose={() => setShowThemeModal(false)}
        />
      )}
    </div>
  );
}
