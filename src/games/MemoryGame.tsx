import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, RotateCcw, Sparkles, TrendingUp } from 'lucide-react';
import type {
  Activity,
  DifficultyLevel,
  DifficultyProgression,
  ImageItem,
  ImagePair,
  PlayMode,
} from '../types';
import { DEFAULT_DIFFICULTY_CONFIG, DIFFICULTY_ORDER, MASCOT } from '../data/catalog';
import { SMALL_DETAILS_MEMORY_DECK } from '../data/specialArt';
import { shuffleArray } from '../lib/activityValidation';
import { playSoundCue, speakSpanish } from '../lib/speech';
import { CardBackEmblem } from '../components/GameIcons';
import { GameShell } from './GameShell';

interface MemoryCardData {
  uid: string;
  pairKey: string;
  image: { id: string; name: string; src: string };
}

interface MemoryGameProps {
  activity: Activity;
  images: ImageItem[];
  pairs: ImagePair[];
  mode: PlayMode;
  initialDifficulty: DifficultyLevel;
  initialPairsCount?: number;
  progression: DifficultyProgression;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  showInitialDemo: boolean;
  onDemoSeen: () => void;
  onToggleSound: () => void;
  onExit: () => void;
}

function difficultyForMemory(
  count: number,
  smallDetailsMode: boolean,
  cfg: Record<DifficultyLevel, { pairsCount: number; useSmallDetails?: boolean }>
): DifficultyLevel {
  if (smallDetailsMode) return 'avanzado';
  for (let i = DIFFICULTY_ORDER.length - 1; i >= 0; i--) {
    const lvl = DIFFICULTY_ORDER[i];
    if (!cfg[lvl].useSmallDetails && count >= cfg[lvl].pairsCount) return lvl;
  }
  return 'inicial';
}

