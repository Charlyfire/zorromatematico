import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
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

type SeqPhase = 'observe' | 'curtain' | 'reconstruct' | 'solved';

interface SequenceGameProps {
  activity: Activity;
  images: ImageItem[];
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

export function SequenceGame({
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
}: SequenceGameProps) {
  const imageMap = useMemo(() => new Map(images.map((i) => [i.id, i])), [images]);
  const seqConfig = activity.sequenceConfig!;
  const diffTable = activity.difficultyConfig?.sequence || DEFAULT_DIFFICULTY_CONFIG.sequence;

  const itemPool = useMemo(
    () => seqConfig.itemIds.map((id) => imageMap.get(id)).filter((i): i is ImageItem => Boolean(i)),
    [seqConfig.itemIds, imageMap]
  );

  const [levelIdx, setLevelIdx] = useState(
    Math.max(0, DIFFICULTY_ORDER.indexOf(initialDifficulty))
  );
  const [roundNumber, setRoundNumber] = useState(1);
  const [solvedAtLevel, setSolvedAtLevel] = useState(0);

  const [targetSequence, setTargetSequence] = useState<ImageItem[]>([]);
  const [trayItems, setTrayItems] = useState<ImageItem[]>([]);
  const [placedSlots, setPlacedSlots] = useState<(ImageItem | null)[]>([]);
  const [activeSlotIdx, setActiveSlotIdx] = useState<number>(0);
  const [slotStatus, setSlotStatus] = useState<Record<number, 'correct' | 'wrong'>>({});
  const [phase, setPhase] = useState<SeqPhase>('observe');
  const [hintText, setHintText] = useState<string | null>(null);

  const curtainTimerRef = useRef<number | null>(null);
  const currentLevel = DIFFICULTY_ORDER[Math.min(levelIdx, DIFFICULTY_ORDER.length - 1)];

  const clearCurtain = () => {
    if (curtainTimerRef.current !== null) {
      window.clearTimeout(curtainTimerRef.current);
      curtainTimerRef.current = null;
    }
  };

  const buildRound = useCallback(
    (lvl: DifficultyLevel) => {
      clearCurtain();
      if (itemPool.length < 2) return;
      const spec = diffTable[lvl];
      const seqLen = Math.min(itemPool.length, Math.max(2, spec.sequenceLength));

      // When preferSimilar is true (Intermedio/Avanzado), group items with shared similarityGroup together!
      let orderedSource: ImageItem[];
      if (spec.preferSimilar) {
        const byGroup = new Map<string, ImageItem[]>();
        itemPool.forEach((img) => {
          const g = img.similarityGroup || 'other';
          byGroup.set(g, [...(byGroup.get(g) || []), img]);
        });
        const sortedGroups = Array.from(byGroup.values()).sort((a, b) => b.length - a.length);
        orderedSource = sortedGroups.flatMap((grp) => shuffleArray(grp));
      } else {
        // For Inicial: pick clearly different items (distinct similarityGroups when possible!)
        const seenGroups = new Set<string>();
        const distinct: ImageItem[] = [];
        const rest: ImageItem[] = [];
        for (const item of shuffleArray(itemPool)) {
          const g = item.similarityGroup || item.id;
          if (!seenGroups.has(g)) {
            seenGroups.add(g);
            distinct.push(item);
          } else {
            rest.push(item);
          }
        }
        orderedSource = [...distinct, ...rest];
      }

      const seq = orderedSource.slice(0, seqLen);
      const remaining = shuffleArray(itemPool.filter((i) => !seq.some((s) => s.id === i.id)));
      const distractors = remaining.slice(0, Math.min(remaining.length, spec.extraDistractors));

      setTargetSequence(seq);
      setTrayItems(shuffleArray([...seq, ...distractors]));
      setPlacedSlots(Array.from({ length: seqLen }, () => null));
      setActiveSlotIdx(0);
      setSlotStatus({});
      setHintText(null);
      setPhase('observe');
    },
    [itemPool, diffTable]
  );

  useEffect(() => {
    buildRound(currentLevel);
    return () => clearCurtain();
  }, [buildRound, currentLevel]);

  const promptText = useMemo(() => {
    if (phase === 'observe') return 'Mira bien el orden de los dibujos de izquierda a derecha';
    if (phase === 'curtain') return '¡A recordar la serie!';
    if (phase === 'solved') return '¡Has recordado el orden exacto!';
    return 'Coloca los dibujos en el mismo orden (1, 2, 3…)';
  }, [phase]);

  useEffect(() => {
    if (roundNumber === 1 && mode === 'individual' && phase === 'observe') {
      speakSpanish(promptText, voiceEnabled);
    }
  }, [roundNumber, mode, phase, promptText, voiceEnabled]);

  const handleSeenClick = () => {
    if (phase !== 'observe') return;
    playSoundCue('reveal', soundEnabled);
    setPhase('curtain');
    curtainTimerRef.current = window.setTimeout(() => {
      setPhase('reconstruct');
      if (mode === 'individual') {
        speakSpanish('Ahora colócalos en el mismo orden.', voiceEnabled);
      }
    }, 950);
  };

  const evaluateOrder = useCallback(
    (slots: (ImageItem | null)[]) => {
      const nextStatus: Record<number, 'correct' | 'wrong'> = {};
      let allRight = true;
      for (let i = 0; i < targetSequence.length; i++) {
        if (!slots[i]) {
          allRight = false;
        } else if (slots[i]!.id === targetSequence[i].id) {
          nextStatus[i] = 'correct';
        } else {
          nextStatus[i] = 'wrong';
          allRight = false;
        }
      }
      setSlotStatus(nextStatus);
      if (allRight) {
        playSoundCue('success', soundEnabled);
        setPhase('solved');
        setSolvedAtLevel((c) => c + 1);
        setHintText(null);
        if (mode === 'individual') {
          speakSpanish('¡Genial! Has recordado todo el orden.', voiceEnabled);
        }
      } else {
        playSoundCue('retry', soundEnabled);
        setHintText('Algún dibujo no está en su posición. Toca los marcados para cambiarlos.');
      }
    },
    [targetSequence, soundEnabled, mode, voiceEnabled]
  );

  const handleTrayItemTap = (img: ImageItem) => {
    if (phase !== 'reconstruct') return;
    if (placedSlots.some((s) => s?.id === img.id)) return;

    // Place into activeSlotIdx if empty, otherwise first empty slot
    let targetIdx = activeSlotIdx;
    if (targetIdx < 0 || targetIdx >= placedSlots.length || placedSlots[targetIdx] !== null) {
      targetIdx = placedSlots.findIndex((s) => s === null);
    }
    if (targetIdx === -1) return;

    playSoundCue('place', soundEnabled);
    const nextSlots = [...placedSlots];
    nextSlots[targetIdx] = img;
    setPlacedSlots(nextSlots);

    // Clear previous error mark on this slot
    setSlotStatus((prev) => {
      const copy = { ...prev };
      delete copy[targetIdx];
      return copy;
    });
    setHintText(null);

    const nextEmpty = nextSlots.findIndex((s) => s === null);
    setActiveSlotIdx(nextEmpty >= 0 ? nextEmpty : targetIdx);

    // In Individual mode, auto-check once all slots are filled!
    if (mode === 'individual' && nextEmpty === -1) {
      evaluateOrder(nextSlots);
    }
  };

  const handleSlotTap = (idx: number) => {
    if (phase !== 'reconstruct') return;
    if (placedSlots[idx]) {
      // Remove placed item back to tray and focus this slot
      playSoundCue('flip', soundEnabled);
      const nextSlots = [...placedSlots];
      nextSlots[idx] = null;
      setPlacedSlots(nextSlots);
      setActiveSlotIdx(idx);
      setSlotStatus((prev) => {
        const copy = { ...prev };
        delete copy[idx];
        return copy;
      });
    } else {
      setActiveSlotIdx(idx);
    }
  };

  const canStepUp = progression === 'progressive' && levelIdx < DIFFICULTY_ORDER.length - 1;
  const readyToStepUp = canStepUp && solvedAtLevel >= 2;

  const handleNextRound = (stepUp: boolean) => {
    const nextIdx = stepUp ? Math.min(DIFFICULTY_ORDER.length - 1, levelIdx + 1) : levelIdx;
    if (stepUp) {
      playSoundCue('levelUp', soundEnabled);
      setLevelIdx(nextIdx);
      setSolvedAtLevel(0);
    }
    setRoundNumber((r) => r + 1);
    buildRound(DIFFICULTY_ORDER[nextIdx]);
  };

  const allSlotsFilled = placedSlots.length > 0 && placedSlots.every(Boolean);

  const bottomDock =
    mode === 'asamblea' ? (
      <>
        {phase === 'observe' && (
          <button type="button" className="btn btn-coral btn-xl" onClick={handleSeenClick} data-testid="seq-seen-btn">
            <Eye size={22} /> Ya lo he visto
          </button>
        )}
        {phase === 'reconstruct' && (
          <button
            type="button"
            className="btn btn-primary btn-xl"
            disabled={!allSlotsFilled}
            onClick={() => evaluateOrder(placedSlots)}
          >
            <CheckCircle2 size={22} /> Comprobar
          </button>
        )}
        {phase === 'solved' && readyToStepUp && (
          <>
            <button type="button" className="btn btn-sage btn-xl" onClick={() => handleNextRound(true)}>
              <TrendingUp size={22} /> Subir dificultad
            </button>
            <button type="button" className="btn btn-secondary btn-lg" onClick={() => handleNextRound(false)}>
              Seguir en este nivel
            </button>
          </>
        )}
        {phase === 'solved' && !readyToStepUp && (
          <button type="button" className="btn btn-primary btn-xl" onClick={() => handleNextRound(false)}>
            <ArrowRight size={22} /> Siguiente serie
          </button>
        )}
        <button type="button" className="btn btn-secondary btn-lg" onClick={() => buildRound(currentLevel)}>
          <RotateCcw size={20} /> Repetir ronda
        </button>
      </>
    ) : undefined;

  const extraCount = Math.max(0, trayItems.length - targetSequence.length);

  return (
    <GameShell
      title={activity.title}
      gameType="sequence"
      mode={mode}
      difficulty={currentLevel}
      progression={progression}
      roundLabel={`Ronda ${roundNumber} · Serie de ${targetSequence.length}${extraCount > 0 ? ` (+${extraCount} extra)` : ''}`}
      spokenPrompt={promptText}
      soundEnabled={soundEnabled}
      voiceEnabled={voiceEnabled}
      showInitialDemo={showInitialDemo}
      onDemoSeen={onDemoSeen}
      onToggleSound={onToggleSound}
      onRepeatRound={() => buildRound(currentLevel)}
      onExit={onExit}
      bottomDock={bottomDock}
    >
      <div className="wc-layout">
        <div className="wc-prompt-wrap">
          <h2 className="game-prompt-text" data-testid="seq-prompt">
            {promptText}
          </h2>
        </div>

        {/* Ordered sequence board */}
        <div className="wc-board-frame" style={{ maxWidth: 960 }}>
          <div
            className="seq-slots-row"
            style={{
              gridTemplateColumns: `repeat(${Math.max(2, targetSequence.length)}, minmax(0, 1fr))`,
            }}
          >
            {targetSequence.map((targetImg, idx) => {
              const displayed =
                phase === 'observe' || phase === 'solved' ? targetImg : placedSlots[idx];
              const isFocused = phase === 'reconstruct' && activeSlotIdx === idx && !displayed;
              const status = slotStatus[idx];

              return (
                <button
                  key={idx}
                  type="button"
                  data-testid={`seq-slot-${idx}`}
                  data-expected-id={targetImg.id}
                  className={`wc-slot ${!displayed ? 'empty-slot' : ''} ${
                    phase === 'reconstruct' ? 'clickable' : ''
                  } ${isFocused ? 'selected' : ''} ${
                    status === 'correct' || phase === 'solved' ? 'correct' : ''
                  } ${status === 'wrong' ? 'wrong' : ''}`}
                  onClick={() => handleSlotTap(idx)}
                  aria-label={`Posición ${idx + 1}${displayed ? `: ${displayed.name}` : ' vacía'}`}
                >
                  <span className="seq-number-badge">{idx + 1}</span>
                  {displayed ? (
                    <img src={displayed.src} alt={displayed.name} />
                  ) : (
                    <span style={{ color: '#b8a586', fontWeight: 700, fontSize: '1.35rem' }}>
                      {idx + 1}
                    </span>
                  )}
                  {(status === 'correct' || phase === 'solved') && (
                    <span className="matched-badge">
                      <Check size={16} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {phase === 'curtain' && (
            <div className="wc-curtain" role="status">
              <img src={MASCOT.lupa} alt="" style={{ width: 92, height: 92, objectFit: 'contain' }} />
              <span>¡Guarda el orden en tu memoria!</span>
            </div>
          )}
        </div>

        {/* Lower zone: See button OR candidate tray OR solved banner */}
        <div className="wc-lower-zone">
          {phase === 'observe' && mode === 'individual' && (
            <button
              type="button"
              className="btn btn-coral btn-xl"
              onClick={handleSeenClick}
              data-testid="seq-seen-btn"
            >
              <Eye size={22} /> Ya lo he visto
            </button>
          )}

          {hintText && phase === 'reconstruct' && (
            <div className="feedback-banner warn" role="status" style={{ padding: '5px 14px' }}>
              <img src={MASCOT.animo} alt="" style={{ width: 34, height: 34, objectFit: 'contain' }} />
              {hintText}
            </div>
          )}

          {phase === 'reconstruct' && (
            <div className="classification-tray" style={{ width: '100%', maxWidth: 960 }}>
              {trayItems.map((img) => {
                const used = placedSlots.some((s) => s?.id === img.id);
                return (
                  <button
                    key={img.id}
                    type="button"
                    disabled={used}
                    data-testid={`seq-tray-${img.id}`}
                    className="piece-token"
                    style={{
                      opacity: used ? 0.28 : 1,
                      cursor: used ? 'default' : 'pointer',
                    }}
                    onClick={() => handleTrayItemTap(img)}
                    aria-label={`Colocar ${img.name}`}
                  >
                    <img src={img.src} alt={img.name} />
                  </button>
                );
              })}
            </div>
          )}

          {phase === 'solved' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div className="feedback-banner success" role="status" style={{ padding: '6px 16px' }}>
                <img src={MASCOT.celebra} alt="" style={{ width: 42, height: 42, objectFit: 'contain' }} />
                <Sparkles size={20} /> ¡Perfecto! Has colocado la serie en el orden exacto.
              </div>
              {mode === 'individual' && (
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={() => handleNextRound(readyToStepUp)}
                >
                  {readyToStepUp ? (
                    <>
                      <TrendingUp size={20} /> Siguiente serie (subir dificultad)
                    </>
                  ) : (
                    <>
                      <ArrowRight size={20} /> Siguiente serie
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </GameShell>
  );
}
