import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Link2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import type {
  Activity,
  ActivityDifficultyConfig,
  ClassificationGroup,
  CollectionItem,
  DifficultyLevel,
  DifficultyProgression,
  GameType,
  ImageItem,
  ImagePair,
  PlayMode,
} from '../types';
import {
  DEFAULT_DIFFICULTY_CONFIG,
  DIFFICULTY_LABELS,
  DIFFICULTY_ORDER,
} from '../data/catalog';
import { GamePictogram, GAME_TYPE_META } from './GameIcons';

interface ActivityEditorProps {
  initialActivity?: Activity | null;
  collections: CollectionItem[];
  images: ImageItem[];
  pairs: ImagePair[];
  onSave: (activity: Activity) => Promise<void>;
  onAddPair: (pair: ImagePair) => Promise<void>;
  onCancel: () => void;
}

const GAME_TYPES: GameType[] = [
  'memory',
  'what-changed',
  'sequence',
  'matching',
  'classification',
  'intruder',
  'dobble',
  'pattern',
];
const GROUP_COLORS = ['#5B8E55', '#2575B5', '#D98A1F', '#DD6B4D', '#8B5CF6', '#218A80'];

export function ActivityEditor({
  initialActivity,
  collections,
  images,
  pairs,
  onSave,
  onAddPair,
  onCancel,
}: ActivityEditorProps) {
  const isEditing = Boolean(initialActivity);
  const [gameType, setGameType] = useState<GameType>(initialActivity?.gameType || 'memory');
  const [title, setTitle] = useState(initialActivity?.title || '');
  const [description, setDescription] = useState(initialActivity?.description || '');
  const [defaultMode, setDefaultMode] = useState<PlayMode>(
    initialActivity?.defaultMode || 'individual'
  );
  const [defaultDifficulty, setDefaultDifficulty] = useState<DifficultyLevel>(
    initialActivity?.defaultDifficulty || 'inicial'
  );
  const [defaultProgression, setDefaultProgression] = useState<DifficultyProgression>(
    initialActivity?.defaultProgression || 'progressive'
  );

  const [imgFilterCol, setImgFilterCol] = useState<string>('all');

  // Memory fields
  const [memVariant, setMemVariant] = useState<'identical' | 'related' | 'small-details'>(
    initialActivity?.memoryConfig?.variant || 'identical'
  );
  const [memItemIds, setMemItemIds] = useState<string[]>(
    initialActivity?.memoryConfig?.itemIds || []
  );
  const [memPairIds, setMemPairIds] = useState<string[]>(
    initialActivity?.memoryConfig?.pairIds || []
  );

  // Classification fields
  const [clsMode, setClsMode] = useState<'thematic' | 'attributes'>(
    initialActivity?.classificationConfig?.classificationMode || 'thematic'
  );
  const [clsPrompt, setClsPrompt] = useState(
    initialActivity?.classificationConfig?.prompt || 'Coloca cada imagen en su grupo'
  );
  const [clsGroups, setClsGroups] = useState<ClassificationGroup[]>(
    initialActivity?.classificationConfig?.groups?.length
      ? initialActivity.classificationConfig.groups
      : [
          { id: 'g-1', name: 'Grupo 1', accentColor: GROUP_COLORS[0], itemIds: [] },
          { id: 'g-2', name: 'Grupo 2', accentColor: GROUP_COLORS[1], itemIds: [] },
        ]
  );
  const [activeGroupId, setActiveGroupId] = useState<string>(
    initialActivity?.classificationConfig?.groups?.[0]?.id || 'g-1'
  );

  // Matching fields
  const [matchPrompt, setMatchPrompt] = useState(
    initialActivity?.matchingConfig?.prompt || '¿Cuál le corresponde?'
  );
  const [matchVariant, setMatchVariant] = useState<'silhouette' | 'related' | 'fragment'>(
    initialActivity?.matchingConfig?.variant || 'silhouette'
  );
  const [matchItemIds, setMatchItemIds] = useState<string[]>(
    initialActivity?.matchingConfig?.itemIds || []
  );
  const [matchPairIds, setMatchPairIds] = useState<string[]>(
    initialActivity?.matchingConfig?.pairIds || []
  );

  // What changed fields
  const [wcItemIds, setWcItemIds] = useState<string[]>(
    initialActivity?.whatChangedConfig?.itemIds || []
  );
  const [wcDetailPairIds, setWcDetailPairIds] = useState<string[]>(
    initialActivity?.whatChangedConfig?.detailPairIds || []
  );
  const [wcTimer, setWcTimer] = useState<string>(
    initialActivity?.whatChangedConfig?.observationTimerSeconds
      ? String(initialActivity.whatChangedConfig.observationTimerSeconds)
      : ''
  );

  // Sequence fields
  const [seqItemIds, setSeqItemIds] = useState<string[]>(
    initialActivity?.sequenceConfig?.itemIds || []
  );

  // Intruder fields
  const [intrGroupIds, setIntrGroupIds] = useState<string[]>(
    initialActivity?.intruderConfig?.groupItemIds || []
  );
  const [intrIntruderIds, setIntrIntruderIds] = useState<string[]>(
    initialActivity?.intruderConfig?.intruderItemIds || []
  );

  // Dobble fields
  const [dobbleItemIds, setDobbleItemIds] = useState<string[]>(
    initialActivity?.dobbleConfig?.itemIds || []
  );

  // Pattern fields
  const [patternItemIds, setPatternItemIds] = useState<string[]>(
    initialActivity?.patternConfig?.itemIds || []
  );

  // Editable difficulty presets
  const [showDiffEditor, setShowDiffEditor] = useState(false);
  const [diffConfig, setDiffConfig] = useState<Required<ActivityDifficultyConfig>>({
    memory: {
      ...DEFAULT_DIFFICULTY_CONFIG.memory,
      ...(initialActivity?.difficultyConfig?.memory || {}),
    },
    classification: {
      ...DEFAULT_DIFFICULTY_CONFIG.classification,
      ...(initialActivity?.difficultyConfig?.classification || {}),
    },
    matching: {
      ...DEFAULT_DIFFICULTY_CONFIG.matching,
      ...(initialActivity?.difficultyConfig?.matching || {}),
    },
    whatChanged: {
      ...DEFAULT_DIFFICULTY_CONFIG.whatChanged,
      ...(initialActivity?.difficultyConfig?.whatChanged || {}),
    },
    sequence: {
      ...DEFAULT_DIFFICULTY_CONFIG.sequence,
      ...(initialActivity?.difficultyConfig?.sequence || {}),
    },
    intruder: {
      ...DEFAULT_DIFFICULTY_CONFIG.intruder,
      ...(initialActivity?.difficultyConfig?.intruder || {}),
    },
    dobble: {
      ...DEFAULT_DIFFICULTY_CONFIG.dobble,
      ...(initialActivity?.difficultyConfig?.dobble || {}),
    },
    pattern: {
      ...DEFAULT_DIFFICULTY_CONFIG.pattern,
      ...(initialActivity?.difficultyConfig?.pattern || {}),
    },
  });

  // Inline quick pair creator (saved to shared Pair Bank!)
  const [quickPairA, setQuickPairA] = useState('');
  const [quickPairB, setQuickPairB] = useState('');
  const [quickPairLabel, setQuickPairLabel] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const imageMap = useMemo(() => new Map(images.map((i) => [i.id, i])), [images]);
  const filteredImages = useMemo(
    () =>
      images.filter(
        (img) => imgFilterCol === 'all' || img.collectionId === imgFilterCol
      ),
    [images, imgFilterCol]
  );

  const pieceImages = useMemo(
    () => filteredImages.filter((i) => i.kind === 'piece'),
    [filteredImages]
  );

  const relatedPairs = useMemo(
    () => pairs.filter((p) => p.pairKind === 'related'),
    [pairs]
  );

  const detailPairs = useMemo(
    () => pairs.filter((p) => p.pairKind === 'detail'),
    [pairs]
  );

  const toggleId = (list: string[], id: string, setter: (next: string[]) => void) => {
    if (list.includes(id)) setter(list.filter((x) => x !== id));
    else setter([...list, id]);
  };

  const handleQuickCreatePair = async (kind: 'related' | 'detail') => {
    if (!quickPairA || !quickPairB || quickPairA === quickPairB) return;
    const imgA = imageMap.get(quickPairA);
    const imgB = imageMap.get(quickPairB);
    if (!imgA || !imgB) return;

    const newPair: ImagePair = {
      id: `pair-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: quickPairLabel.trim() || `${imgA.name} y ${imgB.name}`,
      collectionId: imgA.collectionId,
      pairKind: kind,
      itemAId: quickPairA,
      itemBId: quickPairB,
      builtIn: false,
      createdAt: Date.now(),
    };
    await onAddPair(newPair);

    // Automatically check the newly created pair in the active game!
    if (gameType === 'memory' && memVariant === 'related') {
      setMemPairIds((prev) => [...prev, newPair.id]);
    } else if (gameType === 'matching' && matchVariant === 'related') {
      setMatchPairIds((prev) => [...prev, newPair.id]);
    } else if (gameType === 'what-changed') {
      setWcDetailPairIds((prev) => [...prev, newPair.id]);
    }
    setQuickPairA('');
    setQuickPairB('');
    setQuickPairLabel('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMsg('Escribe un título para tu actividad.');
      return;
    }

    // Validate minimum required content
    if (gameType === 'memory') {
      if (memVariant === 'identical' && memItemIds.length < 2) {
        setErrorMsg('Selecciona al menos 2 imágenes para el Memory.');
        return;
      }
      if (memVariant === 'related' && memPairIds.length < 2) {
        setErrorMsg('Selecciona al menos 2 parejas relacionadas para el Memory.');
        return;
      }
    } else if (gameType === 'classification' && clsMode === 'thematic') {
      const validGroups = clsGroups.filter((g) => g.name.trim());
      const totalItems = validGroups.reduce((sum, g) => sum + g.itemIds.length, 0);
      if (validGroups.length < 2 || totalItems < 2) {
        setErrorMsg('Define al menos 2 grupos y asigna al menos 2 piezas en total.');
        return;
      }
    } else if (gameType === 'matching') {
      if ((matchVariant === 'silhouette' || matchVariant === 'fragment') && matchItemIds.length < 2) {
        setErrorMsg('Selecciona al menos 2 imágenes.');
        return;
      }
      if (matchVariant === 'related' && matchPairIds.length < 2) {
        setErrorMsg('Selecciona al menos 2 parejas relacionadas.');
        return;
      }
    } else if (gameType === 'what-changed') {
      if (wcItemIds.length < 3) {
        setErrorMsg('Selecciona al menos 3 imágenes para «¿Qué ha cambiado?».');
        return;
      }
    } else if (gameType === 'sequence') {
      if (seqItemIds.length < 2) {
        setErrorMsg('Selecciona al menos 2 imágenes para «Recuerda el orden».');
        return;
      }
    } else if (gameType === 'intruder') {
      if (intrGroupIds.length < 3) {
        setErrorMsg('Selecciona al menos 3 imágenes para el grupo principal de «El intruso».');
        return;
      }
    } else if (gameType === 'dobble') {
      if (dobbleItemIds.length < 3) {
        setErrorMsg('Selecciona al menos 3 imágenes para «Ojo de lince».');
        return;
      }
    } else if (gameType === 'pattern') {
      if (patternItemIds.length < 2) {
        setErrorMsg('Selecciona al menos 2 imágenes para «Completa la serie».');
        return;
      }
    }

    // Collect referenced collection IDs automatically (supports mixing collections!)
    const usedImageIds = new Set<string>();
    if (gameType === 'memory') {
      memItemIds.forEach((id) => usedImageIds.add(id));
      memPairIds.forEach((pid) => {
        const p = pairs.find((x) => x.id === pid);
        if (p) {
          usedImageIds.add(p.itemAId);
          usedImageIds.add(p.itemBId);
        }
      });
    } else if (gameType === 'classification') {
      clsGroups.forEach((g) => {
        if (g.imageId) usedImageIds.add(g.imageId);
        g.itemIds.forEach((id) => usedImageIds.add(id));
      });
    } else if (gameType === 'matching') {
      matchItemIds.forEach((id) => usedImageIds.add(id));
      matchPairIds.forEach((pid) => {
        const p = pairs.find((x) => x.id === pid);
        if (p) {
          usedImageIds.add(p.itemAId);
          usedImageIds.add(p.itemBId);
        }
      });
    } else if (gameType === 'what-changed') {
      wcItemIds.forEach((id) => usedImageIds.add(id));
      wcDetailPairIds.forEach((pid) => {
        const p = pairs.find((x) => x.id === pid);
        if (p) {
          usedImageIds.add(p.itemAId);
          usedImageIds.add(p.itemBId);
        }
      });
    } else if (gameType === 'sequence') {
      seqItemIds.forEach((id) => usedImageIds.add(id));
    } else if (gameType === 'intruder') {
      intrGroupIds.forEach((id) => usedImageIds.add(id));
      intrIntruderIds.forEach((id) => usedImageIds.add(id));
    } else if (gameType === 'dobble') {
      dobbleItemIds.forEach((id) => usedImageIds.add(id));
    } else if (gameType === 'pattern') {
      patternItemIds.forEach((id) => usedImageIds.add(id));
    }

    const colIdSet = new Set<string>();
    usedImageIds.forEach((id) => {
      const img = imageMap.get(id);
      if (img) colIdSet.add(img.collectionId);
    });

    const now = Date.now();
    const activityToSave: Activity = {
      id:
        initialActivity && !initialActivity.builtIn
          ? initialActivity.id
          : `act-custom-${now}-${Math.random().toString(36).slice(2, 6)}`,
      title: trimmedTitle,
      description:
        description.trim() || GAME_TYPE_META[gameType].shortDesc,
      gameType,
      collectionIds: Array.from(colIdSet),
      builtIn: false,
      createdAt: initialActivity?.createdAt || now,
      updatedAt: now,
      defaultDifficulty,
      defaultProgression,
      defaultMode,
      difficultyConfig: diffConfig,
      memoryConfig:
        gameType === 'memory'
          ? {
              variant: memVariant,
              itemIds: memItemIds,
              pairIds: memPairIds,
            }
          : undefined,
      classificationConfig:
        gameType === 'classification'
          ? {
              prompt: clsPrompt.trim() || 'Coloca cada imagen en su grupo',
              classificationMode: clsMode,
              groups: clsMode === 'attributes' ? [] : clsGroups.filter((g) => g.name.trim()),
            }
          : undefined,
      matchingConfig:
        gameType === 'matching'
          ? {
              prompt: matchPrompt.trim() || '¿Cuál le corresponde?',
              variant: matchVariant,
              itemIds: matchItemIds,
              pairIds: matchPairIds,
            }
          : undefined,
      whatChangedConfig:
        gameType === 'what-changed'
          ? {
              itemIds: wcItemIds,
              detailPairIds: wcDetailPairIds,
              observationTimerSeconds: wcTimer ? Math.max(2, Number(wcTimer)) : null,
            }
          : undefined,
      sequenceConfig:
        gameType === 'sequence'
          ? {
              itemIds: seqItemIds,
              observationTimerSeconds: null,
            }
          : undefined,
      intruderConfig:
        gameType === 'intruder'
          ? {
              baseCollectionId: Array.from(colIdSet)[0],
              groupItemIds: intrGroupIds,
              intruderItemIds: intrIntruderIds.length > 0 ? intrIntruderIds : undefined,
            }
          : undefined,
      dobbleConfig:
        gameType === 'dobble'
          ? {
              itemIds: dobbleItemIds,
            }
          : undefined,
      patternConfig:
        gameType === 'pattern'
          ? {
              itemIds: patternItemIds,
            }
          : undefined,
    };

    setSaving(true);
    try {
      await onSave(activityToSave);
    } finally {
      setSaving(false);
    }
  };

  const activeGroup = clsGroups.find((g) => g.id === activeGroupId) || clsGroups[0];

  return (
    <div className="page-container" style={{ overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
            <ArrowLeft size={18} /> Volver
          </button>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.65rem' }}>
            {isEditing ? 'Editar actividad' : 'Crear nueva actividad'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Step 1: Game type & basic metadata */}
        <section className="board-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>
            1. Tipo de juego y datos básicos
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {GAME_TYPES.map((gt) => (
              <button
                key={gt}
                type="button"
                data-testid={`editor-gametype-${gt}`}
                onClick={() => setGameType(gt)}
                style={{
                  padding: 14,
                  borderRadius: 18,
                  border: `3px solid ${gameType === gt ? 'var(--accent-teal)' : 'var(--border-card)'}`,
                  background: gameType === gt ? 'var(--accent-teal-soft)' : '#fffdf8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  textAlign: 'left',
                }}
              >
                <GamePictogram type={gt} size={42} />
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>
                    {GAME_TYPE_META[gt].name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)' }}>
                    {GAME_TYPE_META[gt].shortDesc}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            <div className="form-field">
              <label className="form-label" htmlFor="act-title">
                Título de la actividad *
              </label>
              <input
                id="act-title"
                type="text"
                className="text-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej.: Memory de mi clase, Animales y crías..."
                data-testid="editor-title-input"
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="act-desc">
                Descripción breve
              </label>
              <input
                id="act-desc"
                type="text"
                className="text-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Aparece en la tarjeta de la actividad"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div className="form-field">
              <label className="form-label">Modo recomendado</label>
              <select
                className="select-input"
                value={defaultMode}
                onChange={(e) => setDefaultMode(e.target.value as PlayMode)}
              >
                <option value="individual">Individual / Rincones</option>
                <option value="asamblea">Asamblea / PDI</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Nivel inicial</label>
              <select
                className="select-input"
                value={defaultDifficulty}
                onChange={(e) => setDefaultDifficulty(e.target.value as DifficultyLevel)}
              >
                {DIFFICULTY_ORDER.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {DIFFICULTY_LABELS[lvl]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Dificultad por defecto</label>
              <select
                className="select-input"
                value={defaultProgression}
                onChange={(e) => setDefaultProgression(e.target.value as DifficultyProgression)}
              >
                <option value="progressive">Progresiva</option>
                <option value="fixed">Nivel fijo</option>
              </select>
            </div>
          </div>
        </section>

        {/* Step 2: Game-specific content */}
        <section className="board-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>
              2. Material del juego (puedes mezclar colecciones)
            </h2>
            <select
              className="select-input"
              style={{ width: 'auto', padding: '8px 14px' }}
              value={imgFilterCol}
              onChange={(e) => setImgFilterCol(e.target.value)}
              aria-label="Filtrar banco por colección"
            >
              <option value="all">Todas las colecciones ({images.length} imágenes)</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* MEMORY CONFIG */}
          {gameType === 'memory' && (
            <>
              <div className="segmented" style={{ maxWidth: 460 }}>
                <button
                  type="button"
                  className={memVariant === 'identical' ? 'active' : ''}
                  onClick={() => setMemVariant('identical')}
                  data-testid="mem-variant-identical"
                >
                  Parejas idénticas
                </button>
                <button
                  type="button"
                  className={memVariant === 'related' ? 'active' : ''}
                  onClick={() => setMemVariant('related')}
                  data-testid="mem-variant-related"
                >
                  Parejas relacionadas
                </button>
              </div>

              {memVariant === 'identical' ? (
                <>
                  <p style={{ margin: 0, color: 'var(--ink-secondary)', fontSize: '0.94rem' }}>
                    Selecciona las imágenes que quieres usar ({memItemIds.length} seleccionadas). La
                    app generará las dos cartas de cada pareja.
                  </p>
                  <div className="image-pick-grid">
                    {filteredImages.map((img) => {
                      const sel = memItemIds.includes(img.id);
                      return (
                        <button
                          key={img.id}
                          type="button"
                          className={`image-pick-tile ${sel ? 'selected' : ''}`}
                          onClick={() => toggleId(memItemIds, img.id, setMemItemIds)}
                          data-testid={`pick-img-${img.id}`}
                        >
                          <img src={img.src} alt={img.name} />
                          <span>{img.name}</span>
                          {sel && (
                            <span className="matched-badge" style={{ width: 22, height: 22, top: 5, right: 5 }}>
                              <Check size={13} strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <PairPickerSection
                  pairs={relatedPairs}
                  selectedIds={memPairIds}
                  onToggle={(id) => toggleId(memPairIds, id, setMemPairIds)}
                  imageMap={imageMap}
                  allImages={filteredImages}
                  quickPairA={quickPairA}
                  quickPairB={quickPairB}
                  quickPairLabel={quickPairLabel}
                  setQuickPairA={setQuickPairA}
                  setQuickPairB={setQuickPairB}
                  setQuickPairLabel={setQuickPairLabel}
                  onQuickCreate={() => handleQuickCreatePair('related')}
                  kindLabel="parejas relacionadas"
                />
              )}
            </>
          )}

          {/* CLASSIFICATION CONFIG */}
          {gameType === 'classification' && (
            <>
              <div className="segmented" style={{ maxWidth: 480 }}>
                <button
                  type="button"
                  className={clsMode === 'thematic' ? 'active' : ''}
                  onClick={() => setClsMode('thematic')}
                >
                  Grupos temáticos personalizados
                </button>
                <button
                  type="button"
                  className={clsMode === 'attributes' ? 'active' : ''}
                  onClick={() => setClsMode('attributes')}
                >
                  Por atributos (Formas y doble entrada)
                </button>
              </div>

              {clsMode === 'attributes' ? (
                <p style={{ margin: 0, color: 'var(--ink-secondary)' }}>
                  Usa automáticamente formas con ejemplo guía en Inicial/Sencillo y cuadrícula de
                  doble entrada (forma × orientación) en Intermedio/Avanzado.
                </p>
              ) : (
                <>
              <div className="form-field">
                <label className="form-label">Consigna de la actividad</label>
                <input
                  type="text"
                  className="text-input"
                  value={clsPrompt}
                  onChange={(e) => setClsPrompt(e.target.value)}
                  placeholder="Ej.: ¿Por dónde se desplaza cada vehículo?"
                />
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                {clsGroups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={`btn btn-sm ${g.id === activeGroup?.id ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveGroupId(g.id)}
                  >
                    {g.name || 'Sin nombre'} ({g.itemIds.length})
                  </button>
                ))}
                <button
                  type="button"
                  className="btn btn-sm btn-coral"
                  onClick={() => {
                    const id = `g-${Date.now()}`;
                    setClsGroups((prev) => [
                      ...prev,
                      {
                        id,
                        name: `Grupo ${prev.length + 1}`,
                        accentColor: GROUP_COLORS[prev.length % GROUP_COLORS.length],
                        itemIds: [],
                      },
                    ]);
                    setActiveGroupId(id);
                  }}
                >
                  <Plus size={16} /> Añadir grupo
                </button>
              </div>

              {activeGroup && (
                <div
                  style={{
                    padding: 16,
                    borderRadius: 20,
                    background: 'var(--bg-card-subtle)',
                    border: '2px solid var(--border-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className="form-field" style={{ flex: '1 1 200px' }}>
                      <label className="form-label">Nombre del grupo</label>
                      <input
                        type="text"
                        className="text-input"
                        value={activeGroup.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setClsGroups((prev) =>
                            prev.map((g) => (g.id === activeGroup.id ? { ...g, name: val } : g))
                          );
                        }}
                      />
                    </div>
                    <div className="form-field" style={{ flex: '1 1 220px' }}>
                      <label className="form-label">Imagen representativa del grupo</label>
                      <select
                        className="select-input"
                        value={activeGroup.imageId || ''}
                        onChange={(e) => {
                          const val = e.target.value || undefined;
                          setClsGroups((prev) =>
                            prev.map((g) => (g.id === activeGroup.id ? { ...g, imageId: val } : g))
                          );
                        }}
                      >
                        <option value="">Sin imagen de cabecera</option>
                        {images.map((img) => (
                          <option key={img.id} value={img.id}>
                            {img.name} ({img.kind === 'scenario' ? 'Escenario' : 'Pieza'})
                          </option>
                        ))}
                      </select>
                    </div>
                    {clsGroups.length > 2 && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--accent-coral)' }}
                        onClick={() => {
                          const next = clsGroups.filter((g) => g.id !== activeGroup.id);
                          setClsGroups(next);
                          setActiveGroupId(next[0].id);
                        }}
                      >
                        <Trash2 size={16} /> Eliminar grupo
                      </button>
                    )}
                  </div>

                  <div>
                    <div className="form-label" style={{ marginBottom: 8 }}>
                      Toca las piezas que pertenecen a «{activeGroup.name}»:
                    </div>
                    <div className="image-pick-grid">
                      {pieceImages.map((img) => {
                        const inThisGroup = activeGroup.itemIds.includes(img.id);
                        return (
                          <button
                            key={img.id}
                            type="button"
                            className={`image-pick-tile ${inThisGroup ? 'selected' : ''}`}
                            onClick={() => {
                              setClsGroups((prev) =>
                                prev.map((g) => {
                                  if (g.id === activeGroup.id) {
                                    return {
                                      ...g,
                                      itemIds: inThisGroup
                                        ? g.itemIds.filter((id) => id !== img.id)
                                        : [...g.itemIds, img.id],
                                    };
                                  }
                                  // Remove from other groups so each piece has 1 clear target
                                  return {
                                    ...g,
                                    itemIds: g.itemIds.filter((id) => id !== img.id),
                                  };
                                })
                              );
                            }}
                          >
                            <img src={img.src} alt={img.name} />
                            <span>{img.name}</span>
                            {inThisGroup && (
                              <span className="matched-badge" style={{ width: 22, height: 22, top: 5, right: 5 }}>
                                <Check size={13} strokeWidth={3} />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
                </>
              )}
            </>
          )}

          {/* MATCHING CONFIG */}
          {gameType === 'matching' && (
            <>
              <div className="form-field">
                <label className="form-label">Consigna de la actividad</label>
                <input
                  type="text"
                  className="text-input"
                  value={matchPrompt}
                  onChange={(e) => setMatchPrompt(e.target.value)}
                  placeholder="Ej.: ¿Cuál es su silueta? / ¿Cuál es su cría?"
                />
              </div>

              <div className="segmented" style={{ maxWidth: 560 }}>
                <button
                  type="button"
                  className={matchVariant === 'silhouette' ? 'active' : ''}
                  onClick={() => setMatchVariant('silhouette')}
                  data-testid="match-variant-silhouette"
                >
                  Imagen y silueta
                </button>
                <button
                  type="button"
                  className={matchVariant === 'fragment' ? 'active' : ''}
                  onClick={() => setMatchVariant('fragment')}
                >
                  Fragmento / recorte
                </button>
                <button
                  type="button"
                  className={matchVariant === 'related' ? 'active' : ''}
                  onClick={() => setMatchVariant('related')}
                  data-testid="match-variant-related"
                >
                  Parejas relacionadas
                </button>
              </div>

              {matchVariant === 'silhouette' || matchVariant === 'fragment' ? (
                <>
                  <p style={{ margin: 0, color: 'var(--ink-secondary)', fontSize: '0.94rem' }}>
                    Selecciona imágenes ({matchItemIds.length} seleccionadas).
                  </p>
                  <div className="image-pick-grid">
                    {filteredImages
                      .filter((i) => matchVariant === 'fragment' || Boolean(i.silhouetteSrc))
                      .map((img) => {
                        const sel = matchItemIds.includes(img.id);
                        return (
                          <button
                            key={img.id}
                            type="button"
                            className={`image-pick-tile ${sel ? 'selected' : ''}`}
                            onClick={() => toggleId(matchItemIds, img.id, setMatchItemIds)}
                          >
                            <img src={img.src} alt={img.name} />
                            <span>{img.name}</span>
                            {sel && (
                              <span className="matched-badge" style={{ width: 22, height: 22, top: 5, right: 5 }}>
                                <Check size={13} strokeWidth={3} />
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </>
              ) : (
                <PairPickerSection
                  pairs={relatedPairs}
                  selectedIds={matchPairIds}
                  onToggle={(id) => toggleId(matchPairIds, id, setMatchPairIds)}
                  imageMap={imageMap}
                  allImages={filteredImages}
                  quickPairA={quickPairA}
                  quickPairB={quickPairB}
                  quickPairLabel={quickPairLabel}
                  setQuickPairA={setQuickPairA}
                  setQuickPairB={setQuickPairB}
                  setQuickPairLabel={setQuickPairLabel}
                  onQuickCreate={() => handleQuickCreatePair('related')}
                  kindLabel="parejas relacionadas"
                />
              )}
            </>
          )}

          {/* WHAT CHANGED CONFIG */}
          {gameType === 'what-changed' && (
            <>
              <p style={{ margin: 0, color: 'var(--ink-secondary)', fontSize: '0.94rem' }}>
                Elige al menos 3 imágenes para el tablero ({wcItemIds.length} seleccionadas).
              </p>
              <div className="image-pick-grid">
                {filteredImages.map((img) => {
                  const sel = wcItemIds.includes(img.id);
                  return (
                    <button
                      key={img.id}
                      type="button"
                      className={`image-pick-tile ${sel ? 'selected' : ''}`}
                      onClick={() => toggleId(wcItemIds, img.id, setWcItemIds)}
                    >
                      <img src={img.src} alt={img.name} />
                      <span>{img.name}</span>
                      {sel && (
                        <span className="matched-badge" style={{ width: 22, height: 22, top: 5, right: 5 }}>
                          <Check size={13} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="form-field" style={{ maxWidth: 320 }}>
                <label className="form-label">
                  Tiempo de observación en segundos (vacío = tiempo libre)
                </label>
                <input
                  type="number"
                  min={2}
                  max={60}
                  className="text-input"
                  value={wcTimer}
                  onChange={(e) => setWcTimer(e.target.value)}
                  placeholder="Libre (recomendado)"
                />
              </div>

              <div style={{ marginTop: 8 }}>
                <div className="form-label" style={{ marginBottom: 8 }}>
                  Opcional: Parejas de cambio de detalle (ej. velero con y sin bandera)
                </div>
                <PairPickerSection
                  pairs={detailPairs}
                  selectedIds={wcDetailPairIds}
                  onToggle={(id) => toggleId(wcDetailPairIds, id, setWcDetailPairIds)}
                  imageMap={imageMap}
                  allImages={filteredImages}
                  quickPairA={quickPairA}
                  quickPairB={quickPairB}
                  quickPairLabel={quickPairLabel}
                  setQuickPairA={setQuickPairA}
                  setQuickPairB={setQuickPairB}
                  setQuickPairLabel={setQuickPairLabel}
                  onQuickCreate={() => handleQuickCreatePair('detail')}
                  kindLabel="parejas de cambio de detalle"
                />
              </div>
            </>
          )}

          {/* SEQUENCE CONFIG */}
          {gameType === 'sequence' && (
            <>
              <p style={{ margin: 0, color: 'var(--ink-secondary)', fontSize: '0.94rem' }}>
                Selecciona al menos 2 imágenes para generar las series ({seqItemIds.length}{' '}
                seleccionadas).
              </p>
              <div className="image-pick-grid">
                {filteredImages.map((img) => {
                  const sel = seqItemIds.includes(img.id);
                  return (
                    <button
                      key={img.id}
                      type="button"
                      className={`image-pick-tile ${sel ? 'selected' : ''}`}
                      onClick={() => toggleId(seqItemIds, img.id, setSeqItemIds)}
                    >
                      <img src={img.src} alt={img.name} />
                      <span>{img.name}</span>
                      {sel && (
                        <span className="matched-badge" style={{ width: 22, height: 22, top: 5, right: 5 }}>
                          <Check size={13} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* INTRUDER CONFIG */}
          {gameType === 'intruder' && (
            <>
              <p style={{ margin: 0, color: 'var(--ink-secondary)', fontSize: '0.94rem' }}>
                Elige al menos 3 imágenes que formen el grupo principal ({intrGroupIds.length} seleccionadas).
              </p>
              <div className="image-pick-grid">
                {pieceImages.map((img) => {
                  const sel = intrGroupIds.includes(img.id);
                  return (
                    <button
                      key={img.id}
                      type="button"
                      className={`image-pick-tile ${sel ? 'selected' : ''}`}
                      onClick={() => toggleId(intrGroupIds, img.id, setIntrGroupIds)}
                    >
                      <img src={img.src} alt={img.name} />
                      <span>{img.name}</span>
                      {sel && (
                        <span className="matched-badge" style={{ width: 22, height: 22, top: 5, right: 5 }}>
                          <Check size={13} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: 8 }}>
                <p style={{ margin: '0 0 8px', color: 'var(--ink-secondary)', fontSize: '0.9rem' }}>
                  Opcional: elige intrusos personalizados ({intrIntruderIds.length} seleccionados). Si lo
                  dejas vacío, la app elegirá intrusos automáticamente de otras temáticas.
                </p>
                <div className="image-pick-grid">
                  {pieceImages
                    .filter((i) => !intrGroupIds.includes(i.id))
                    .map((img) => {
                      const sel = intrIntruderIds.includes(img.id);
                      return (
                        <button
                          key={img.id}
                          type="button"
                          className={`image-pick-tile ${sel ? 'selected' : ''}`}
                          onClick={() => toggleId(intrIntruderIds, img.id, setIntrIntruderIds)}
                        >
                          <img src={img.src} alt={img.name} />
                          <span>{img.name}</span>
                          {sel && (
                            <span className="matched-badge" style={{ width: 22, height: 22, top: 5, right: 5 }}>
                              <Check size={13} strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            </>
          )}

          {/* DOBBLE CONFIG */}
          {gameType === 'dobble' && (
            <>
              <p style={{ margin: 0, color: 'var(--ink-secondary)', fontSize: '0.94rem' }}>
                Elige al menos 3 dibujos ({dobbleItemIds.length} seleccionados). En cada ronda solo 1
                dibujo se repetirá en las dos cartas circulares.
              </p>
              <div className="image-pick-grid">
                {pieceImages.map((img) => {
                  const sel = dobbleItemIds.includes(img.id);
                  return (
                    <button
                      key={img.id}
                      type="button"
                      className={`image-pick-tile ${sel ? 'selected' : ''}`}
                      onClick={() => toggleId(dobbleItemIds, img.id, setDobbleItemIds)}
                    >
                      <img src={img.src} alt={img.name} />
                      <span>{img.name}</span>
                      {sel && (
                        <span className="matched-badge" style={{ width: 22, height: 22, top: 5, right: 5 }}>
                          <Check size={13} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* PATTERN CONFIG */}
          {gameType === 'pattern' && (
            <>
              <p style={{ margin: 0, color: 'var(--ink-secondary)', fontSize: '0.94rem' }}>
                Elige al menos 2 dibujos ({patternItemIds.length} seleccionados) para generar series
                lógicas con patrón repetitivo.
              </p>
              <div className="image-pick-grid">
                {pieceImages.map((img) => {
                  const sel = patternItemIds.includes(img.id);
                  return (
                    <button
                      key={img.id}
                      type="button"
                      className={`image-pick-tile ${sel ? 'selected' : ''}`}
                      onClick={() => toggleId(patternItemIds, img.id, setPatternItemIds)}
                    >
                      <img src={img.src} alt={img.name} />
                      <span>{img.name}</span>
                      {sel && (
                        <span className="matched-badge" style={{ width: 22, height: 22, top: 5, right: 5 }}>
                          <Check size={13} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* Step 3: Editable 4 Difficulty Levels */}
        <section className="board-card" style={{ padding: 20 }}>
          <button
            type="button"
            onClick={() => setShowDiffEditor((v) => !v)}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontFamily: 'var(--font-display)',
              fontSize: '1.15rem',
              fontWeight: 700,
            }}
          >
            <span>3. Ajustar los 4 niveles de dificultad (opcional)</span>
            {showDiffEditor ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {showDiffEditor && (
            <div
              style={{
                marginTop: 16,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: 12,
              }}
            >
              {DIFFICULTY_ORDER.map((lvl) => (
                <div
                  key={lvl}
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    background: 'var(--bg-card-subtle)',
                    border: '1.5px solid var(--border-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <strong style={{ fontFamily: 'var(--font-display)' }}>
                    {DIFFICULTY_LABELS[lvl]}
                  </strong>

                  {gameType === 'memory' && (
                    <label className="form-field">
                      <span className="form-label">Nº de parejas</span>
                      <input
                        type="number"
                        min={2}
                        max={12}
                        className="text-input"
                        value={diffConfig.memory[lvl].pairsCount}
                        onChange={(e) =>
                          setDiffConfig((prev) => ({
                            ...prev,
                            memory: {
                              ...prev.memory,
                              [lvl]: { pairsCount: Math.max(2, Number(e.target.value)) },
                            },
                          }))
                        }
                      />
                    </label>
                  )}

                  {gameType === 'classification' && (
                    <label className="form-field">
                      <span className="form-label">Nº de piezas</span>
                      <input
                        type="number"
                        min={2}
                        max={16}
                        className="text-input"
                        value={diffConfig.classification[lvl].piecesCount}
                        onChange={(e) =>
                          setDiffConfig((prev) => ({
                            ...prev,
                            classification: {
                              ...prev.classification,
                              [lvl]: { piecesCount: Math.max(2, Number(e.target.value)) },
                            },
                          }))
                        }
                      />
                    </label>
                  )}

                  {gameType === 'matching' && (
                    <>
                      <label className="form-field">
                        <span className="form-label">Nº de opciones</span>
                        <input
                          type="number"
                          min={2}
                          max={8}
                          className="text-input"
                          value={diffConfig.matching[lvl].optionsCount}
                          onChange={(e) =>
                            setDiffConfig((prev) => ({
                              ...prev,
                              matching: {
                                ...prev.matching,
                                [lvl]: {
                                  ...prev.matching[lvl],
                                  optionsCount: Math.max(2, Number(e.target.value)),
                                },
                              },
                            }))
                          }
                        />
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.84rem' }}>
                        <input
                          type="checkbox"
                          checked={diffConfig.matching[lvl].preferSimilar}
                          onChange={(e) =>
                            setDiffConfig((prev) => ({
                              ...prev,
                              matching: {
                                ...prev.matching,
                                [lvl]: {
                                  ...prev.matching[lvl],
                                  preferSimilar: e.target.checked,
                                },
                              },
                            }))
                          }
                        />
                        Priorizar opciones parecidas
                      </label>
                    </>
                  )}

                  {gameType === 'what-changed' && (
                    <label className="form-field">
                      <span className="form-label">Piezas en tablero</span>
                      <input
                        type="number"
                        min={3}
                        max={8}
                        className="text-input"
                        value={diffConfig.whatChanged[lvl].itemsCount}
                        onChange={(e) =>
                          setDiffConfig((prev) => ({
                            ...prev,
                            whatChanged: {
                              ...prev.whatChanged,
                              [lvl]: {
                                ...prev.whatChanged[lvl],
                                itemsCount: Math.max(3, Number(e.target.value)),
                                optionsCount: Math.max(3, Number(e.target.value)),
                              },
                            },
                          }))
                        }
                      />
                    </label>
                  )}

                  {gameType === 'intruder' && (
                    <label className="form-field">
                      <span className="form-label">Dibujos en pantalla</span>
                      <input
                        type="number"
                        min={4}
                        max={6}
                        className="text-input"
                        value={diffConfig.intruder[lvl].totalItems}
                        onChange={(e) =>
                          setDiffConfig((prev) => ({
                            ...prev,
                            intruder: {
                              ...prev.intruder,
                              [lvl]: {
                                ...prev.intruder[lvl],
                                totalItems: Math.min(6, Math.max(4, Number(e.target.value))),
                              },
                            },
                          }))
                        }
                      />
                    </label>
                  )}

                  {gameType === 'dobble' && (
                    <label className="form-field">
                      <span className="form-label">Dibujos por carta</span>
                      <select
                        className="select-input"
                        value={diffConfig.dobble[lvl].symbolsPerCard}
                        onChange={(e) =>
                          setDiffConfig((prev) => ({
                            ...prev,
                            dobble: {
                              ...prev.dobble,
                              [lvl]: {
                                ...prev.dobble[lvl],
                                symbolsPerCard: Number(e.target.value),
                              },
                            },
                          }))
                        }
                      >
                        <option value={3}>3 dibujos</option>
                        <option value={4}>4 dibujos</option>
                        <option value={6}>6 dibujos</option>
                        <option value={8}>8 dibujos</option>
                      </select>
                    </label>
                  )}

                  {gameType === 'pattern' && (
                    <label className="form-field">
                      <span className="form-label">Tipo de serie</span>
                      <select
                        className="select-input"
                        value={diffConfig.pattern[lvl].patternType}
                        onChange={(e) =>
                          setDiffConfig((prev) => ({
                            ...prev,
                            pattern: {
                              ...prev.pattern,
                              [lvl]: {
                                ...prev.pattern[lvl],
                                patternType: e.target.value as 'AB' | 'ABC' | 'mid-gap' | 'double-rule',
                              },
                            },
                          }))
                        }
                      >
                        <option value="AB">Alterna (A-B-A-?)</option>
                        <option value="ABC">Ritmo de 3 (A-B-C)</option>
                        <option value="mid-gap">Hueco medio / tamaños</option>
                        <option value="double-rule">Doble regla / giros</option>
                      </select>
                    </label>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {errorMsg && (
          <div className="feedback-banner warn" role="alert">
            {errorMsg}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button type="button" className="btn btn-secondary btn-lg" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={saving}
            data-testid="editor-save-btn"
          >
            <Save size={20} /> {saving ? 'Guardando…' : 'Guardar actividad'}
          </button>
        </div>
      </form>
    </div>
  );
}

interface PairPickerProps {
  pairs: ImagePair[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  imageMap: Map<string, ImageItem>;
  allImages: ImageItem[];
  quickPairA: string;
  quickPairB: string;
  quickPairLabel: string;
  setQuickPairA: (v: string) => void;
  setQuickPairB: (v: string) => void;
  setQuickPairLabel: (v: string) => void;
  onQuickCreate: () => void;
  kindLabel: string;
}

function PairPickerSection({
  pairs,
  selectedIds,
  onToggle,
  imageMap,
  allImages,
  quickPairA,
  quickPairB,
  quickPairLabel,
  setQuickPairA,
  setQuickPairB,
  setQuickPairLabel,
  onQuickCreate,
  kindLabel,
}: PairPickerProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {pairs.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {pairs.map((p) => {
            const sel = selectedIds.includes(p.id);
            const a = imageMap.get(p.itemAId);
            const b = imageMap.get(p.itemBId);
            return (
              <button
                key={p.id}
                type="button"
                data-testid={`pick-pair-${p.id}`}
                onClick={() => onToggle(p.id)}
                style={{
                  padding: 12,
                  borderRadius: 16,
                  border: `2.5px solid ${sel ? 'var(--accent-teal)' : 'var(--border-card)'}`,
                  background: sel ? 'var(--accent-teal-soft)' : '#fffdf8',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  textAlign: 'left',
                  position: 'relative',
                }}
              >
                <strong style={{ fontSize: '0.92rem' }}>{p.label}</strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="activity-thumb-box" style={{ width: 52, height: 52 }}>
                    {a && <img src={a.src} alt={a.name} />}
                  </div>
                  <Link2 size={16} color="var(--ink-muted)" />
                  <div className="activity-thumb-box" style={{ width: 52, height: 52 }}>
                    {b && <img src={b.src} alt={b.name} />}
                  </div>
                </div>
                {sel && (
                  <span className="matched-badge" style={{ width: 22, height: 22, top: 6, right: 6 }}>
                    <Check size={13} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--ink-secondary)' }}>
          Todavía no hay {kindLabel} guardadas. Puedes crearlas aquí mismo:
        </p>
      )}

      {/* Inline pair creator */}
      <div
        style={{
          padding: 14,
          borderRadius: 16,
          background: 'var(--bg-card-subtle)',
          border: '2px dashed var(--border-strong)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 10,
          alignItems: 'end',
        }}
      >
        <div className="form-field">
          <label className="form-label">Imagen A</label>
          <select
            className="select-input"
            value={quickPairA}
            onChange={(e) => setQuickPairA(e.target.value)}
          >
            <option value="">Elegir…</option>
            {allImages.map((img) => (
              <option key={img.id} value={img.id}>
                {img.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label className="form-label">Imagen B</label>
          <select
            className="select-input"
            value={quickPairB}
            onChange={(e) => setQuickPairB(e.target.value)}
          >
            <option value="">Elegir…</option>
            {allImages.map((img) => (
              <option key={img.id} value={img.id}>
                {img.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label className="form-label">Etiqueta (opcional)</label>
          <input
            type="text"
            className="text-input"
            value={quickPairLabel}
            onChange={(e) => setQuickPairLabel(e.target.value)}
            placeholder="Ej.: Vaca y ternero"
          />
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!quickPairA || !quickPairB || quickPairA === quickPairB}
          onClick={onQuickCreate}
        >
          <Plus size={18} /> Añadir pareja
        </button>
      </div>
    </div>
  );
}
