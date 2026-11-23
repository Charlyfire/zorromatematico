import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowUpFromLine, FolderHeart, Images, Play } from 'lucide-react';
import type {
  Activity,
  AppDataState,
  CollectionItem,
  DifficultyLevel,
  DifficultyProgression,
  GameType,
  ImageItem,
  ImagePair,
  LaunchSession,
  PlayMode,
  UserPrefs,
} from './types';
import {
  buildThematicGamesForCollections,
  BUILTIN_ACTIVITIES,
  BUILTIN_COLLECTIONS,
  BUILTIN_IMAGES,
  BUILTIN_PAIRS,
  COLLECTION_BASE_IDS,
  DEFAULT_PREFS,
  formatSelectedThemesLabel,
  MASCOT,
} from './data/catalog';
import {
  deleteActivity,
  deleteImage,
  deletePair,
  loadAppState,
  saveActivity,
  saveCollection,
  saveImage,
  savePair,
  savePrefs,
} from './lib/db';
import { isActivityPlayable } from './lib/activityValidation';
import { HomeScreen } from './components/HomeScreen';
import { PlayHub } from './components/PlayHub';
import { ImageBank } from './components/ImageBank';
import { ActivityManager } from './components/ActivityManager';
import { GameThemeContext } from './components/GameThemeContext';
import { ThemePickerModal } from './components/ThemePickerModal';
import { MemoryGame } from './games/MemoryGame';
import { ClassificationGame } from './games/ClassificationGame';
import { MatchingGame } from './games/MatchingGame';
import { WhatChangedGame } from './games/WhatChangedGame';
import { SequenceGame } from './games/SequenceGame';
import { IntruderGame } from './games/IntruderGame';
import { DobbleGame } from './games/DobbleGame';
import { PatternGame } from './games/PatternGame';

type MainTab = 'home' | 'play' | 'images' | 'games';

const INITIAL_STATE: AppDataState = {
  collections: BUILTIN_COLLECTIONS,
  images: BUILTIN_IMAGES,
  pairs: BUILTIN_PAIRS,
  activities: BUILTIN_ACTIVITIES,
  prefs: DEFAULT_PREFS,
};