export function MemoryGame({
  activity,
  images,
  pairs,
  mode,
  initialDifficulty,
  initialPairsCount,
  progression,
  soundEnabled,
  voiceEnabled,
  showInitialDemo,
  onDemoSeen,
  onToggleSound,
  onExit,
}: MemoryGameProps) {
  const imageMap = useMemo(() => new Map(images.map((i) => [i.id, i])), [images]);
  const pairMap = useMemo(() => new Map(pairs.map((p) => [p.id, p])), [pairs]);

  const memConfig = activity.memoryConfig!;
  const diffTable = activity.difficultyConfig?.memory || DEFAULT_DIFFICULTY_CONFIG.memory;

  const basePairPool = useMemo(() => {
    if (memConfig.variant === 'related') {
      return memConfig.pairIds
        .map((pid) => pairMap.get(pid))
        .filter((p): p is ImagePair => Boolean(p && imageMap.has(p.itemAId) && imageMap.has(p.itemBId)))
        .map((p) => ({
          pairKey: p.id,
          imgA: imageMap.get(p.itemAId)!,
          imgB: imageMap.get(p.itemBId)!,
        }));
    }
    const validIds = memConfig.itemIds.filter((id) => imageMap.has(id));
    return validIds.map((id) => ({
      pairKey: id,
      imgA: imageMap.get(id)!,
      imgB: imageMap.get(id)!,
    }));
  }, [memConfig, imageMap, pairMap]);

  const smallDetailPool = useMemo(
    () =>
      SMALL_DETAILS_MEMORY_DECK.map((d) => ({
        pairKey: d.id,
        imgA: d,
        imgB: d,
      })),
    []
  );

  const startDiff = diffTable[initialDifficulty];
  const useSmallDetails = memConfig.variant === 'small-details';
  const activePool = useSmallDetails ? smallDetailPool : basePairPool;
  const maxAvailablePairs = Math.min(10, Math.max(2, activePool.length));
  const startPairs = Math.min(
    maxAvailablePairs,
    Math.max(2, initialPairsCount ?? startDiff.pairsCount)
  );

  const [pairsCount, setPairsCount] = useState(startPairs);
  const [boardNumber, setBoardNumber] = useState(1);
  const [boardsAtCurrentCount, setBoardsAtCurrentCount] = useState(0);
  const [cards, setCards] = useState<MemoryCardData[]>([]);
  const [flippedUids, setFlippedUids] = useState<string[]>([]);
  const [matchedKeys, setMatchedKeys] = useState<Set<string>>(new Set());
  const [mismatchUids, setMismatchUids] = useState<string[]>([]);
  const [boardComplete, setBoardComplete] = useState(false);

  const lockRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const clearPendingTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const buildBoard = useCallback(
    (targetPairsCount: number, detailMode: boolean, isFirstBoard: boolean) => {
      clearPendingTimer();
      lockRef.current = false;

      const pool = detailMode ? smallDetailPool : basePairPool;
      const count = Math.min(pool.length, Math.max(2, targetPairsCount));
      let chosen = [];

      if (
        !detailMode &&
        isFirstBoard &&
        memConfig.variant === 'identical' &&
        memConfig.initialItemIds &&
        memConfig.initialItemIds.length >= count
      ) {
        const preferred = memConfig.initialItemIds
          .slice(0, count)
          .map((id) => pool.find((p) => p.pairKey === id))
          .filter((x): x is (typeof pool)[number] => Boolean(x));
        chosen = preferred.length === count ? preferred : shuffleArray(pool).slice(0, count);
      } else {
        chosen = shuffleArray(pool).slice(0, count);
      }

      const deck: MemoryCardData[] = [];
      chosen.forEach((p, idx) => {
        deck.push({ uid: `${p.pairKey}-a-${idx}`, pairKey: p.pairKey, image: p.imgA });
        deck.push({ uid: `${p.pairKey}-b-${idx}`, pairKey: p.pairKey, image: p.imgB });
      });

      setCards(shuffleArray(deck));
      setFlippedUids([]);
      setMatchedKeys(new Set());
      setMismatchUids([]);
      setBoardComplete(false);
    },
    [basePairPool, smallDetailPool, memConfig]
  );

  useEffect(() => {
    buildBoard(startPairs, useSmallDetails, true);
    return () => clearPendingTimer();
  }, [buildBoard, startPairs, useSmallDetails]);

  const promptText = useSmallDetails
    ? 'Fíjate en los pequeños detalles para encontrar cada pareja exacta'
    : memConfig.variant === 'related'
    ? 'Encuentra las cartas que van juntas'
    : 'Levanta dos cartas para encontrar las parejas iguales';

  useEffect(() => {
    if (boardNumber === 1 && mode === 'individual') {
      speakSpanish(promptText, voiceEnabled);
    }
  }, [boardNumber, mode, promptText, voiceEnabled]);

  const handleCardClick = (card: MemoryCardData) => {
    if (lockRef.current || boardComplete) return;
    if (matchedKeys.has(card.pairKey)) return;
    if (flippedUids.includes(card.uid)) return;
    if (flippedUids.length >= 2) return;

    playSoundCue('flip', soundEnabled);
    const nextFlipped = [...flippedUids, card.uid];
    setFlippedUids(nextFlipped);

    if (nextFlipped.length === 2) {
      lockRef.current = true;
      const firstCard = cards.find((c) => c.uid === nextFlipped[0]);
      const secondCard = card;

      if (firstCard && firstCard.pairKey === secondCard.pairKey && firstCard.uid !== secondCard.uid) {
        const nextMatched = new Set(matchedKeys);
        nextMatched.add(card.pairKey);
        setMatchedKeys(nextMatched);
        setFlippedUids([]);
        setMismatchUids([]);

        const totalPairsOnBoard = cards.length / 2;
        if (nextMatched.size >= totalPairsOnBoard) {
          playSoundCue('success', soundEnabled);
          setBoardComplete(true);
          setBoardsAtCurrentCount((prev) => prev + 1);
          if (mode === 'individual') {
            speakSpanish('¡Muy bien! Has encontrado todas las parejas.', voiceEnabled);
          }
          lockRef.current = false;
        } else {
          playSoundCue('match', soundEnabled);
          lockRef.current = false;
        }
      } else {
        setMismatchUids(nextFlipped);
        // Always auto-flip mismatched cards back face-down in both Individual and Asamblea/PDI!
        const delayMs = mode === 'asamblea' ? 1500 : 1250;
        timerRef.current = window.setTimeout(() => {
          setFlippedUids([]);
          setMismatchUids([]);
          lockRef.current = false;
        }, delayMs);
      }
    }
  };

  const canAddMorePairs = pairsCount < maxAvailablePairs;
  const canStepUp = progression === 'progressive' && canAddMorePairs;
  const readyToProposeStepUp = canStepUp && boardsAtCurrentCount >= 2;

  const handleNextBoard = (stepUp: boolean) => {
    let nextCount = pairsCount;
    if (stepUp && canAddMorePairs) {
      playSoundCue('levelUp', soundEnabled);
      nextCount = Math.min(maxAvailablePairs, pairsCount + 1);
      setPairsCount(nextCount);
      setBoardsAtCurrentCount(0);
    }
    setBoardNumber((b) => b + 1);
    buildBoard(nextCount, useSmallDetails, false);
  };

  const handleRepeatBoard = () => {
    buildBoard(pairsCount, useSmallDetails, false);
  };

  const handleSelectPairsCount = (nextCount: number) => {
    const clamped = Math.min(maxAvailablePairs, Math.max(2, nextCount));
    if (clamped === pairsCount) return;
    setPairsCount(clamped);
    setBoardsAtCurrentCount(0);
    buildBoard(clamped, useSmallDetails, false);
  };

  const pairCountChoices = useMemo(
    () => Array.from({ length: maxAvailablePairs - 1 }, (_, i) => i + 2),
    [maxAvailablePairs]
  );

  // Symmetric rectangular grids for every pair count 2..10 (4..20 cards), zero orphan cards!
  const cardCount = cards.length;
  const cols =
    cardCount <= 4
      ? 2
      : cardCount <= 6
      ? 3
      : cardCount <= 8
      ? 4
      : cardCount <= 10
      ? 5
      : cardCount <= 12
      ? 4
      : cardCount <= 14
      ? 7
      : cardCount <= 16
      ? 4
      : cardCount <= 18
      ? 6
      : 5;
  const rows = Math.ceil(cardCount / cols);
  const memCardSize =
    mode === 'asamblea'
      ? cols === 7
        ? '19vh'
        : rows <= 2
        ? '23vh'
        : rows === 3
        ? '16.5vh'
        : '13.2vh'
      : cols === 7
      ? '20.5vh'
      : rows <= 2
      ? '26vh'
      : rows === 3
      ? '18.5vh'
      : '14.8vh';
  const gridMaxWidth =
    cols === 2
      ? 440
      : cols === 3
      ? 660
      : cols === 4
      ? 820
      : cols === 5
      ? 980
      : cols === 6
      ? 1060
      : 1160;
  const currentDifficulty = difficultyForMemory(pairsCount, useSmallDetails, diffTable);

  const stepUpButtonLabel = `Subir dificultad (${pairsCount + 1} parejas)`;

  const bottomDock =
    mode === 'asamblea' ? (
      <>
        {!boardComplete && (
          <span className="chip chip-teal" style={{ fontSize: '1.05rem', padding: '10px 18px' }}>
            Parejas encontradas: {matchedKeys.size} de {cardCount / 2}
          </span>
        )}
        {boardComplete && readyToProposeStepUp && (
          <>
            <button type="button" className="btn btn-sage btn-xl" onClick={() => handleNextBoard(true)}>
              <TrendingUp size={22} /> {stepUpButtonLabel}
            </button>
            <button type="button" className="btn btn-secondary btn-lg" onClick={() => handleNextBoard(false)}>
              Seguir en este nivel
            </button>
          </>
        )}
        {boardComplete && !readyToProposeStepUp && (
          <button type="button" className="btn btn-primary btn-xl" onClick={() => handleNextBoard(false)}>
            <ArrowRight size={22} /> Siguiente tablero
          </button>
        )}
        <button type="button" className="btn btn-secondary btn-lg" onClick={handleRepeatBoard}>
          <RotateCcw size={20} /> Barajar de nuevo
        </button>
      </>
    ) : undefined;

  return (
    <GameShell
      title={activity.title}
      gameType="memory"
      mode={mode}
      difficulty={currentDifficulty}
      progression={progression}
      roundLabel={`Tablero ${boardNumber} · ${pairsCount} parejas${useSmallDetails ? ' · Detalles' : ''}`}
      spokenPrompt={promptText}
      soundEnabled={soundEnabled}
      voiceEnabled={voiceEnabled}
      showInitialDemo={showInitialDemo}
      onDemoSeen={onDemoSeen}
      onToggleSound={onToggleSound}
      onRepeatRound={handleRepeatBoard}
      onExit={onExit}
      bottomDock={bottomDock}
    >
      <div className="game-prompt-bar" style={{ gap: 12 }}>
        <h2 className="game-prompt-text">{promptText}</h2>
        <div
          className="segmented"
          style={{ padding: 3, borderRadius: 12, gap: 2, flexShrink: 0 }}
          role="group"
          aria-label="Elegir número de parejas"
          data-testid="memory-pairs-selector"
        >
          <span
            style={{
              fontSize: '0.76rem',
              fontWeight: 700,
              color: 'var(--ink-secondary)',
              padding: '0 6px',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Parejas:
          </span>
          {pairCountChoices.map((n) => (
            <button
              key={n}
              type="button"
              className={pairsCount === n ? 'active' : ''}
              style={{ padding: '4px 8px', fontSize: '0.82rem', minWidth: 28 }}
              onClick={() => handleSelectPairsCount(n)}
              data-testid={`memory-pairs-${n}`}
              aria-label={`${n} parejas`}
            >
              {n}
            </button>
          ))}
        </div>
        <span className="chip chip-sage">
          {matchedKeys.size} / {cardCount / 2} parejas
        </span>
      </div>

      <div
        className="memory-grid"
        style={
          {
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            maxWidth: gridMaxWidth,
            '--mem-card-size': memCardSize,
          } as React.CSSProperties
        }
      >
        {cards.map((card, index) => {
          const isMatched = matchedKeys.has(card.pairKey);
          const isFlipped = flippedUids.includes(card.uid);
          const isMismatch = mismatchUids.includes(card.uid);
          const isFaceUp = isMatched || isFlipped;

          return (
            <button
              key={card.uid}
              type="button"
              className={`memory-card-btn ${isFaceUp ? 'flipped' : ''} ${isMatched ? 'matched' : ''} ${
                isMismatch ? 'mismatch' : ''
              }`}
              onClick={() => handleCardClick(card)}
              aria-label={
                isFaceUp
                  ? `Carta ${index + 1}: ${card.image.name}${isMatched ? ' (emparejada)' : ''}`
                  : `Carta ${index + 1} boca abajo`
              }
              aria-pressed={isFaceUp}
              data-testid={`memory-card-${index}`}
              data-pair-key={card.pairKey}
              data-face-up={isFaceUp ? 'true' : 'false'}
              data-matched={isMatched ? 'true' : 'false'}
            >
              <div className="memory-card-inner">
                <div className="memory-face memory-back">
                  <div className="memory-back-pattern">
                    <CardBackEmblem size={mode === 'asamblea' ? 54 : 44} />
                  </div>
                </div>
                <div className="memory-face memory-front">
                  <img src={card.image.src} alt={card.image.name} />
                  {isMatched && (
                    <span className="matched-badge" aria-hidden="true">
                      <Check size={16} strokeWidth={3} />
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {boardComplete && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div className="feedback-banner success" role="status" style={{ padding: '6px 16px' }}>
            <img src={MASCOT.celebra} alt="" style={{ width: 42, height: 42, objectFit: 'contain' }} />
            <Sparkles size={20} />
            {readyToProposeStepUp
              ? `¡Tablero completado! Ya llevas 2 seguidos: ¿añadimos una pareja más (${pairsCount + 1})?`
              : '¡Genial! Has encontrado todas las parejas.'}
          </div>

          {mode === 'individual' && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              {readyToProposeStepUp ? (
                <>
                  <button type="button" className="btn btn-sage btn-lg" onClick={() => handleNextBoard(true)}>
                    <TrendingUp size={20} /> Siguiente tablero ({pairsCount + 1} parejas)
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => handleNextBoard(false)}>
                    Seguir con {pairsCount} parejas
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-primary btn-lg" onClick={() => handleNextBoard(false)}>
                  <ArrowRight size={20} /> Siguiente tablero
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </GameShell>
  );
}
