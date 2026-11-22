import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type {
  Activity,
  DifficultyLevel,
  DifficultyProgression,
  ImageItem,
  PlayMode,
} from '../types';
import { DEFAULT_DIFFICULTY_CONFIG, DIFFICULTY_ORDER, MASCOT } from '../data/catalog';
import { shuffleArray } from '../lib/activityValidation';
import { playSoundCue, speakSpanish } from '../lib/speech';
import { GameShell } from './GameShell';
import { AttributeClassificationGame } from './AttributeClassificationGame';

interface ClassificationPiece {
  id: string;
  image: ImageItem;
  correctGroupId: string;
}

interface DragState {
  pieceId: string;
  image: ImageItem;
  startX: number;
  startY: number;
  x: number;
  y: number;
  active: boolean;
  hoveredZoneId: string | null;
}

interface ClassificationGameProps {
  activity: Activity;
  images: ImageItem[];
  themeId?: string;
  themeIds?: string[];
  mode: PlayMode;
  initialDifficulty: DifficultyLevel;
  progression: DifficultyProgression;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  showInitialDemo: boolean;
  onDemoSeen: () => void;
  onToggleSound: () => void;
  onExit: () => void;
}

function difficultyForPiecesCount(
  count: number,
  cfg: Record<DifficultyLevel, { piecesCount: number }>
): DifficultyLevel {
  for (let i = DIFFICULTY_ORDER.length - 1; i >= 0; i--) {
    const lvl = DIFFICULTY_ORDER[i];
    if (count >= cfg[lvl].piecesCount) return lvl;
  }
  return 'inicial';
}

export function ClassificationGame(props: ClassificationGameProps) {
  if (props.activity.classificationConfig?.classificationMode === 'attributes') {
    return (
      <AttributeClassificationGame
        activity={props.activity}
        images={props.images}
        themeId={props.themeId}
        themeIds={props.themeIds}
        mode={props.mode}
        initialDifficulty={props.initialDifficulty}
        progression={props.progression}
        soundEnabled={props.soundEnabled}
        voiceEnabled={props.voiceEnabled}
        showInitialDemo={props.showInitialDemo}
        onDemoSeen={props.onDemoSeen}
        onToggleSound={props.onToggleSound}
        onExit={props.onExit}
      />
    );
  }
  return <ThematicClassificationGame {...props} />;
}