export function App() {
  const [state, setState] = useState<AppDataState>(INITIAL_STATE);
  const [tab, setTab] = useState<MainTab>('home');
  const [session, setSession] = useState<LaunchSession | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [showInGameThemeModal, setShowInGameThemeModal] = useState(false);

  const selectedThemeIds = useMemo<string[]>(() => {
    if (state.prefs.lastThemeIds && state.prefs.lastThemeIds.length > 0) {
      return state.prefs.lastThemeIds;
    }
    if (state.prefs.lastThemeId) return [state.prefs.lastThemeId];
    return ['transportes'];
  }, [state.prefs.lastThemeIds, state.prefs.lastThemeId]);

  const activeCollections = useMemo(() => {
    const imgSet = new Set(state.images.map((i) => i.id));
    return state.collections.filter((col) => {
      const base = COLLECTION_BASE_IDS[col.id];
      if (base && base.some((id) => imgSet.has(id))) return true;
      return state.images.filter((i) => i.collectionId === col.id && i.kind === 'piece').length >= 2;
    });
  }, [state.collections, state.images]);

  const isAllThemes =
    selectedThemeIds.includes('all') ||
    selectedThemeIds.length === 0 ||
    (activeCollections.length > 0 && selectedThemeIds.length >= activeCollections.length);

  const resolvedSelectedCollections = useMemo(() => {
    if (isAllThemes) return activeCollections;
    const matched = activeCollections.filter((c) => selectedThemeIds.includes(c.id));
    return matched.length > 0 ? matched : activeCollections.slice(0, 1);
  }, [activeCollections, isAllThemes, selectedThemeIds]);

  const activeThemesLabel = useMemo(
    () => formatSelectedThemesLabel(resolvedSelectedCollections, isAllThemes),
    [resolvedSelectedCollections, isAllThemes]
  );

  const pdiSafeBottom = state.prefs.pdiSafeBottom ?? true;

  useEffect(() => {
    document.documentElement.classList.toggle('pdi-safe-bottom', pdiSafeBottom);
  }, [pdiSafeBottom]);

  const togglePdiSafeBottom = () => {
    updatePrefs({ pdiSafeBottom: !pdiSafeBottom });
  };

  useEffect(() => {
    let active = true;
    loadAppState().then((loaded) => {
      if (active) setState(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  const updatePrefs = (patch: Partial<UserPrefs>) => {
    setState((prev) => {
      const nextPrefs = { ...prev.prefs, ...patch };
      savePrefs(nextPrefs).catch(() => {});
      return { ...prev, prefs: nextPrefs };
    });
  };

  const handleAddImage = async (img: ImageItem) => {
    await saveImage(img);
    setState((prev) => ({
      ...prev,
      images: [...prev.images.filter((i) => i.id !== img.id), img],
    }));
  };

  const handleUpdateImage = async (img: ImageItem) => {
    await saveImage(img);
    setState((prev) => ({
      ...prev,
      images: prev.images.map((i) => (i.id === img.id ? img : i)),
    }));
  };

  const handleDeleteImage = async (id: string) => {
    await deleteImage(id);
    setState((prev) => ({
      ...prev,
      images: prev.images.filter((i) => i.id !== id),
    }));
  };

  const handleAddCollection = async (col: CollectionItem) => {
    await saveCollection(col);
    setState((prev) => ({
      ...prev,
      collections: [...prev.collections.filter((c) => c.id !== col.id), col].sort(
        (a, b) => a.order - b.order
      ),
    }));
  };

  const handleAddPair = async (pair: ImagePair) => {
    await savePair(pair);
    setState((prev) => ({
      ...prev,
      pairs: [...prev.pairs.filter((p) => p.id !== pair.id), pair],
    }));
  };

  const handleDeletePair = async (id: string) => {
    await deletePair(id);
    setState((prev) => ({
      ...prev,
      pairs: prev.pairs.filter((p) => p.id !== id),
    }));
  };

  const handleSaveActivity = async (act: Activity) => {
    await saveActivity(act);
    setState((prev) => {
      const exists = prev.activities.some((a) => a.id === act.id);
      const nextActs = exists
        ? prev.activities.map((a) => (a.id === act.id ? act : a))
        : [...prev.activities, act];
      return { ...prev, activities: nextActs };
    });
  };

  const handleDeleteActivity = async (id: string) => {
    await deleteActivity(id);
    setState((prev) => ({
      ...prev,
      activities: prev.activities.filter((a) => a.id !== id),
    }));
  };

  const quickStartActivity = useMemo(
    () => state.activities.find((a) => a.id === 'act-transportes-memory') || state.activities[0],
    [state.activities]
  );

  const handleQuickStart = () => {
    if (!quickStartActivity) return;
    setSession({
      activity: quickStartActivity,
      mode: state.prefs.lastMode,
      difficulty: 'inicial',
      progression: 'progressive',
    });
  };

  const markDemoSeen = (gt: GameType) => {
    updatePrefs({
      seenDemos: { ...state.prefs.seenDemos, [gt]: true },
    });
  };

  const toggleSound = () => {
    const next = !(state.prefs.soundEnabled || state.prefs.voiceEnabled);
    updatePrefs({ soundEnabled: next, voiceEnabled: next });
  };

  const handleApplyInGameThemes = (nextIds: string[]) => {
    updatePrefs({
      lastThemeIds: nextIds,
      lastThemeId: nextIds[0] === 'all' ? 'all' : nextIds[0],
    });
    if (!session) return;
    const nextIsAll =
      nextIds.includes('all') ||
      nextIds.length === 0 ||
      nextIds.length >= activeCollections.length;
    const nextCols = nextIsAll
      ? activeCollections
      : activeCollections.filter((c) => nextIds.includes(c.id));
    if (nextCols.length === 0) return;

    const rebuilt = buildThematicGamesForCollections(nextCols, nextIsAll, state.images, state.pairs);
    const sameType = rebuilt.filter((a) => a.gameType === session.activity.gameType);
    if (sameType.length === 0) return;

    let replacement = sameType[0];
    if (session.activity.gameType === 'matching') {
      const wantRelated = session.activity.matchingConfig?.variant === 'related';
      replacement =
        sameType.find((a) => (a.matchingConfig?.variant === 'related') === wantRelated) ||
        sameType[0];
    } else if (session.activity.gameType === 'classification') {
      const wantAttr = session.activity.classificationConfig?.classificationMode === 'attributes';
      replacement =
        sameType.find(
          (a) => (a.classificationConfig?.classificationMode === 'attributes') === wantAttr
        ) || sameType[0];
    }

    setSession((prev) => (prev ? { ...prev, activity: replacement } : null));
    setSessionKey((k) => k + 1);
  };

  // ACTIVE GAME VIEW (maximizes playable area)
  if (session) {
    const commonProps = {
      activity: session.activity,
      images: state.images,
      mode: session.mode,
      initialDifficulty: session.difficulty,
      progression: session.progression,
      soundEnabled: state.prefs.soundEnabled,
      voiceEnabled: state.prefs.voiceEnabled,
      showInitialDemo: !state.prefs.seenDemos[session.activity.gameType],
      onDemoSeen: () => markDemoSeen(session.activity.gameType),
      onToggleSound: toggleSound,
      onExit: () => {
        setShowInGameThemeModal(false);
        setSession(null);
      },
    };

    const resolvedColIds = resolvedSelectedCollections.map((c) => c.id);
    const renderKey = `${session.activity.id}-${sessionKey}`;

    let gameElement: ReactNode;
    switch (session.activity.gameType) {
      case 'memory':
        gameElement = (
          <MemoryGame
            key={renderKey}
            {...commonProps}
            pairs={state.pairs}
            initialPairsCount={session.memoryPairsCount}
          />
        );
        break;
      case 'classification':
        gameElement = (
          <ClassificationGame
            key={renderKey}
            {...commonProps}
            themeId={resolvedColIds[0] || 'transportes'}
            themeIds={resolvedColIds}
          />
        );
        break;
      case 'matching':
        gameElement = <MatchingGame key={renderKey} {...commonProps} pairs={state.pairs} />;
        break;
      case 'what-changed':
        gameElement = <WhatChangedGame key={renderKey} {...commonProps} pairs={state.pairs} />;
        break;
      case 'sequence':
        gameElement = <SequenceGame key={renderKey} {...commonProps} />;
        break;
      case 'intruder':
        gameElement = <IntruderGame key={renderKey} {...commonProps} collections={state.collections} />;
        break;
      case 'dobble':
        gameElement = <DobbleGame key={renderKey} {...commonProps} />;
        break;
      case 'pattern':
        gameElement = <PatternGame key={renderKey} {...commonProps} />;
        break;
    }

    const themeContextValue = {
      label: session.activity.builtIn ? activeThemesLabel : undefined,
      onOpenPicker: session.activity.builtIn
        ? () => setShowInGameThemeModal(true)
        : undefined,
      pdiSafeBottom,
      onTogglePdiSafeBottom: togglePdiSafeBottom,
    };

    return (
      <GameThemeContext.Provider value={themeContextValue}>
        {gameElement}
        {showInGameThemeModal && (
          <ThemePickerModal
            collections={activeCollections}
            images={state.images}
            selectedThemeIds={selectedThemeIds}
            onApply={handleApplyInGameThemes}
            onClose={() => setShowInGameThemeModal(false)}
          />
        )}
      </GameThemeContext.Provider>
    );
  }

  // HOME SCREEN
  if (tab === 'home') {
    const playableCount = state.activities.filter((a) =>
      isActivityPlayable(a, state.images, state.pairs)
    ).length;
    const customImgs = state.images.filter((i) => !i.builtIn).length;
    const builtInImgs = state.images.filter((i) => i.builtIn).length;
    const previewImages = ['tr-globo', 'esp-cohete', 'grj-vaca', 'pol-pinguino']
      .map((id) => state.images.find((i) => i.id === id))
      .filter((i): i is ImageItem => Boolean(i));

    return (
      <div className="app-root">
        <HomeScreen
          playableActivitiesCount={playableCount}
          customImagesCount={customImgs}
          builtInImagesCount={builtInImgs}
          quickStartActivity={quickStartActivity}
          previewImages={previewImages}
          onNavigate={(nextTab) => setTab(nextTab)}
          onQuickStart={handleQuickStart}
        />
      </div>
    );
  }

  // INNER APP VIEWS (Jugar / Mis imágenes / Mis juegos)
  return (
    <div className="app-root">
      <nav className="top-nav" aria-label="Navegación principal">
        <button
          type="button"
          className="top-nav-brand"
          onClick={() => setTab('home')}
          data-testid="nav-brand-home"
        >
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'var(--accent-amber-soft)',
              border: '2px solid var(--border-card)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 2,
            }}
          >
            <img src={MASCOT.saludo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </span>
          Mira y Recuerda
        </button>

        <div className="top-nav-tabs">
          <button
            type="button"
            className={`nav-pill ${tab === 'play' ? 'active' : ''}`}
            onClick={() => setTab('play')}
            data-testid="nav-play"
          >
            <Play size={17} /> Jugar
          </button>
          <button
            type="button"
            className={`nav-pill ${tab === 'images' ? 'active' : ''}`}
            onClick={() => setTab('images')}
            data-testid="nav-images"
          >
            <Images size={17} /> Mis imágenes
          </button>
          <button
            type="button"
            className={`nav-pill ${tab === 'games' ? 'active' : ''}`}
            onClick={() => setTab('games')}
            data-testid="nav-games"
          >
            <FolderHeart size={17} /> Mis juegos
          </button>
          <button
            type="button"
            className={`nav-pill ${pdiSafeBottom ? 'active' : ''}`}
            onClick={togglePdiSafeBottom}
            data-testid="nav-pdi-safe-toggle"
            aria-pressed={pdiSafeBottom}
            title={
              pdiSafeBottom
                ? 'Zona segura PDI activada: deja espacio libre abajo para la barra de la pizarra'
                : 'Activar margen inferior para que la barra de la PDI no tape botones'
            }
            style={{ marginLeft: 6, fontSize: '0.84rem', padding: '6px 12px' }}
          >
            <ArrowUpFromLine size={15} /> Margen PDI
          </button>
        </div>
      </nav>

      {tab === 'play' && (
        <PlayHub
          activities={state.activities}
          collections={state.collections}
          images={state.images}
          pairs={state.pairs}
          mode={state.prefs.lastMode}
          difficulty={state.prefs.lastDifficulty}
          progression={state.prefs.lastProgression}
          selectedThemeIds={selectedThemeIds}
          onChangeMode={(m: PlayMode) => updatePrefs({ lastMode: m })}
          onChangeDifficulty={(d: DifficultyLevel) => updatePrefs({ lastDifficulty: d })}
          onChangeProgression={(p: DifficultyProgression) =>
            updatePrefs({ lastProgression: p })
          }
          onChangeThemes={(themeIds: string[]) =>
            updatePrefs({
              lastThemeIds: themeIds,
              lastThemeId: themeIds[0] || 'all',
            })
          }
          onLaunch={(s) => setSession(s)}
          onQuickStart={handleQuickStart}
        />
      )}

      {tab === 'images' && (
        <ImageBank
          collections={state.collections}
          images={state.images}
          pairs={state.pairs}
          onAddImage={handleAddImage}
          onUpdateImage={handleUpdateImage}
          onDeleteImage={handleDeleteImage}
          onAddCollection={handleAddCollection}
          onAddPair={handleAddPair}
          onDeletePair={handleDeletePair}
        />
      )}

      {tab === 'games' && (
        <ActivityManager
          state={state}
          defaultMode={state.prefs.lastMode}
          defaultDifficulty={state.prefs.lastDifficulty}
          defaultProgression={state.prefs.lastProgression}
          onSaveActivity={handleSaveActivity}
          onDeleteActivity={handleDeleteActivity}
          onAddPair={handleAddPair}
          onStateReplaced={(next) => setState(next)}
          onLaunch={(s) => setSession(s)}
        />
      )}
    </div>
  );
}

export default App;