function ThematicClassificationGame({
  activity,
  images,
  mode,
  initialDifficulty,
  progression,
  soundEnabled,
  voiceEnabled,
  showInitialDemo,
  onDemoSeen,
  onToggleSound,
  onExit,
}: ClassificationGameProps) {
  const imageMap = useMemo(() => new Map(images.map((i) => [i.id, i])), [images]);
  const clsConfig = activity.classificationConfig!;
  const diffTable =
    activity.difficultyConfig?.classification || DEFAULT_DIFFICULTY_CONFIG.classification;

  // Build full pool of valid pieces mapped to their correct group
  const allPieces = useMemo<ClassificationPiece[]>(() => {
    const list: ClassificationPiece[] = [];
    for (const grp of clsConfig.groups) {
      for (const itemId of grp.itemIds) {
        const img = imageMap.get(itemId);
        if (img && !list.some((p) => p.id === itemId)) {
          list.push({ id: itemId, image: img, correctGroupId: grp.id });
        }
      }
    }
    return list;
  }, [clsConfig, imageMap]);

  const maxPieces = allPieces.length;
  const startCount = Math.min(maxPieces, Math.max(2, diffTable[initialDifficulty].piecesCount));

  const [piecesCount, setPiecesCount] = useState(startCount);
  const [roundNumber, setRoundNumber] = useState(1);
  const [roundPieces, setRoundPieces] = useState<ClassificationPiece[]>([]);
  // placement: pieceId -> groupId (or absent if still in tray)
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [checkedResults, setCheckedResults] = useState<Record<string, 'correct' | 'wrong'>>({});
  const [shakePieceId, setShakePieceId] = useState<string | null>(null);
  const [hintText, setHintText] = useState<string | null>(null);
  const [roundComplete, setRoundComplete] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const dragRef = useRef<DragState | null>(null);

  const buildRound = useCallback(
    (targetCount: number, isFirstRound: boolean) => {
      const count = Math.min(allPieces.length, Math.max(2, targetCount));
      let chosen: ClassificationPiece[] = [];

      if (
        isFirstRound &&
        clsConfig.initialItemIds &&
        clsConfig.initialItemIds.length >= count
      ) {
        const preferred = clsConfig.initialItemIds
          .slice(0, count)
          .map((id) => allPieces.find((p) => p.id === id))
          .filter((p): p is ClassificationPiece => Boolean(p));
        if (preferred.length === count) {
          chosen = preferred;
        }
      }

      if (chosen.length !== count) {
        // Ensure at least 1 piece per group when possible, then fill remaining
        const byGroup = clsConfig.groups
          .map((g) => shuffleArray(allPieces.filter((p) => p.correctGroupId === g.id)))
          .filter((arr) => arr.length > 0);
        const picked: ClassificationPiece[] = [];
        const pickedIds = new Set<string>();
        for (const arr of byGroup) {
          if (picked.length < count && arr[0]) {
            picked.push(arr[0]);
            pickedIds.add(arr[0].id);
          }
        }
        const rest = shuffleArray(allPieces.filter((p) => !pickedIds.has(p.id)));
        while (picked.length < count && rest.length > 0) {
          picked.push(rest.shift()!);
        }
        chosen = picked;
      }

      setRoundPieces(shuffleArray(chosen));
      setPlacements({});
      setSelectedPieceId(null);
      setCheckedResults({});
      setHintText(null);
      setRoundComplete(false);
    },
    [allPieces, clsConfig]
  );

  useEffect(() => {
    buildRound(startCount, true);
  }, [buildRound, startCount]);

  useEffect(() => {
    if (roundNumber === 1 && mode === 'individual') {
      speakSpanish(clsConfig.prompt, voiceEnabled);
    }
  }, [roundNumber, mode, clsConfig.prompt, voiceEnabled]);

  const placePieceInZone = useCallback(
    (pieceId: string, zoneId: string) => {
      if (roundComplete) return;
      const piece = roundPieces.find((p) => p.id === pieceId);
      if (!piece) return;

      setSelectedPieceId(null);

      if (mode === 'individual') {
        // Immediate feedback
        if (piece.correctGroupId === zoneId) {
          const nextPlacements = { ...placements, [pieceId]: zoneId };
          setPlacements(nextPlacements);
          setCheckedResults((prev) => ({ ...prev, [pieceId]: 'correct' }));
          setHintText(null);

          const placedCount = Object.keys(nextPlacements).length;
          if (placedCount >= roundPieces.length) {
            playSoundCue('success', soundEnabled);
            setRoundComplete(true);
            speakSpanish('¡Estupendo! Has colocado todas las piezas en su lugar.', voiceEnabled);
          } else {
            playSoundCue('match', soundEnabled);
          }
        } else {
          playSoundCue('retry', soundEnabled);
          setShakePieceId(pieceId);
          setHintText(`¡Casi! Prueba a colocar «${piece.image.name}» en otro grupo.`);
          window.setTimeout(() => {
            setShakePieceId((cur) => (cur === pieceId ? null : cur));
          }, 420);
        }
      } else {
        // Asamblea mode: allow free placement and changing mind before pressing «Comprobar»
        playSoundCue('place', soundEnabled);
        setPlacements((prev) => ({ ...prev, [pieceId]: zoneId }));
        // Clear previous check status for this piece when moved
        setCheckedResults((prev) => {
          if (!prev[pieceId]) return prev;
          const copy = { ...prev };
          delete copy[pieceId];
          return copy;
        });
        setHintText(null);
      }
    },
    [mode, placements, roundComplete, roundPieces, soundEnabled, voiceEnabled]
  );

  const returnPieceToTray = useCallback(
    (pieceId: string) => {
      if (mode !== 'asamblea' || roundComplete) return;
      setPlacements((prev) => {
        const copy = { ...prev };
        delete copy[pieceId];
        return copy;
      });
      setCheckedResults((prev) => {
        const copy = { ...prev };
        delete copy[pieceId];
        return copy;
      });
      setSelectedPieceId(null);
    },
    [mode, roundComplete]
  );

  // Pointer Events drag-and-drop (works seamlessly on Mouse, Touch Tablets, and PDI!)
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const cur = dragRef.current;
      if (!cur) return;
      const dist = Math.hypot(e.clientX - cur.startX, e.clientY - cur.startY);
      const active = cur.active || dist > 8;

      let hoveredZoneId: string | null = null;
      if (active) {
        const els = document.elementsFromPoint(e.clientX, e.clientY);
        const zoneEl = els.find((el) => el.getAttribute('data-zone-id'));
        hoveredZoneId = zoneEl?.getAttribute('data-zone-id') || null;
      }

      const next: DragState = {
        ...cur,
        x: e.clientX,
        y: e.clientY,
        active,
        hoveredZoneId,
      };
      dragRef.current = next;
      setDragState(next);
    };

    const onPointerUp = (e: PointerEvent) => {
      const cur = dragRef.current;
      if (!cur) return;
      dragRef.current = null;
      setDragState(null);

      if (cur.active) {
        const els = document.elementsFromPoint(e.clientX, e.clientY);
        const zoneEl = els.find((el) => el.getAttribute('data-zone-id'));
        const zoneId = zoneEl?.getAttribute('data-zone-id');
        const trayEl = els.find((el) => el.getAttribute('data-tray') === 'true');
        if (zoneId) {
          placePieceInZone(cur.pieceId, zoneId);
        } else if (trayEl && mode === 'asamblea') {
          returnPieceToTray(cur.pieceId);
        }
      } else {
        // Treated as a clean tap to select/deselect piece!
        setSelectedPieceId((prev) => (prev === cur.pieceId ? null : cur.pieceId));
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [mode, placePieceInZone, returnPieceToTray]);

  const handlePiecePointerDown = (
    e: React.PointerEvent,
    piece: ClassificationPiece,
    isLockedInZone: boolean
  ) => {
    if (roundComplete || isLockedInZone) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    const initial: DragState = {
      pieceId: piece.id,
      image: piece.image,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      active: false,
      hoveredZoneId: null,
    };
    dragRef.current = initial;
    setDragState(initial);
  };

  const handleAsambleaCheck = () => {
    const results: Record<string, 'correct' | 'wrong'> = {};
    let allCorrect = true;
    for (const p of roundPieces) {
      const placedIn = placements[p.id];
      if (!placedIn) {
        allCorrect = false;
      } else if (placedIn === p.correctGroupId) {
        results[p.id] = 'correct';
      } else {
        results[p.id] = 'wrong';
        allCorrect = false;
      }
    }
    setCheckedResults(results);

    if (allCorrect && Object.keys(placements).length === roundPieces.length) {
      playSoundCue('success', soundEnabled);
      setRoundComplete(true);
      setHintText(null);
    } else {
      playSoundCue('retry', soundEnabled);
      const wrongCount = Object.values(results).filter((r) => r === 'wrong').length;
      const missingCount = roundPieces.length - Object.keys(placements).length;
      if (wrongCount > 0) {
        setHintText(
          `Hay ${wrongCount === 1 ? '1 pieza' : `${wrongCount} piezas`} para revisar. Podéis cambiarla de lugar y volver a comprobar.`
        );
      } else if (missingCount > 0) {
        setHintText(`Aún faltan ${missingCount} piezas por colocar.`);
      }
    }
  };

  const canStepUp = progression === 'progressive' && piecesCount < maxPieces;

  const handleNextRound = (stepUp: boolean) => {
    const nextCount = stepUp ? Math.min(maxPieces, piecesCount + 1) : piecesCount;
    if (stepUp) {
      playSoundCue('levelUp', soundEnabled);
      setPiecesCount(nextCount);
    }
    setRoundNumber((r) => r + 1);
    buildRound(nextCount, false);
  };

  const trayPieces = roundPieces.filter((p) => !placements[p.id]);
  const currentDifficulty = difficultyForPiecesCount(piecesCount, diffTable);

  const bottomDock =
    mode === 'asamblea' ? (
      <>
        {!roundComplete && (
          <button
            type="button"
            className="btn btn-primary btn-xl"
            onClick={handleAsambleaCheck}
            disabled={Object.keys(placements).length === 0}
          >
            <CheckCircle2 size={22} /> Comprobar
          </button>
        )}
        {roundComplete && canStepUp && (
          <>
            <button
              type="button"
              className="btn btn-sage btn-xl"
              onClick={() => handleNextRound(true)}
            >
              <TrendingUp size={22} /> Subir dificultad ({piecesCount + 1} piezas)
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-lg"
              onClick={() => handleNextRound(false)}
            >
              Seguir en este nivel
            </button>
          </>
        )}
        {roundComplete && !canStepUp && (
          <button
            type="button"
            className="btn btn-primary btn-xl"
            onClick={() => handleNextRound(false)}
          >
            <ArrowRight size={22} /> Nueva ronda
          </button>
        )}
        <button
          type="button"
          className="btn btn-secondary btn-lg"
          onClick={() => buildRound(piecesCount, false)}
        >
          <RotateCcw size={20} /> Repetir ronda
        </button>
      </>
    ) : undefined;

  return (
    <GameShell
      title={activity.title}
      gameType="classification"
      mode={mode}
      difficulty={currentDifficulty}
      progression={progression}
      roundLabel={`Ronda ${roundNumber} · ${roundPieces.length} piezas`}
      spokenPrompt={clsConfig.prompt}
      soundEnabled={soundEnabled}
      voiceEnabled={voiceEnabled}
      showInitialDemo={showInitialDemo}
      onDemoSeen={onDemoSeen}
      onToggleSound={onToggleSound}
      onRepeatRound={() => buildRound(piecesCount, false)}
      onExit={onExit}
      bottomDock={bottomDock}
    >
      <div className="classification-layout">
        <div className="game-prompt-bar" style={{ marginBottom: 4 }}>
          <h2 className="game-prompt-text">{clsConfig.prompt}</h2>
          {selectedPieceId && !roundComplete && (
            <span className="chip chip-teal">Ahora toca un destino para colocarla</span>
          )}
        </div>

        {/* Destination groups */}
        <div className="classification-zones">
          {clsConfig.groups.map((grp) => {
            const grpImg = grp.imageId ? imageMap.get(grp.imageId) : undefined;
            const placedHere = roundPieces.filter((p) => placements[p.id] === grp.id);
            const isHovered = dragState?.active && dragState.hoveredZoneId === grp.id;
            const isTapReady = Boolean(selectedPieceId) && !roundComplete;

            return (
              <div
                key={grp.id}
                data-zone-id={grp.id}
                data-testid={`zone-${grp.id}`}
                role="button"
                tabIndex={0}
                aria-label={`Destino ${grp.name}`}
                className={`classification-zone ${isHovered ? 'drop-target' : ''} ${
                  isTapReady ? 'tap-ready' : ''
                }`}
                onClick={() => {
                  if (selectedPieceId) {
                    placePieceInZone(selectedPieceId, grp.id);
                  }
                }}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && selectedPieceId) {
                    e.preventDefault();
                    placePieceInZone(selectedPieceId, grp.id);
                  }
                }}
              >
                <div
                  className="zone-header"
                  style={{ borderBottom: `4px solid ${grp.accentColor || '#218a80'}` }}
                >
                  {grpImg && (
                    <img src={grpImg.src} alt={grp.name} className="zone-header-img" />
                  )}
                  <span className="zone-label-pill">{grp.name}</span>
                </div>

                <div className="zone-items">
                  {placedHere.length === 0 && (
                    <span
                      style={{
                        color: 'var(--ink-muted)',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        alignSelf: 'center',
                      }}
                    >
                      {selectedPieceId ? 'Toca aquí' : 'Suelta aquí'}
                    </span>
                  )}

                  {placedHere.map((piece) => {
                    const status = checkedResults[piece.id];
                    const isLocked = mode === 'individual' || roundComplete;
                    const isDraggingThis = dragState?.active && dragState.pieceId === piece.id;

                    return (
                      <div
                        key={piece.id}
                        data-testid={`placed-piece-${piece.id}`}
                        className={`piece-token in-zone ${
                          selectedPieceId === piece.id ? 'selected' : ''
                        } ${status === 'correct' ? 'status-correct' : ''} ${
                          status === 'wrong' ? 'status-wrong' : ''
                        }`}
                        style={{
                          opacity: isDraggingThis ? 0.3 : 1,
                          cursor: isLocked ? 'default' : 'grab',
                        }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          handlePiecePointerDown(e, piece, isLocked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        title={piece.image.name}
                      >
                        <img src={piece.image.src} alt={piece.image.name} />
                        {status === 'correct' && (
                          <span className="matched-badge" style={{ width: 22, height: 22, top: 4, right: 4 }}>
                            <Check size={13} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Feedback / Hint */}
        {hintText && !roundComplete && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="feedback-banner warn" role="status" style={{ padding: '6px 16px' }}>
              <img src={MASCOT.animo} alt="" style={{ width: 38, height: 38, objectFit: 'contain' }} />
              {hintText}
            </div>
          </div>
        )}

        {roundComplete && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div className="feedback-banner success" role="status" style={{ padding: '6px 16px' }}>
              <img src={MASCOT.celebra} alt="" style={{ width: 42, height: 42, objectFit: 'contain' }} />
              <Sparkles size={20} /> ¡Excelente clasificación! Todas las piezas están en su grupo.
            </div>
            {mode === 'individual' && (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={() => handleNextRound(canStepUp)}
                >
                  {canStepUp ? (
                    <>
                      <TrendingUp size={20} /> Siguiente ronda ({piecesCount + 1} piezas)
                    </>
                  ) : (
                    <>
                      <ArrowRight size={20} /> Nueva ronda
                    </>
                  )}
                </button>
                {canStepUp && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleNextRound(false)}
                  >
                    Repetir con {piecesCount} piezas
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tray with remaining unplaced pieces */}
        {!roundComplete && (
          <div
            className="classification-tray"
            data-tray="true"
            onClick={() => {
              if (selectedPieceId && placements[selectedPieceId] && mode === 'asamblea') {
                returnPieceToTray(selectedPieceId);
              }
            }}
          >
            {trayPieces.length === 0 ? (
              <span style={{ color: 'var(--ink-secondary)', fontWeight: 700 }}>
                Todas las piezas están colocadas.{' '}
                {mode === 'asamblea' ? 'Pulsa «Comprobar» abajo cuando el grupo esté listo.' : ''}
              </span>
            ) : (
              trayPieces.map((piece) => {
                const isDraggingThis = dragState?.active && dragState.pieceId === piece.id;
                const isSelected = selectedPieceId === piece.id;
                const isShaking = shakePieceId === piece.id;

                return (
                  <button
                    key={piece.id}
                    type="button"
                    data-testid={`tray-piece-${piece.id}`}
                    className={`piece-token ${isSelected ? 'selected' : ''} ${
                      isShaking ? 'shake-once status-wrong' : ''
                    }`}
                    style={{ opacity: isDraggingThis ? 0.3 : 1 }}
                    aria-label={`Pieza ${piece.image.name}`}
                    aria-pressed={isSelected}
                    onPointerDown={(e) => handlePiecePointerDown(e, piece, false)}
                  >
                    <img src={piece.image.src} alt={piece.image.name} />
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Floating drag ghost */}
      {dragState?.active && (
        <div
          className="drag-ghost"
          style={{ left: dragState.x, top: dragState.y }}
          aria-hidden="true"
        >
          <img src={dragState.image.src} alt="" />
        </div>
      )}
    </GameShell>
  );
}
